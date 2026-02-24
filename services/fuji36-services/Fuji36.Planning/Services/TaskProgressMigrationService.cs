using Fuji36.Planning.Data;
using Fuji36.Planning.Models;
using PlanningTaskStatus = Fuji36.Common.Contracts.Planning.TaskStatus;
using Microsoft.Extensions.Hosting;
using MongoDB.Driver;

namespace Fuji36.Planning.Services;

/// <summary>
/// One-time migration: set progressPercentage for existing tasks.
/// Completed tasks -> 100, others -> 0.
/// </summary>
public sealed class TaskProgressMigrationService : IHostedService
{
    private readonly MongoContext _db;
    private readonly IPlanProgressService _progressService;
    private readonly ILogger<TaskProgressMigrationService>? _logger;

    public TaskProgressMigrationService(
        MongoContext db,
        IPlanProgressService progressService,
        ILogger<TaskProgressMigrationService>? logger = null)
    {
        _db = db;
        _progressService = progressService;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            _logger?.LogInformation("Starting task progress migration...");

            var completedFilter = Builders<TaskEntity>.Filter.Eq(t => t.Status, PlanningTaskStatus.Completed);
            var completedTasks = await _db.Tasks.Find(completedFilter).ToListAsync(cancellationToken);

            foreach (var task in completedTasks)
            {
                if (task.ProgressPercentage != 100)
                {
                    await _db.Tasks.UpdateOneAsync(
                        Builders<TaskEntity>.Filter.Eq(t => t.Id, task.Id),
                        Builders<TaskEntity>.Update
                            .Set(t => t.ProgressPercentage, 100)
                            .Set(t => t.UpdatedAt, DateTimeOffset.UtcNow),
                        cancellationToken: cancellationToken);
                    _logger?.LogDebug("Set progressPercentage=100 for completed task {TaskId}", task.Id);
                }
            }

            // Recalculate plan progress for all plans that have tasks
            var planIds = (await _db.Tasks.DistinctAsync<string>("planId", Builders<TaskEntity>.Filter.Empty, cancellationToken: cancellationToken)).ToList();
            foreach (var planId in planIds)
            {
                await _progressService.UpdatePlanProgressAsync(planId);
            }

            _logger?.LogInformation("Task progress migration completed.");
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error during task progress migration");
            throw;
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
