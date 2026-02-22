using Fuji36.Common.Contracts.Planning;

namespace Fuji36.Planning.Models;

public sealed class Plan : IPlan
{
    public string PlanId { get; }
    public string PatientId { get; }
    public string? TherapistId { get; }
    public string? PlanName { get; }
    public PlanStatus Status { get; set; }
    public PlanFrequency Frequency { get; }
    public IReadOnlyList<string> Goals { get; }
    public PlanProgress Progress { get; set; }
    public int ProgressPercentage { get; set; }
    public DateTimeOffset? StartDate { get; }
    public DateTimeOffset? DueDate { get; }
    public DateTimeOffset? CompletedDate { get; set; }
    public IReadOnlyList<ITask> Tasks { get; }
    public DateTimeOffset CreatedAt { get; }
    public DateTimeOffset UpdatedAt { get; }

    public Plan(PlanEntity entity, List<ITask> tasks)
    {
        PlanId = entity.Id;
        PatientId = entity.PatientId;
        TherapistId = entity.TherapistId;
        PlanName = entity.PlanName;
        Status = entity.Status;
        Frequency = entity.Frequency;
        Goals = entity.Goals.AsReadOnly();
        Progress = entity.Progress;
        ProgressPercentage = entity.ProgressPercentage;
        StartDate = entity.StartDate;
        DueDate = entity.DueDate;
        CompletedDate = entity.CompletedDate;
        Tasks = tasks;
        CreatedAt = entity.CreatedAt;
        UpdatedAt = entity.UpdatedAt;
    }
}
