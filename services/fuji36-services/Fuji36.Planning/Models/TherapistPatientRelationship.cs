using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Fuji36.Planning.Models;

/// <summary>
/// Represents the relationship between a Therapist and a Patient
/// This allows many-to-many relationships (one therapist can have many patients,
/// and one patient can have multiple therapists if needed)
/// </summary>
public sealed class TherapistPatientRelationship
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    /// <summary>
    /// Reference to TherapistEntity.Id (not UserId)
    /// </summary>
    [BsonElement("therapistId")]
    public string TherapistId { get; set; } = default!;

    /// <summary>
    /// Reference to PatientEntity.Id (not UserId)
    /// </summary>
    [BsonElement("patientId")]
    public string PatientId { get; set; } = default!;

    [BsonElement("status")]
    public RelationshipStatus Status { get; set; } = RelationshipStatus.Active;

    [BsonElement("assignedAt")]
    public DateTimeOffset AssignedAt { get; set; } = DateTimeOffset.UtcNow;

    [BsonElement("assignedBy")]
    public string? AssignedBy { get; set; } // UserId of admin who assigned

    [BsonElement("notes")]
    public string? Notes { get; set; }

    [BsonElement("createdAt")]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    [BsonElement("updatedAt")]
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public enum RelationshipStatus
{
    Active = 0,
    Inactive = 1,
    Suspended = 2
}
