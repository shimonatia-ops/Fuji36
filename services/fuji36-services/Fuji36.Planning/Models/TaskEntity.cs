using Fuji36.Common.Contracts.Planning;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using PlanningTaskStatus = Fuji36.Common.Contracts.Planning.TaskStatus;

namespace Fuji36.Planning.Models;

public sealed class TaskEntity
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [BsonElement("planId")]
    public string PlanId { get; set; } = default!;

    [BsonElement("taskType")]
    public TaskType TaskType { get; set; }

    [BsonElement("name")]
    public string Name { get; set; } = default!;

    [BsonElement("description")]
    public string? Description { get; set; }

    [BsonElement("status")]
    public PlanningTaskStatus Status { get; set; } = PlanningTaskStatus.NotStarted;

    [BsonElement("progressPercentage")]
    public int ProgressPercentage { get; set; } = 0;

    [BsonElement("dueDate")]
    public DateTimeOffset? DueDate { get; set; }

    [BsonElement("properties")]
    public BsonDocument Properties { get; set; } = new();

    [BsonElement("createdAt")]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    [BsonElement("updatedAt")]
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
