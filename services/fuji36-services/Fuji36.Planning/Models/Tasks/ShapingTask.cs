using Fuji36.Common.Contracts.Planning;
using Fuji36.Planning.Models;
using MongoDB.Bson;
using PlanningTaskStatus = Fuji36.Common.Contracts.Planning.TaskStatus;

namespace Fuji36.Planning.Models.Tasks;

public sealed class ShapingTask : ITask
{
    public string TaskId { get; }
    public TaskType TaskType => TaskType.ShapingTask;
    public string Name { get; }
    public string? Description { get; }
    public PlanningTaskStatus Status { get; set; }
    public DateTimeOffset? DueDate { get; set; }
    public Dictionary<string, object> Properties { get; }

    // ShapingTask-specific convenience properties
    public int TaskNumber => GetProperty<int>("taskNumber");
    public string DisplayName => GetProperty<string>("displayName");
    public string? Instructions => GetProperty<string?>("instructions");
    public int? TargetRepetitions => GetProperty<int?>("targetRepetitions");
    public TimeSpan? EstimatedDuration => GetProperty<TimeSpan?>("estimatedDuration");
    public string? AnalysisType => GetProperty<string?>("analysisType");
    public Dictionary<string, object>? AnalysisParameters => GetProperty<Dictionary<string, object>?>("analysisParameters");

    private T GetProperty<T>(string key)
    {
        if (Properties.TryGetValue(key, out var value))
        {
            if (value is T typedValue)
                return typedValue;
            
            // Handle BsonValue conversions
            if (value is BsonValue bsonValue)
            {
                if (typeof(T) == typeof(string))
                    return (T)(object)bsonValue.ToString();
                if (typeof(T) == typeof(int))
                    return (T)(object)bsonValue.AsInt32;
                if (typeof(T) == typeof(int?))
                    return (T)(object)(int?)bsonValue.AsInt32;
                if (typeof(T) == typeof(TimeSpan?))
                {
                    if (bsonValue.IsInt64)
                        return (T)(object)TimeSpan.FromSeconds(bsonValue.AsInt64);
                }
                if (typeof(T) == typeof(Dictionary<string, object>))
                {
                    var dict = new Dictionary<string, object>();
                    foreach (var element in bsonValue.AsBsonDocument)
                    {
                        dict[element.Name] = element.Value.ToJson();
                    }
                    return (T)(object)dict;
                }
            }
        }
        return default(T)!;
    }

    public ShapingTask(TaskEntity entity)
    {
        TaskId = entity.Id;
        Name = entity.Name;
        Description = entity.Description;
        Status = entity.Status;
        DueDate = entity.DueDate;
        Properties = BsonDocumentToDictionary(entity.Properties);
    }

    public ShapingTask(string taskId, string name, string? description, Dictionary<string, object> properties)
    {
        TaskId = taskId;
        Name = name;
        Description = description;
        Status = PlanningTaskStatus.NotStarted;
        Properties = properties;
    }

    private static Dictionary<string, object> BsonDocumentToDictionary(BsonDocument doc)
    {
        var dict = new Dictionary<string, object>();
        foreach (var element in doc)
        {
            dict[element.Name] = element.Value.BsonType switch
            {
                BsonType.String => element.Value.AsString,
                BsonType.Int32 => element.Value.AsInt32,
                BsonType.Int64 => element.Value.AsInt64,
                BsonType.Double => element.Value.AsDouble,
                BsonType.Boolean => element.Value.AsBoolean,
                BsonType.Document => BsonDocumentToDictionary(element.Value.AsBsonDocument),
                BsonType.Array => element.Value.AsBsonArray.Select(v => v.ToString()).ToArray(),
                _ => element.Value.ToString()
            };
        }
        return dict;
    }
}
