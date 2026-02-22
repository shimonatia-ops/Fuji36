namespace Fuji36.Common.Contracts.Planning;

public sealed record CreatePatientRequestDto(
    string UserId,
    DateTime? DateOfBirth = null,
    string? PhoneNumber = null,
    string? Address = null,
    string? MedicalNotes = null
);
