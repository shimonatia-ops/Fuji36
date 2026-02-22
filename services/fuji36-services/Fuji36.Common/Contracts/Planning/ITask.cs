namespace Fuji36.Common.Contracts.Planning;

public interface ITask
{
    string TaskId { get; }
    TaskType TaskType { get; }
    string Name { get; }
    string? Description { get; }
    TaskStatus Status { get; set; }
    DateTimeOffset? DueDate { get; set; }
    Dictionary<string, object> Properties { get; }
}
