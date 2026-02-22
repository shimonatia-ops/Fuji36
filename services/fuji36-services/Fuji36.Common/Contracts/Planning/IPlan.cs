namespace Fuji36.Common.Contracts.Planning;

public interface IPlan
{
    string PlanId { get; }
    string PatientId { get; }
    string? TherapistId { get; }
    string? PlanName { get; }
    PlanStatus Status { get; set; }
    PlanFrequency Frequency { get; }
    IReadOnlyList<string> Goals { get; }
    PlanProgress Progress { get; set; }
    int ProgressPercentage { get; set; }
    DateTimeOffset? StartDate { get; }
    DateTimeOffset? DueDate { get; }
    DateTimeOffset? CompletedDate { get; set; }
    IReadOnlyList<ITask> Tasks { get; }
    DateTimeOffset CreatedAt { get; }
    DateTimeOffset UpdatedAt { get; }
}
