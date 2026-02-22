using Fuji36.Common.Contracts.Planning;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Fuji36.Planning.Models;

public sealed class PlanEntity
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [BsonElement("patientId")]
    public string PatientId { get; set; } = default!;

    [BsonElement("therapistId")]
    public string? TherapistId { get; set; }

    [BsonElement("planName")]
    public string? PlanName { get; set; }

    [BsonElement("status")]
    public PlanStatus Status { get; set; } = PlanStatus.Active;

    // Frequency/Recurrence
    [BsonElement("frequency")]
    public PlanFrequency Frequency { get; set; } = PlanFrequency.Daily;

    // Goals
    [BsonElement("goals")]
    public List<string> Goals { get; set; } = new();

    // Progress tracking
    [BsonElement("progress")]
    public PlanProgress Progress { get; set; } = PlanProgress.NotStarted;

    // Due date
    [BsonElement("dueDate")]
    public DateTimeOffset? DueDate { get; set; }

    // Start date (when plan should begin)
    [BsonElement("startDate")]
    public DateTimeOffset? StartDate { get; set; }

    // Completion date (when plan was actually completed)
    [BsonElement("completedDate")]
    public DateTimeOffset? CompletedDate { get; set; }

    // Progress percentage (0-100)
    [BsonElement("progressPercentage")]
    public int ProgressPercentage { get; set; } = 0;

    // Notes/description
    [BsonElement("description")]
    public string? Description { get; set; }

    [BsonElement("createdAt")]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    [BsonElement("updatedAt")]
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
