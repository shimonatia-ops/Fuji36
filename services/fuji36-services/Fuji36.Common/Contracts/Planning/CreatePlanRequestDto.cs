namespace Fuji36.Common.Contracts.Planning;

public sealed record CreatePlanRequestDto(
    string PatientId,
    string? PlanName,
    PlanFrequency Frequency,
    List<string> Goals,
    DateTimeOffset? StartDate,
    DateTimeOffset? DueDate,
    string? Description,
    List<CreateTaskRequestDto> Tasks
);
