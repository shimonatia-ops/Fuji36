using Fuji36.Session.Models;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace Fuji36.Session.Data;

public sealed class MongoContext
{
    public IMongoDatabase Db { get; }
    public IMongoCollection<SessionEntity> Sessions { get; }
    public IMongoCollection<LandmarkBatchEntity> LandmarkBatches { get; }
    public IMongoCollection<AnalysisJobEntity> AnalysisJobs { get; }

    public MongoContext(IOptions<MongoOptions> options)
    {
        var client = new MongoClient(options.Value.ConnectionString);
        Db = client.GetDatabase(options.Value.Database);

        Sessions = Db.GetCollection<SessionEntity>("fuji36_sessions");
        LandmarkBatches = Db.GetCollection<LandmarkBatchEntity>("fuji36_landmark_batches");
        AnalysisJobs = Db.GetCollection<AnalysisJobEntity>("fuji36_analysis_jobs");

        // Indexes
        Sessions.Indexes.CreateOne(new CreateIndexModel<SessionEntity>(
            Builders<SessionEntity>.IndexKeys.Ascending(x => x.UserId).Descending(x => x.CreatedAt)));

        LandmarkBatches.Indexes.CreateOne(new CreateIndexModel<LandmarkBatchEntity>(
            Builders<LandmarkBatchEntity>.IndexKeys.Ascending(x => x.SessionId).Ascending(x => x.CreatedAt)));

        AnalysisJobs.Indexes.CreateOne(new CreateIndexModel<AnalysisJobEntity>(
            Builders<AnalysisJobEntity>.IndexKeys.Ascending(x => x.Status).Ascending(x => x.CreatedAt)));
    }
}
