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
[Route("therapists")]
[Authorize]
public sealed class TherapistsController : ControllerBase
{
    private readonly MongoContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<TherapistsController>? _logger;

    public TherapistsController(MongoContext db, IHttpClientFactory httpClientFactory, ILogger<TherapistsController>? logger = null)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    [HttpPost]
    public async Task<ActionResult<TherapistDto>> Create(
        [FromHeader(Name = "X-User-Id")] string userId,
        [FromBody] CreateTherapistRequestDto req)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized("Missing X-User-Id header");

        // Check if therapist already exists for this user
        var existing = await _db.Therapists.Find(x => x.UserId == req.UserId).FirstOrDefaultAsync();
        if (existing != null)
            return Conflict("Therapist already exists for this user");

        var entity = new TherapistEntity
        {
            UserId = req.UserId,
            LicenseNumber = req.LicenseNumber,
            Specialization = req.Specialization,
            PhoneNumber = req.PhoneNumber,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        await _db.Therapists.InsertOneAsync(entity);

        return Ok(new TherapistDto(
            entity.Id,
            entity.UserId,
            entity.LicenseNumber,
            entity.Specialization,
            entity.PhoneNumber,
            entity.CreatedAt,
            entity.UpdatedAt
        ));
    }

    [HttpGet("{therapistId}")]
    public async Task<ActionResult<TherapistDto>> Get(
        string therapistId,
        [FromHeader(Name = "X-User-Id")] string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized("Missing X-User-Id header");

        var therapist = await _db.Therapists.Find(x => x.Id == therapistId).FirstOrDefaultAsync();
        if (therapist is null) return NotFound();

        // Authorization: User must be the therapist or an admin
        if (therapist.UserId != userId)
        {
            // Check if user is admin from JWT claims
            var isAdmin = User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "admin");
            if (!isAdmin)
            {
                // If not admin, check if user is a therapist
                var currentTherapist = await _db.Therapists.Find(x => x.UserId == userId).FirstOrDefaultAsync();
                if (currentTherapist == null) return Forbid();
            }
        }

        return Ok(new TherapistDto(
            therapist.Id,
            therapist.UserId,
            therapist.LicenseNumber,
            therapist.Specialization,
            therapist.PhoneNumber,
            therapist.CreatedAt,
            therapist.UpdatedAt
        ));
    }

    [HttpGet("user/{userId}")]
    public async Task<ActionResult<TherapistDto>> GetByUserId(
        string userId,
        [FromHeader(Name = "X-User-Id")] string currentUserId)
    {
        if (string.IsNullOrWhiteSpace(currentUserId))
            return Unauthorized("Missing X-User-Id header");

        // Authorization: User must be requesting their own data or be an admin
        var isAdmin = User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "admin");
        if (userId != currentUserId && !isAdmin)
            return Forbid();

        var therapist = await _db.Therapists.Find(x => x.UserId == userId).FirstOrDefaultAsync();
        if (therapist is null) return NotFound();

        return Ok(new TherapistDto(
            therapist.Id,
            therapist.UserId,
            therapist.LicenseNumber,
            therapist.Specialization,
            therapist.PhoneNumber,
            therapist.CreatedAt,
            therapist.UpdatedAt
        ));
    }

    [HttpGet]
    public async Task<ActionResult<List<TherapistDto>>> GetAll(
        [FromHeader(Name = "X-User-Id")] string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized("Missing X-User-Id header");

        // Only admins/therapists can list all therapists
        var therapist = await _db.Therapists.Find(x => x.UserId == userId).FirstOrDefaultAsync();
        if (therapist == null)
            return Forbid("Only therapists can list all therapists");

        var therapists = await _db.Therapists
            .Find(_ => true)
            .SortBy(x => x.CreatedAt)
            .ToListAsync();

        var result = therapists.Select(t => new TherapistDto(
            t.Id,
            t.UserId,
            t.LicenseNumber,
            t.Specialization,
            t.PhoneNumber,
            t.CreatedAt,
            t.UpdatedAt
        )).ToList();

        return Ok(result);
    }

    [HttpGet("{therapistId}/patients")]
    public async Task<ActionResult<List<PatientDto>>> GetPatients(
        string therapistId,
        [FromHeader(Name = "X-User-Id")] string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized("Missing X-User-Id header");

        var therapist = await _db.Therapists.Find(x => x.Id == therapistId).FirstOrDefaultAsync();
        if (therapist is null) return NotFound("Therapist not found");

        // Authorization: User must be the therapist or an admin
        var isAdmin = User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "admin");
        if (therapist.UserId != userId && !isAdmin)
            return Forbid();

        // Get all active relationships for this therapist
        var relationships = await _db.TherapistPatientRelationships
            .Find(x => x.TherapistId == therapistId && x.Status == RelationshipStatus.Active)
            .ToListAsync();

        var patientIds = relationships.Select(r => r.PatientId).ToList();
        if (patientIds.Count == 0)
            return Ok(new List<PatientDto>());

        var patients = await _db.Patients
            .Find(x => patientIds.Contains(x.Id))
            .ToListAsync();

        // Fetch user information from Identity service for each patient
        var identityClient = _httpClientFactory.CreateClient("identity");
        var result = new List<PatientDto>();

        foreach (var patient in patients)
        {
            string? firstName = null;
            string? lastName = null;
            string? userExternalId = null;
            string? avatarUrl = null;

            try
            {
                // Get user info from Identity service
                var auth = Request.Headers.Authorization.ToString();
                if (!string.IsNullOrWhiteSpace(auth))
                {
                    identityClient.DefaultRequestHeaders.Remove("Authorization");
                    identityClient.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", auth);
                }

                var userResponse = await identityClient.GetAsync($"/auth/users/{patient.UserId}");
                if (userResponse.IsSuccessStatusCode)
                {
                    var userJson = await userResponse.Content.ReadAsStringAsync();
                    var user = JsonSerializer.Deserialize<MeDto>(userJson, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });
                    firstName = user?.FirstName;
                    lastName = user?.LastName;
                    userExternalId = user?.ExternalUserId; // This is UserEntity.UserId property
                    avatarUrl = user?.AvatarUrl;
                    _logger?.LogInformation("Fetched user info for patient {UserId}: FirstName={FirstName}, LastName={LastName}, ExternalUserId={ExternalUserId}, AvatarUrl={AvatarUrl}", 
                        patient.UserId, firstName, lastName, userExternalId, avatarUrl);
                }
                else
                {
                    var errorContent = await userResponse.Content.ReadAsStringAsync();
                    _logger?.LogWarning("Failed to fetch user info for patient {UserId}. Status: {Status}, Response: {Response}", 
                        patient.UserId, userResponse.StatusCode, errorContent);
                }
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Exception while fetching user info for patient {UserId}", patient.UserId);
                // Continue without user info if fetch fails
            }

            result.Add(new PatientDto(
                patient.Id,
                patient.UserId, // UserEntity.Id (MongoDB _id)
                userExternalId, // UserEntity.UserId property (external userId)
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

    [HttpGet("with-patients")]
    public async Task<ActionResult<List<TherapistWithPatientsDto>>> GetAllWithPatients(
        [FromHeader(Name = "X-User-Id")] string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized("Missing X-User-Id header");

        // Only admins can get all therapists with their patients
        var isAdmin = User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "admin");
        if (!isAdmin)
            return Forbid("Only admins can view all therapists with their patients");

        // Get all therapists
        var therapists = await _db.Therapists
            .Find(_ => true)
            .SortBy(x => x.CreatedAt)
            .ToListAsync();

        // Get all active relationships
        var allRelationships = await _db.TherapistPatientRelationships
            .Find(x => x.Status == RelationshipStatus.Active)
            .ToListAsync();

        // Get all patient IDs that are assigned to any therapist
        var allPatientIds = allRelationships.Select(r => r.PatientId).Distinct().ToList();

        // Fetch all patients in one query
        var allPatients = allPatientIds.Count > 0
            ? await _db.Patients.Find(x => allPatientIds.Contains(x.Id)).ToListAsync()
            : new List<PatientEntity>();

        // Create a dictionary for quick patient lookup
        var patientsDict = allPatients.ToDictionary(p => p.Id);

        // Build result: each therapist with their assigned patients
        var result = new List<TherapistWithPatientsDto>();

        foreach (var therapist in therapists)
        {
            // Get relationships for this therapist
            var therapistRelationships = allRelationships
                .Where(r => r.TherapistId == therapist.Id)
                .ToList();

            // Get patients for this therapist
            var therapistPatients = therapistRelationships
                .Select(r => patientsDict.TryGetValue(r.PatientId, out var patient) ? patient : null)
                .Where(p => p != null)
                .Select(p => new PatientDto(
                    p!.Id,
                    p.UserId,
                    null, // userExternalId - would need to fetch from Identity service
                    null, // firstName - would need to fetch from Identity service
                    null, // lastName - would need to fetch from Identity service
                    null, // avatarUrl - would need to fetch from Identity service
                    p.DateOfBirth,
                    p.PhoneNumber,
                    p.Address,
                    p.MedicalNotes,
                    p.CreatedAt,
                    p.UpdatedAt
                ))
                .ToList();

            var therapistDto = new TherapistDto(
                therapist.Id,
                therapist.UserId,
                therapist.LicenseNumber,
                therapist.Specialization,
                therapist.PhoneNumber,
                therapist.CreatedAt,
                therapist.UpdatedAt
            );

            result.Add(new TherapistWithPatientsDto(therapistDto, therapistPatients));
        }

        return Ok(result);
    }
}
