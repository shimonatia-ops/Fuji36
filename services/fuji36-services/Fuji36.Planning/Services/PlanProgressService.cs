using Fuji36.Common.Contracts.Planning;
using Fuji36.Planning.Data;
using Fuji36.Planning.Models;
using MongoDB.Driver;

namespace Fuji36.Planning.Services;

public interface IPlanProgressService
{
    Task<PlanProgress> CalculateProgressAsync(string planId);
    Task<int> CalculateProgressPercentageAsync(string planId);
    Task UpdatePlanProgressAsync(string planId);
}

public sealed class PlanProgressService : IPlanProgressService
{
    private readonly MongoContext _db;

    public PlanProgressService(MongoContext db)
    {
        _db = db;
    }

    public async Task<PlanProgress> CalculateProgressAsync(string planId)
    {
        var tasks = await _db.Tasks
            .Find(t => t.PlanId == planId)
            .ToListAsync();

        if (tasks.Count == 0)
            return PlanProgress.NotStarted;

        var completionPercentage = await CalculateProgressPercentageAsync(planId);
        var inProgressTasks = tasks.Count(t => t.Status == Fuji36.Common.Contracts.Planning.TaskStatus.InProgress);

        // Determine progress status
        if (completionPercentage == 100)
            return PlanProgress.Completed;
        
        if (completionPercentage >= 75)
            return PlanProgress.OnTrack;
        
        if (completionPercentage >= 50)
            return PlanProgress.InProgress;
        
        if (inProgressTasks > 0)
            return PlanProgress.InProgress;

        return completionPercentage > 0 ? PlanProgress.InProgress : PlanProgress.NotStarted;
    }

    public async Task<int> CalculateProgressPercentageAsync(string planId)
    {
        var tasks = await _db.Tasks
            .Find(t => t.PlanId == planId)
            .ToListAsync();

        if (tasks.Count == 0)
            return 0;

        // Plan progress = average of all task progress percentages
        var sum = tasks.Sum(t => t.ProgressPercentage);
        return sum / tasks.Count;
    }

    public async Task UpdatePlanProgressAsync(string planId)
    {
        var progress = await CalculateProgressAsync(planId);
        var percentage = await CalculateProgressPercentageAsync(planId);

        var update = Builders<PlanEntity>.Update
            .Set(p => p.Progress, progress)
            .Set(p => p.ProgressPercentage, percentage)
            .Set(p => p.UpdatedAt, DateTimeOffset.UtcNow);

        if (progress == PlanProgress.Completed)
        {
            update = update.Set(p => p.CompletedDate, DateTimeOffset.UtcNow);
            update = update.Set(p => p.Status, PlanStatus.Completed);
        }

        await _db.Plans.UpdateOneAsync(
            p => p.Id == planId,
            update
        );
    }
}
