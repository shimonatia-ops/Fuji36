using Fuji36.Common.Contracts.Sessions;
using Fuji36.Session.Contracts;
using Fuji36.Session.Data;
using Fuji36.Session.Models;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace Fuji36.Session.Controllers;

[ApiController]
[Route("sessions")]
public sealed class SessionsController : ControllerBase
{
    private readonly MongoContext _db;

    public SessionsController(MongoContext db) => _db = db;

    [HttpPost]
    public async Task<ActionResult<SessionDto>> Create(
    [FromHeader(Name = "X-User-Id")] string userId,
    [FromBody] CreateSessionRequestDto req)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized("Missing X-User-Id header");

        var entity = new SessionEntity
        {
            UserId = userId,
            ExerciseType = req.ExerciseType,
            Status = SessionStatus.Created,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };


        await _db.Sessions.InsertOneAsync(entity);
        return Ok(new SessionDto(
            SessionId: entity.Id,
            UserId: entity.UserId,
            ExerciseType: entity.ExerciseType,
            Status: entity.Status,
            CreatedAt: entity.CreatedAt
        ));
    }



    //[HttpPost]
    //public async Task<ActionResult<SessionDto>> Create([FromBody] CreateSessionRequest req)
    //{
    //    var entity = new SessionEntity
    //    {
    //        UserId = req.UserId,
    //        ExerciseType = req.ExerciseType,
    //        Status = SessionStatus.Created,
    //        CreatedAt = DateTimeOffset.UtcNow,
    //        UpdatedAt = DateTimeOffset.UtcNow
    //    };

    //    await _db.Sessions.InsertOneAsync(entity);

    //    return Ok(new SessionDto(
    //        SessionId: entity.Id,
    //        UserId: entity.UserId,
    //        ExerciseType: entity.ExerciseType,
    //        Status: entity.Status,
    //        CreatedAt: entity.CreatedAt
    //    ));
    //}

    [HttpGet("{sessionId}")]
    public async Task<ActionResult<SessionDto>> Get(
    string sessionId,
    [FromHeader(Name = "X-User-Id")] string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized("Missing X-User-Id header");

        var s = await _db.Sessions.Find(x => x.Id == sessionId).FirstOrDefaultAsync();
        if (s is null) return NotFound();

        if (s.UserId != userId) return Forbid();

        return Ok(new SessionDto(s.Id, s.UserId, s.ExerciseType, s.Status, s.CreatedAt));
    }


    //[HttpGet("{sessionId}")]
    //public async Task<ActionResult<SessionDto>> Get(string sessionId)
    //{
    //    var s = await _db.Sessions.Find(x => x.Id == sessionId).FirstOrDefaultAsync();
    //    if (s is null) return NotFound();

    //    return Ok(new SessionDto(s.Id, s.UserId, s.ExerciseType, s.Status, s.CreatedAt));
    //}

    [HttpPost("{sessionId}/landmarks/batch")]
    public async Task<IActionResult> AddBatch(
    string sessionId,
    [FromHeader(Name = "X-User-Id")] string userId,
    [FromBody] LandmarkBatchDto batch)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized("Missing X-User-Id header");

        var s = await _db.Sessions.Find(x => x.Id == sessionId).FirstOrDefaultAsync();
        if (s is null) return NotFound("Session not found");

        if (s.UserId != userId) return Forbid();

        // Optional sanity: ensure body sessionId matches route
        if (!string.Equals(batch.SessionId, sessionId, StringComparison.Ordinal))
            return BadRequest("Body SessionId must match route sessionId");

        // Update status to Ingesting (once)
        if (s.Status == SessionStatus.Created)
        {
            await _db.Sessions.UpdateOneAsync(
                x => x.Id == sessionId,
                Builders<SessionEntity>.Update
                    .Set(x => x.Status, SessionStatus.Ingesting)
                    .Set(x => x.UpdatedAt, DateTimeOffset.UtcNow));
        }

        var entity = new LandmarkBatchEntity
        {
            SessionId = sessionId,
            BatchId = batch.BatchId,
            SampleFps = batch.SampleFps,
            Frames = batch.Frames.ToList(),
            CreatedAt = DateTimeOffset.UtcNow
        };

        await _db.LandmarkBatches.InsertOneAsync(entity);

        return Ok();
    }


    //[HttpPost("{sessionId}/landmarks/batch")]
    //public async Task<IActionResult> AddBatch(string sessionId, [FromBody] LandmarkBatchDto batch)
    //{
    //    var s = await _db.Sessions.Find(x => x.Id == sessionId).FirstOrDefaultAsync();
    //    if (s is null) return NotFound("Session not found");

    //    // update session status to Ingesting
    //    if (s.Status == SessionStatus.Created)
    //    {
    //        var update = Builders<SessionEntity>.Update
    //            .Set(x => x.Status, SessionStatus.Ingesting)
    //            .Set(x => x.UpdatedAt, DateTimeOffset.UtcNow);

    //        await _db.Sessions.UpdateOneAsync(x => x.Id == sessionId, update);
    //    }

    //    var entity = new LandmarkBatchEntity
    //    {
    //        SessionId = sessionId,
    //        BatchId = batch.BatchId,
    //        SampleFps = batch.SampleFps,
    //        Frames = batch.Frames.ToList(),
    //        CreatedAt = DateTimeOffset.UtcNow
    //    };

    //    await _db.LandmarkBatches.InsertOneAsync(entity);
    //    return Ok();
    //}

    [HttpPost("{sessionId}/finalize")]
    public async Task<ActionResult<object>> Finalize(
    string sessionId,
    [FromHeader(Name = "X-User-Id")] string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized("Missing X-User-Id header");

        var s = await _db.Sessions.Find(x => x.Id == sessionId).FirstOrDefaultAsync();
        if (s is null) return NotFound("Session not found");

        if (s.UserId != userId) return Forbid();

        await _db.Sessions.UpdateOneAsync(
            x => x.Id == sessionId,
            Builders<SessionEntity>.Update
                .Set(x => x.Status, SessionStatus.Processing)
                .Set(x => x.UpdatedAt, DateTimeOffset.UtcNow));

        var job = new AnalysisJobEntity
        {
            SessionId = sessionId,
            Status = AnalysisJobStatus.Pending,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        await _db.AnalysisJobs.InsertOneAsync(job);

        return Ok(new { jobId = job.Id });
    }


    //[HttpPost("{sessionId}/finalize")]
    //public async Task<ActionResult<object>> Finalize(string sessionId)
    //{
    //    var s = await _db.Sessions.Find(x => x.Id == sessionId).FirstOrDefaultAsync();
    //    if (s is null) return NotFound("Session not found");

    //    // set session status to Processing
    //    await _db.Sessions.UpdateOneAsync(
    //        x => x.Id == sessionId,
    //        Builders<SessionEntity>.Update
    //            .Set(x => x.Status, SessionStatus.Processing)
    //            .Set(x => x.UpdatedAt, DateTimeOffset.UtcNow));

    //    var job = new AnalysisJobEntity
    //    {
    //        SessionId = sessionId,
    //        Status = AnalysisJobStatus.Pending,
    //        CreatedAt = DateTimeOffset.UtcNow,
    //        UpdatedAt = DateTimeOffset.UtcNow
    //    };

    //    await _db.AnalysisJobs.InsertOneAsync(job);
    //    return Ok(new { jobId = job.Id });
    //}
}
