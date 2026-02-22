using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Fuji36.Planning.Models;

/// <summary>
/// Patient entity - references UserId from Identity service
/// Contains patient-specific information beyond authentication
/// </summary>
public sealed class PatientEntity
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    /// <summary>
    /// Reference to UserEntity.Id (the _id field, not the optional userId property) from Identity service
    /// </summary>
    [BsonElement("userId")]
    public string UserId { get; set; } = default!;

    [BsonElement("dateOfBirth")]
    public DateTime? DateOfBirth { get; set; }

    [BsonElement("phoneNumber")]
    public string? PhoneNumber { get; set; }

    [BsonElement("address")]
    public string? Address { get; set; }

    [BsonElement("medicalNotes")]
    public string? MedicalNotes { get; set; }

    [BsonElement("createdAt")]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    [BsonElement("updatedAt")]
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
