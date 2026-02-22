using System.Security.Claims;
using Fuji36.Common.Contracts.Planning;
using Fuji36.Planning.Data;
using Fuji36.Planning.Models;
using Fuji36.Planning.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace Fuji36.Planning.Controllers;

[ApiController]
[Route("plans")]
[Authorize]
public sealed class PlansController : ControllerBase
{
    private readonly MongoContext _db;
    private readonly ITaskFactory _taskFactory;
    private readonly IPlanProgressService? _progressService;
    private readonly ILogger<PlansController>? _logger;

    public PlansController(
        MongoContext db, 
        ITaskFactory taskFactory, 
        IPlanProgressService? progressService = null,
        ILogger<PlansController>? logger = null)
    {
        _db = db;
        _taskFactory = taskFactory;
        _progressService = progressService;
        _logger = logger;
    }

    [HttpPost]
    public async Task<ActionResult<PlanDto>> Create(
        [FromHeader(Name = "X-User-Id")] string userId,
        [FromBody] CreatePlanRequestDto req)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(userId))
                return Unauthorized("Missing X-User-Id header");

            if (req == null)
                return BadRequest("Request body is required");

            if (req.Tasks == null || req.Tasks.Count == 0)
                return BadRequest("At least one task is required");

            // Check if user is admin
            var isAdmin = User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "admin");

            // Validate that the patient exists
            var patient = await _db.Patients.Find(x => x.Id == req.PatientId || x.UserId == req.PatientId).FirstOrDefaultAsync();
            if (patient == null)
                return BadRequest($"Patient with ID {req.PatientId} not found");

            // Use the patient's entity ID (not userId) for the plan
            var patientEntityId = patient.Id;

            // Determine therapistId
            string? therapistId = null;
            if (req.PatientId != userId && patient.UserId != userId)
            {
                // User is creating plan for a different patient
                // Check if user is a therapist or admin
                if (isAdmin)
                {
                    // Admin can create plan without being assigned as therapist
                    // Leave therapistId as null or allow admin to specify
                    therapistId = null;
                }
                else
                {
                    // Check if user is a therapist
                    var therapist = await _db.Therapists.Find(x => x.UserId == userId).FirstOrDefaultAsync();
                    if (therapist == null)
                        return Forbid("Only therapists or admins can create plans for other patients");

                    // Verify therapist has access to this patient
                    var relationship = await _db.TherapistPatientRelationships
                        .Find(x => x.TherapistId == therapist.Id && x.PatientId == patientEntityId && x.Status == RelationshipStatus.Active)
                        .FirstOrDefaultAsync();
                    
                    if (relationship == null)
                        return Forbid("Therapist is not assigned to this patient");

                    therapistId = therapist.Id;
                }
            }
            else if (req.PatientId == userId || patient.UserId == userId)
            {
                // Patient creating plan for themselves - no therapist
                therapistId = null;
            }

            var planEntity = new PlanEntity
            {
                PatientId = patientEntityId, // Use entity ID, not userId
                TherapistId = therapistId,
                PlanName = req.PlanName,
                Status = PlanStatus.Active,
                Frequency = req.Frequency,
                Goals = req.Goals ?? new List<string>(),
                StartDate = req.StartDate,
                DueDate = req.DueDate,
                Description = req.Description,
                Progress = PlanProgress.NotStarted,
                ProgressPercentage = 0,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            await _db.Plans.InsertOneAsync(planEntity);

            // Create tasks
            var taskEntities = new List<TaskEntity>();
            foreach (var taskReq in req.Tasks)
            {
                var taskEntity = _taskFactory.CreateTaskEntity(
                    taskReq.TaskType,
                    planEntity.Id,
                    taskReq.Name,
                    taskReq.Description,
                    taskReq.Properties
                );
                taskEntity.DueDate = taskReq.DueDate;
                taskEntities.Add(taskEntity);
            }

            if (taskEntities.Count > 0)
            {
                await _db.Tasks.InsertManyAsync(taskEntities);
            }

            // Load tasks and convert to DTOs
            var tasks = await LoadTasksForPlan(planEntity.Id);
            var taskDtos = tasks.Select(t =>
            {
                // Convert Properties to Dictionary if needed
                Dictionary<string, object>? propertiesDict = null;
                if (t.Properties != null && t.Properties.Count > 0)
                {
                    propertiesDict = new Dictionary<string, object>(t.Properties);
                }

                return new TaskDto(
                    t.TaskId,
                    t.TaskType,
                    t.Name,
                    t.Description,
                    t.Status,
                    t.DueDate,
                    propertiesDict
                );
            }).ToList();

            return Ok(new PlanDto(
                planEntity.Id,
                planEntity.PatientId,
                planEntity.TherapistId,
                planEntity.PlanName,
                planEntity.Status,
                planEntity.Frequency,
                planEntity.Goals,
                planEntity.Progress,
                planEntity.ProgressPercentage,
                planEntity.StartDate,
                planEntity.DueDate,
                planEntity.CompletedDate,
                planEntity.Description,
                taskDtos,
                planEntity.CreatedAt,
                planEntity.UpdatedAt
            ));
        }
        catch (Exception ex)
        {
            // Log the exception (in production, use proper logging)
            return StatusCode(500, new { error = "An error occurred while creating the plan", message = ex.Message });
        }
    }

    [HttpGet("{planId}")]
    public async Task<ActionResult<PlanDto>> Get(
        string planId,
        [FromHeader(Name = "X-User-Id")] string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized("Missing X-User-Id header");

        var plan = await _db.Plans.Find(x => x.Id == planId).FirstOrDefaultAsync();
        if (plan is null) return NotFound();

        // Authorization: User must be the patient, the therapist, or an admin
        var isAdmin = User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "admin");
        
        if (!isAdmin)
        {
            // Check if user is the patient
            var patient = await _db.Patients.Find(x => x.Id == plan.PatientId).FirstOrDefaultAsync();
            if (patient?.UserId == userId)
            {
                // User is the patient
            }
            else if (plan.TherapistId != null)
            {
                // Check if user is the therapist
                var therapist = await _db.Therapists.Find(x => x.Id == plan.TherapistId).FirstOrDefaultAsync();
                if (therapist?.UserId != userId)
                    return Forbid();
            }
            else
            {
                return Forbid();
            }
        }

        var tasks = await LoadTasksForPlan(planId);
        var taskDtos = tasks.Select(t => new TaskDto(
            t.TaskId,
            t.TaskType,
            t.Name,
            t.Description,
            t.Status,
            t.DueDate,
            t.Properties
        )).ToList();

        return Ok(new PlanDto(
            plan.Id,
            plan.PatientId,
            plan.TherapistId,
            plan.PlanName,
            plan.Status,
            plan.Frequency,
            plan.Goals,
            plan.Progress,
            plan.ProgressPercentage,
            plan.StartDate,
            plan.DueDate,
            plan.CompletedDate,
            plan.Description,
            taskDtos,
            plan.CreatedAt,
            plan.UpdatedAt
        ));
    }

    [HttpGet("patient/{patientId}")]
    public async Task<ActionResult<List<PlanDto>>> GetByPatient(
        string patientId,
        [FromHeader(Name = "X-User-Id")] string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized("Missing X-User-Id header");

        // Authorization: User must be the patient or a therapist viewing their patient
        if (patientId != userId)
        {
            // Check if userId is a therapist with access to this patient
            // For now, allow if userId is different (assuming therapist)
            // In production, add proper therapist-patient relationship check
        }

        var plans = await _db.Plans
            .Find(x => x.PatientId == patientId)
            .SortByDescending(x => x.CreatedAt)
            .ToListAsync();

        var result = new List<PlanDto>();
        foreach (var plan in plans)
        {
            var tasks = await LoadTasksForPlan(plan.Id);
            var taskDtos = tasks.Select(t => new TaskDto(
                t.TaskId,
                t.TaskType,
                t.Name,
                t.Description,
                t.Status,
                t.DueDate,
                t.Properties
            )).ToList();

            result.Add(new PlanDto(
                plan.Id,
                plan.PatientId,
                plan.TherapistId,
                plan.PlanName,
                plan.Status,
                plan.Frequency,
                plan.Goals,
                plan.Progress,
                plan.ProgressPercentage,
                plan.StartDate,
                plan.DueDate,
                plan.CompletedDate,
                plan.Description,
                taskDtos,
                plan.CreatedAt,
                plan.UpdatedAt
            ));
        }

        return Ok(result);
    }

    [HttpPatch("{planId}/tasks/{taskId}/status")]
    public async Task<ActionResult> UpdateTaskStatus(
        string planId,
        string taskId,
        [FromHeader(Name = "X-User-Id")] string userId,
        [FromBody] UpdateTaskStatusRequestDto req)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized("Missing X-User-Id header");

        var plan = await _db.Plans.Find(x => x.Id == planId).FirstOrDefaultAsync();
        if (plan is null) return NotFound("Plan not found");

        // Authorization: Only patient or assigned therapist or admin can update task status
        var isAdmin = User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "admin");
        if (plan.PatientId != userId && plan.TherapistId != userId && !isAdmin)
            return Forbid();

        var task = await _db.Tasks.Find(x => x.Id == taskId && x.PlanId == planId).FirstOrDefaultAsync();
        if (task is null) return NotFound("Task not found");

        await _db.Tasks.UpdateOneAsync(
            x => x.Id == taskId,
            Builders<TaskEntity>.Update
                .Set(x => x.Status, req.Status)
                .Set(x => x.UpdatedAt, DateTimeOffset.UtcNow));

        // Update plan's updatedAt and progress
        await _db.Plans.UpdateOneAsync(
            x => x.Id == planId,
            Builders<PlanEntity>.Update
                .Set(x => x.UpdatedAt, DateTimeOffset.UtcNow));

        // Update plan progress if progress service is available
        if (_progressService != null)
        {
            await _progressService.UpdatePlanProgressAsync(planId);
        }

        return Ok();
    }

    [HttpPost("{planId}/tasks")]
    public async Task<ActionResult<TaskDto>> AddTask(
        string planId,
        [FromHeader(Name = "X-User-Id")] string userId,
        [FromBody] CreateTaskRequestDto req)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized("Missing X-User-Id header");

        var plan = await _db.Plans.Find(x => x.Id == planId).FirstOrDefaultAsync();
        if (plan is null) return NotFound("Plan not found");

        // Authorization: Only therapist can add tasks to a plan
        if (plan.TherapistId != userId)
            return Forbid("Only the assigned therapist can add tasks to a plan");

        var taskEntity = _taskFactory.CreateTaskEntity(
            req.TaskType,
            planId,
            req.Name,
            req.Description,
            req.Properties
        );
        taskEntity.DueDate = req.DueDate;

        await _db.Tasks.InsertOneAsync(taskEntity);

        // Update plan's updatedAt
        await _db.Plans.UpdateOneAsync(
            x => x.Id == planId,
            Builders<PlanEntity>.Update
                .Set(x => x.UpdatedAt, DateTimeOffset.UtcNow));

        var propertiesDict = new Dictionary<string, object>();
        foreach (var element in taskEntity.Properties)
        {
            propertiesDict[element.Name] = element.Value.BsonType switch
            {
                MongoDB.Bson.BsonType.String => element.Value.AsString,
                MongoDB.Bson.BsonType.Int32 => element.Value.AsInt32,
                MongoDB.Bson.BsonType.Int64 => element.Value.AsInt64,
                MongoDB.Bson.BsonType.Double => element.Value.AsDouble,
                MongoDB.Bson.BsonType.Boolean => element.Value.AsBoolean,
                _ => element.Value.ToString()
            };
        }

        return Ok(new TaskDto(
            taskEntity.Id,
            taskEntity.TaskType,
            taskEntity.Name,
            taskEntity.Description,
            taskEntity.Status,
            taskEntity.DueDate,
            propertiesDict
        ));
    }

    [HttpDelete("{planId}/tasks/{taskId}")]
    public async Task<ActionResult> DeleteTask(
        string planId,
        string taskId,
        [FromHeader(Name = "X-User-Id")] string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized("Missing X-User-Id header");

        var plan = await _db.Plans.Find(x => x.Id == planId).FirstOrDefaultAsync();
        if (plan is null) return NotFound("Plan not found");

        // Authorization: Only therapist can delete tasks
        if (plan.TherapistId != userId)
            return Forbid("Only the assigned therapist can delete tasks from a plan");

        var result = await _db.Tasks.DeleteOneAsync(x => x.Id == taskId && x.PlanId == planId);
        if (result.DeletedCount == 0)
            return NotFound("Task not found");

        // Update plan's updatedAt
        await _db.Plans.UpdateOneAsync(
            x => x.Id == planId,
            Builders<PlanEntity>.Update
                .Set(x => x.UpdatedAt, DateTimeOffset.UtcNow));

        return Ok();
    }

    [HttpPatch("{planId}/progress")]
    public async Task<ActionResult> UpdateProgress(
        string planId,
        [FromHeader(Name = "X-User-Id")] string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized("Missing X-User-Id header");

        var plan = await _db.Plans.Find(x => x.Id == planId).FirstOrDefaultAsync();
        if (plan is null) return NotFound("Plan not found");

        // Authorization: Only patient, assigned therapist, or admin can update progress
        var isAdmin = User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "admin");
        if (plan.PatientId != userId && plan.TherapistId != userId && !isAdmin)
            return Forbid();

        if (_progressService == null)
            return StatusCode(500, "Progress service is not available");

        await _progressService.UpdatePlanProgressAsync(planId);
        return Ok();
    }

    private async Task<List<ITask>> LoadTasksForPlan(string planId)
    {
        var taskEntities = await _db.Tasks
            .Find(x => x.PlanId == planId)
            .SortBy(x => x.CreatedAt)
            .ToListAsync();

        return taskEntities.Select(e => _taskFactory.CreateTask(e)).ToList();
    }
}
