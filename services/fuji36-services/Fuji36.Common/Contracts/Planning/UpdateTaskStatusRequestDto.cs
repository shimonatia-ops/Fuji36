namespace Fuji36.Common.Contracts.Planning;

public sealed record UpdateTaskStatusRequestDto(
    TaskStatus Status,
    int? ProgressPercentage = null
);
