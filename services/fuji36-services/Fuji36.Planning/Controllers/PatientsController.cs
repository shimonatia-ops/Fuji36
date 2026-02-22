using System.Security.Claims;
using System.Text.Json;
using Fuji36.Common.Contracts.Auth;
using Fuji36.Common.Contracts.Planning;
using Fuji36.Planning.Data;
using Fuji36.Planning.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace Fuji36.Planning.Controllers;

[ApiController]
[Route("patients")]
[Authorize]
public sealed class PatientsController : ControllerBase
{
    private readonly MongoContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<PatientsController>? _logger;

    public PatientsController(MongoContext db, IHttpClientFactory httpClientFactory, ILogger<PatientsController>? logger = null)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    private async Task<(string? FirstName, string? LastName, string? UserExternalId, string? AvatarUrl)> GetUserInfoAsync(string userId)
    {
        try
        {
            var identityClient = _httpClientFactory.CreateClient("identity");
            var auth = Request.Headers.Authorization.ToString();
            if (!string.IsNullOrWhiteSpace(auth))
            {
                identityClient.DefaultRequestHeaders.Remove("Authorization");
                identityClient.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", auth);
            }

            var userResponse = await identityClient.GetAsync($"/auth/users/{userId}");
            if (userResponse.IsSuccessStatusCode)
            {
                var userJson = await userResponse.Content.ReadAsStringAsync();
                var user = JsonSerializer.Deserialize<MeDto>(userJson, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
                return (user?.FirstName, user?.LastName, user?.ExternalUserId, user?.AvatarUrl);
            }
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Failed to fetch user info for user {UserId}", userId);
        }
        return (null, null, null, null);
    }

    [HttpPost]
    public async Task<ActionResult<PatientDto>> Create(
        [FromHeader(Name = "X-User-Id")] string userId,
        [FromBody] CreatePatientRequestDto req)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized("Missing X-User-Id header");

        // Check if patient already exists for this user
        var existing = await _db.Patients.Find(x => x.UserId == req.UserId).FirstOrDefaultAsync();
        if (existing != null)
            return Conflict("Patient already exists for this user");

        var entity = new PatientEntity
        {
            UserId = req.UserId,
            DateOfBirth = req.DateOfBirth,
            PhoneNumber = req.PhoneNumber,
            Address = req.Address,
            MedicalNotes = req.MedicalNotes,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        await _db.Patients.InsertOneAsync(entity);

        var (firstName, lastName, userExternalId, avatarUrl) = await GetUserInfoAsync(entity.UserId);

        return Ok(new PatientDto(
            entity.Id,
            entity.UserId,
            userExternalId,
            firstName,
            lastName,
            avatarUrl,
            entity.DateOfBirth,
            entity.PhoneNumber,
            entity.Address,
            entity.MedicalNotes,
            entity.CreatedAt,
            entity.UpdatedAt
        ));
    }

    [HttpGet("{patientId}")]
    public async Task<ActionResult<PatientDto>> Get(
        string patientId,
        [FromHeader(Name = "X-User-Id")] string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized("Missing X-User-Id header");

        var patient = await _db.Patients.Find(x => x.Id == patientId).FirstOrDefaultAsync();
        if (patient is null) return NotFound();

        // Authorization: User must be the patient, a therapist assigned to this patient, or an admin
        if (patient.UserId != userId)
        {
            // Check if user is admin from JWT claims
            var isAdmin = User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "admin");
            if (!isAdmin)
            {
                // If not admin, check if userId is a therapist with access to this patient
                var therapist = await _db.Therapists.Find(x => x.UserId == userId).FirstOrDefaultAsync();
                if (therapist == null) return Forbid();

                var relationship = await _db.TherapistPatientRelationships
                    .Find(x => x.TherapistId == therapist.Id && x.PatientId == patientId && x.Status == RelationshipStatus.Active)
                    .FirstOrDefaultAsync();
                
                if (relationship == null) return Forbid();
            }
        }

        var (firstName, lastName, userExternalId, avatarUrl) = await GetUserInfoAsync(patient.UserId);

        return Ok(new PatientDto(
            patient.Id,
            patient.UserId,
            userExternalId,
            firstName,
            lastName,
            avatarUrl,
            patient.DateOfBirth,
            patient.PhoneNumber,
            patient.Address,
            patient.MedicalNotes,
            patient.CreatedAt,
            patient.UpdatedAt
        ));
    }

    [HttpGet("user/{userId}")]
    public async Task<ActionResult<PatientDto>> GetByUserId(
        string userId,
        [FromHeader(Name = "X-User-Id")] string currentUserId)
    {
        if (string.IsNullOrWhiteSpace(currentUserId))
            return Unauthorized("Missing X-User-Id header");

        // Authorization: User must be requesting their own data, be a therapist, or be an admin
        if (userId != currentUserId)
        {
            // Check if user is admin from JWT claims
            var isAdmin = User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "admin");
            if (!isAdmin)
            {
                var therapist = await _db.Therapists.Find(x => x.UserId == currentUserId).FirstOrDefaultAsync();
                if (therapist == null) return Forbid();
            }
        }

        var patient = await _db.Patients.Find(x => x.UserId == userId).FirstOrDefaultAsync();
        if (patient is null) return NotFound();

        var (firstName, lastName, userExternalId, avatarUrl) = await GetUserInfoAsync(patient.UserId);

        return Ok(new PatientDto(
            patient.Id,
            patient.UserId,
            userExternalId,
            firstName,
            lastName,
            avatarUrl,
            patient.DateOfBirth,
            patient.PhoneNumber,
            patient.Address,
            patient.MedicalNotes,
            patient.CreatedAt,
            patient.UpdatedAt
        ));
    }

    [HttpGet]
    public async Task<ActionResult<List<PatientDto>>> GetAll(
        [FromHeader(Name = "X-User-Id")] string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized("Missing X-User-Id header");

        // Only therapists/admins can list all patients
        var isAdmin = User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "admin");
        if (!isAdmin)
        {
            var therapist = await _db.Therapists.Find(x => x.UserId == userId).FirstOrDefaultAsync();
            if (therapist == null)
                return Forbid("Only therapists or admins can list all patients");
        }

        var patients = await _db.Patients
            .Find(_ => true)
            .SortBy(x => x.CreatedAt)
            .ToListAsync();

        var result = new List<PatientDto>();
        foreach (var patient in patients)
        {
            var (firstName, lastName, userExternalId, avatarUrl) = await GetUserInfoAsync(patient.UserId);
            result.Add(new PatientDto(
                patient.Id,
                patient.UserId,
                userExternalId,
                firstName,
                lastName,
                avatarUrl,
                patient.DateOfBirth,
                patient.PhoneNumber,
                patient.Address,
                patient.MedicalNotes,
                patient.CreatedAt,
                patient.UpdatedAt
            ));
        }

        return Ok(result);
    }
}
