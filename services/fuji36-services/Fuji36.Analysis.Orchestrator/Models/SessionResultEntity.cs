using Fuji36.Common.Contracts.Scoring;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Fuji36.Analysis.Orchestrator.Models;

public sealed class SessionResultEntity
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = default!;

    [BsonElement("sessionId")]
    public string SessionId { get; set; } = default!;

    [BsonElement("userId")]
    public string UserId { get; set; } = default!;

    [BsonElement("exerciseType")]
    public string ExerciseType { get; set; } = default!;

    [BsonElement("result")]
    public ScoreResponseDto Result { get; set; } = default!;

    [BsonElement("createdAt")]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
