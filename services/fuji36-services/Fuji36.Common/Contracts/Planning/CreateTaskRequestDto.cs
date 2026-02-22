namespace Fuji36.Common.Contracts.Planning;

public sealed record CreateTaskRequestDto(
    TaskType TaskType,
    string Name,
    string? Description = null,
    DateTimeOffset? DueDate = null,
    Dictionary<string, object>? Properties = null
);
