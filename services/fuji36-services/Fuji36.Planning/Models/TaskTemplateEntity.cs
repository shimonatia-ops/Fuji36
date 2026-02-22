using Fuji36.Common.Contracts.Planning;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Fuji36.Planning.Models;

/// <summary>
/// Task template entity - stores reusable task templates that therapists can select when creating plans
/// </summary>
public sealed class TaskTemplateEntity
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [BsonElement("templateName")]
    public string TemplateName { get; set; } = default!;

    [BsonElement("taskType")]
    public TaskType TaskType { get; set; }

    [BsonElement("name")]
    public string Name { get; set; } = default!;

    [BsonElement("description")]
    public string? Description { get; set; }

    [BsonElement("properties")]
    public BsonDocument Properties { get; set; } = new();

    [BsonElement("isActive")]
    public bool IsActive { get; set; } = true;

    [BsonElement("createdAt")]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    [BsonElement("updatedAt")]
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
