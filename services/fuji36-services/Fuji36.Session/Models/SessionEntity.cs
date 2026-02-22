using Fuji36.Common.Contracts.Sessions;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Fuji36.Session.Models;

public sealed class SessionEntity
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = default!;

    [BsonElement("userId")]
    public string UserId { get; set; } = default!;

    [BsonElement("exerciseType")]
    public string ExerciseType { get; set; } = default!;

    [BsonElement("status")]
    public SessionStatus Status { get; set; } = SessionStatus.Created;

    [BsonElement("createdAt")]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    [BsonElement("updatedAt")]
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
