namespace Fuji36.Common.Contracts.Planning;

public sealed record TaskDto(
    string TaskId,
    TaskType TaskType,
    string Name,
    string? Description,
    TaskStatus Status,
    int ProgressPercentage,
    DateTimeOffset? DueDate,
    Dictionary<string, object>? Properties
);
