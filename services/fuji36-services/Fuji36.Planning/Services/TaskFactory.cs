using System.Text.Json;
using Fuji36.Common.Contracts.Planning;
using Fuji36.Planning.Models;
using Fuji36.Planning.Models.Tasks;
using MongoDB.Bson;
using PlanningTaskStatus = Fuji36.Common.Contracts.Planning.TaskStatus;

namespace Fuji36.Planning.Services;

public interface ITaskFactory
{
    ITask CreateTask(TaskEntity entity);
    TaskEntity CreateTaskEntity(TaskType taskType, string planId, string name, string? description, Dictionary<string, object>? properties);
}

public sealed class TaskFactory : ITaskFactory
{
    public ITask CreateTask(TaskEntity entity)
    {
        return entity.TaskType switch
        {
            TaskType.ShapingTask => new ShapingTask(entity),
            _ => throw new NotSupportedException($"Task type {entity.TaskType} is not supported")
        };
    }

    public TaskEntity CreateTaskEntity(TaskType taskType, string planId, string name, string? description, Dictionary<string, object>? properties)
    {
        var entity = new TaskEntity
        {
            PlanId = planId,
            TaskType = taskType,
            Name = name,
            Description = description,
            Status = PlanningTaskStatus.NotStarted,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        if (properties != null && properties.Count > 0)
        {
            entity.Properties = ConvertToBsonDocument(properties);
        }

        return entity;
    }

    private static BsonDocument ConvertToBsonDocument(Dictionary<string, object> properties)
    {
        var bsonDoc = new BsonDocument();
        
        foreach (var kvp in properties)
        {
            bsonDoc[kvp.Key] = ConvertToBsonValue(kvp.Value);
        }
        
        return bsonDoc;
    }

    private static BsonValue ConvertToBsonValue(object? value)
    {
        if (value == null)
            return BsonNull.Value;

        // Handle JsonElement (from System.Text.Json deserialization)
        if (value is JsonElement jsonElement)
        {
            return ConvertJsonElementToBsonValue(jsonElement);
        }

        // Handle standard .NET types
        return value switch
        {
            string str => new BsonString(str),
            int i => new BsonInt32(i),
            long l => new BsonInt64(l),
            double d => new BsonDouble(d),
            float f => new BsonDouble(f),
            bool b => new BsonBoolean(b),
            DateTime dt => new BsonDateTime(dt),
            DateTimeOffset dto => new BsonDateTime(dto.UtcDateTime),
            Dictionary<string, object> dict => ConvertToBsonDocument(dict),
            IEnumerable<object> list => new BsonArray(list.Select(ConvertToBsonValue)),
            _ => new BsonString(value.ToString() ?? "")
        };
    }

    private static BsonValue ConvertJsonElementToBsonValue(JsonElement element)
    {
        return element.ValueKind switch
        {
            JsonValueKind.String => new BsonString(element.GetString() ?? ""),
            JsonValueKind.Number => element.TryGetInt32(out var intVal)
                ? new BsonInt32(intVal)
                : element.TryGetInt64(out var longVal)
                    ? new BsonInt64(longVal)
                    : new BsonDouble(element.GetDouble()),
            JsonValueKind.True => new BsonBoolean(true),
            JsonValueKind.False => new BsonBoolean(false),
            JsonValueKind.Null => BsonNull.Value,
            JsonValueKind.Object => ConvertJsonObjectToBsonDocument(element),
            JsonValueKind.Array => new BsonArray(element.EnumerateArray().Select(ConvertJsonElementToBsonValue)),
            _ => new BsonString(element.ToString())
        };
    }

    private static BsonDocument ConvertJsonObjectToBsonDocument(JsonElement element)
    {
        var doc = new BsonDocument();
        foreach (var prop in element.EnumerateObject())
        {
            doc[prop.Name] = ConvertJsonElementToBsonValue(prop.Value);
        }
        return doc;
    }
}
