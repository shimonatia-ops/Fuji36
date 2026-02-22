namespace Fuji36.Common.Contracts.Planning;

public sealed record PlanDto(
    string PlanId,
    string PatientId,
    string? TherapistId,
    string? PlanName,
    PlanStatus Status,
    PlanFrequency Frequency,
    List<string> Goals,
    PlanProgress Progress,
    int ProgressPercentage,
    DateTimeOffset? StartDate,
    DateTimeOffset? DueDate,
    DateTimeOffset? CompletedDate,
    string? Description,
    List<TaskDto> Tasks,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);
