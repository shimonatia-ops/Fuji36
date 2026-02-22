using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Fuji36.Planning.Models;

/// <summary>
/// Therapist entity - references UserId from Identity service
/// Contains therapist-specific information beyond authentication
/// </summary>
public sealed class TherapistEntity
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    /// <summary>
    /// Reference to UserEntity.Id (the _id field, not the optional userId property) from Identity service
    /// </summary>
    [BsonElement("userId")]
    public string UserId { get; set; } = default!;

    [BsonElement("licenseNumber")]
    public string? LicenseNumber { get; set; }

    [BsonElement("specialization")]
    public string? Specialization { get; set; }

    [BsonElement("phoneNumber")]
    public string? PhoneNumber { get; set; }

    [BsonElement("createdAt")]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    [BsonElement("updatedAt")]
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
