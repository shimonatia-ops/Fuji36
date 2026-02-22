using Fuji36.Analysis.Orchestrator.Data;
using Fuji36.Analysis.Orchestrator.Models;
using Fuji36.Analysis.Orchestrator.Services;
using Fuji36.Common.Contracts.Scoring;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace Fuji36.Analysis.Orchestrator;

public sealed class Worker : BackgroundService
{
    private readonly MongoContext _db;
    private readonly PostureScoringClient _scoring;
    private readonly OrchestratorOptions _opts;
    private readonly ILogger<Worker> _log;

    public Worker(MongoContext db, PostureScoringClient scoring, IOptions<OrchestratorOptions> opts, ILogger<Worker> log)
    {
        _db = db;
        _scoring = scoring;
        _opts = opts.Value;
        _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _log.LogInformation("Fuji36.Orchestrator started. Poll={Poll}ms", _opts.PollIntervalMs);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var job = await TryAcquireNextJobAsync(stoppingToken);
                if (job is null)
                {
                    await Task.Delay(_opts.PollIntervalMs, stoppingToken);
                    continue;
                }

                await ProcessJobAsync(job, stoppingToken);
            }
            catch (OperationCanceledException) { }
            catch (Exception ex)
            {
                _log.LogError(ex, "Worker loop error");
                await Task.Delay(1000, stoppingToken);
            }
        }
    }

    private async Task<AnalysisJobEntity?> TryAcquireNextJobAsync(CancellationToken ct)
    {
        var filter = Builders<AnalysisJobEntity>.Filter.Eq(x => x.Status, AnalysisJobStatus.Pending);
        var update = Builders<AnalysisJobEntity>.Update
            .Set(x => x.Status, AnalysisJobStatus.Processing)
            .Set(x => x.UpdatedAt, DateTimeOffset.UtcNow);

        // Atomically take one job (oldest first)
        var opts = new FindOneAndUpdateOptions<AnalysisJobEntity>
        {
            Sort = Builders<AnalysisJobEntity>.Sort.Ascending(x => x.CreatedAt),
            ReturnDocument = ReturnDocument.After
        };

        return await _db.Jobs.FindOneAndUpdateAsync(filter, update, opts, ct);
    }

    private async Task ProcessJobAsync(AnalysisJobEntity job, CancellationToken ct)
    {
        _log.LogInformation("Processing job {JobId} for session {SessionId}", job.Id, job.SessionId);

        try
        {
            var session = await _db.Sessions.Find(x => x.Id == job.SessionId).FirstOrDefaultAsync(ct);
            if (session is null) throw new Exception("Session not found");

            var batches = await _db.Batches
                .Find(x => x.SessionId == job.SessionId)
                .SortBy(x => x.CreatedAt)
                .ToListAsync(ct);

            var frames = batches.SelectMany(b => b.Frames).ToList();
            if (frames.Count > _opts.MaxFramesPerJob)
                frames = frames.Take(_opts.MaxFramesPerJob).ToList();

            var sampleFps = batches.Count > 0 ? Math.Max(1, batches[0].SampleFps) : 10;

            var req = new ScoreRequestDto(
                SessionId: session.Id,
                ExerciseType: session.ExerciseType,
                SampleFps: sampleFps,
                Frames: frames
            );

            var score = await _scoring.ScoreAsync(req, ct);

            // store result (unique per session)
            var result = new SessionResultEntity
            {
                SessionId = session.Id,
                UserId = session.UserId,
                ExerciseType = session.ExerciseType,
                Result = score,
                CreatedAt = DateTimeOffset.UtcNow
            };

            await _db.Results.ReplaceOneAsync(
                x => x.SessionId == session.Id,
                result,
                new ReplaceOptions { IsUpsert = true },
                ct);

            // Update session status to Completed
            await _db.Sessions.UpdateOneAsync(
                x => x.Id == session.Id,
                Builders<SessionEntity>.Update
                    .Set(x => x.Status, Fuji36.Common.Contracts.Sessions.SessionStatus.Completed)
                    .Set(x => x.UpdatedAt, DateTimeOffset.UtcNow),
                cancellationToken: ct);

            // Update job to Completed
            await _db.Jobs.UpdateOneAsync(
                x => x.Id == job.Id,
                Builders<AnalysisJobEntity>.Update
                    .Set(x => x.Status, AnalysisJobStatus.Completed)
                    .Set(x => x.UpdatedAt, DateTimeOffset.UtcNow)
                    .Unset(x => x.Error),
                cancellationToken: ct);

            _log.LogInformation("Completed job {JobId}", job.Id);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Job failed {JobId}", job.Id);

            await _db.Jobs.UpdateOneAsync(
                x => x.Id == job.Id,
                Builders<AnalysisJobEntity>.Update
                    .Set(x => x.Status, AnalysisJobStatus.Failed)
                    .Set(x => x.Error, ex.Message)
                    .Set(x => x.UpdatedAt, DateTimeOffset.UtcNow),
                cancellationToken: ct);

            // also mark session failed (optional, but helpful)
            await _db.Sessions.UpdateOneAsync(
                x => x.Id == job.SessionId,
                Builders<SessionEntity>.Update
                    .Set(x => x.Status, Fuji36.Common.Contracts.Sessions.SessionStatus.Failed)
                    .Set(x => x.UpdatedAt, DateTimeOffset.UtcNow),
                cancellationToken: ct);
        }
    }
}
