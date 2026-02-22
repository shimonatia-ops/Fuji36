using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Fuji36.Analysis.Orchestrator.Models;

public enum AnalysisJobStatus
{
    Pending = 0,
    Processing = 1,
    Completed = 2,
    Failed = 3
}

public sealed class AnalysisJobEntity
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = default!;

    [BsonElement("sessionId")]
    public string SessionId { get; set; } = default!;

    [BsonElement("status")]
    public AnalysisJobStatus Status { get; set; } = AnalysisJobStatus.Pending;

    [BsonElement("createdAt")]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    [BsonElement("updatedAt")]
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    [BsonElement("error")]
    public string? Error { get; set; }
}
