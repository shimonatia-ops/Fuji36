using Fuji36.Analysis.Orchestrator.Models;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace Fuji36.Analysis.Orchestrator.Data;

public sealed class MongoContext
{
    public IMongoDatabase Db { get; }
    public IMongoCollection<AnalysisJobEntity> Jobs { get; }
    public IMongoCollection<SessionEntity> Sessions { get; }
    public IMongoCollection<LandmarkBatchEntity> Batches { get; }
    public IMongoCollection<SessionResultEntity> Results { get; }

    public MongoContext(IOptions<MongoOptions> options)
    {
        var client = new MongoClient(options.Value.ConnectionString);
        Db = client.GetDatabase(options.Value.Database);

        Jobs = Db.GetCollection<AnalysisJobEntity>("fuji36_analysis_jobs");
        Sessions = Db.GetCollection<SessionEntity>("fuji36_sessions");
        Batches = Db.GetCollection<LandmarkBatchEntity>("fuji36_landmark_batches");
        Results = Db.GetCollection<SessionResultEntity>("fuji36_session_results");

        Jobs.Indexes.CreateOne(new CreateIndexModel<AnalysisJobEntity>(
            Builders<AnalysisJobEntity>.IndexKeys.Ascending(x => x.Status).Ascending(x => x.CreatedAt)));

        Batches.Indexes.CreateOne(new CreateIndexModel<LandmarkBatchEntity>(
            Builders<LandmarkBatchEntity>.IndexKeys.Ascending(x => x.SessionId).Ascending(x => x.CreatedAt)));

        Results.Indexes.CreateOne(new CreateIndexModel<SessionResultEntity>(
            Builders<SessionResultEntity>.IndexKeys.Ascending(x => x.SessionId),
            new CreateIndexOptions { Unique = true }));
    }
}
