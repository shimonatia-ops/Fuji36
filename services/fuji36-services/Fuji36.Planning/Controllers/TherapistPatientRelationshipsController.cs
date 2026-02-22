using System.Security.Claims;
using Fuji36.Common.Contracts.Planning;
using Fuji36.Planning.Data;
using Fuji36.Planning.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace Fuji36.Planning.Controllers;

[ApiController]
[Route("therapist-patient-relationships")]
[Authorize]
public sealed class TherapistPatientRelationshipsController : ControllerBase
{
    private readonly MongoContext _db;

    public TherapistPatientRelationshipsController(MongoContext db) => _db = db;

    [HttpPost]
    public async Task<ActionResult> AssignPatientToTherapist(
        [FromHeader(Name = "X-User-Id")] string userId,
        [FromBody] AssignPatientToTherapistRequestDto req)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized("Missing X-User-Id header");

        // Only therapists/admins can assign patients
        var isAdmin = User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "admin");
        if (!isAdmin)
        {
            var therapist = await _db.Therapists.Find(x => x.UserId == userId).FirstOrDefaultAsync();
            if (therapist == null)
                return Forbid("Only therapists or admins can assign patients");
        }

        // Verify therapist and patient exist
        var therapistEntity = await _db.Therapists.Find(x => x.Id == req.TherapistId).FirstOrDefaultAsync();
        if (therapistEntity is null) return NotFound("Therapist not found");

        var patient = await _db.Patients.Find(x => x.Id == req.PatientId).FirstOrDefaultAsync();
        if (patient is null) return NotFound("Patient not found");

        // Check if relationship already exists
        var existing = await _db.TherapistPatientRelationships
            .Find(x => x.TherapistId == req.TherapistId && x.PatientId == req.PatientId)
            .FirstOrDefaultAsync();

        if (existing != null)
        {
            // Update existing relationship to Active
            if (existing.Status != RelationshipStatus.Active)
            {
                await _db.TherapistPatientRelationships.UpdateOneAsync(
                    x => x.Id == existing.Id,
                    Builders<TherapistPatientRelationship>.Update
                        .Set(x => x.Status, RelationshipStatus.Active)
                        .Set(x => x.AssignedAt, DateTimeOffset.UtcNow)
                        .Set(x => x.AssignedBy, userId)
                        .Set(x => x.Notes, req.Notes)
                        .Set(x => x.UpdatedAt, DateTimeOffset.UtcNow));
            }
            return Ok(new { relationshipId = existing.Id, message = "Relationship already exists and is active" });
        }

        // Create new relationship
        var relationship = new TherapistPatientRelationship
        {
            TherapistId = req.TherapistId,
            PatientId = req.PatientId,
            Status = RelationshipStatus.Active,
            AssignedAt = DateTimeOffset.UtcNow,
            AssignedBy = userId,
            Notes = req.Notes,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        await _db.TherapistPatientRelationships.InsertOneAsync(relationship);

        return Ok(new { relationshipId = relationship.Id });
    }

    [HttpDelete("{therapistId}/{patientId}")]
    public async Task<ActionResult> RemoveRelationship(
        string therapistId,
        string patientId,
        [FromHeader(Name = "X-User-Id")] string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized("Missing X-User-Id header");

        // Only therapists/admins can remove relationships
        var isAdmin = User.Claims.Any(c => c.Type == ClaimTypes.Role && c.Value == "admin");
        if (!isAdmin)
        {
            var therapist = await _db.Therapists.Find(x => x.UserId == userId).FirstOrDefaultAsync();
            if (therapist == null)
                return Forbid("Only therapists or admins can remove relationships");
        }

        var relationship = await _db.TherapistPatientRelationships
            .Find(x => x.TherapistId == therapistId && x.PatientId == patientId)
            .FirstOrDefaultAsync();

        if (relationship is null) return NotFound("Relationship not found");

        // Soft delete - set status to Inactive
        await _db.TherapistPatientRelationships.UpdateOneAsync(
            x => x.Id == relationship.Id,
            Builders<TherapistPatientRelationship>.Update
                .Set(x => x.Status, RelationshipStatus.Inactive)
                .Set(x => x.UpdatedAt, DateTimeOffset.UtcNow));

        return Ok();
    }
}
