namespace Fuji36.Common.Contracts.Planning;

public sealed record PatientDto(
    string PatientId,
    string UserId, // This is UserEntity.Id (MongoDB _id)
    string? UserExternalId, // This is UserEntity.UserId property (the external userId)
    string? FirstName,
    string? LastName,
    string? AvatarUrl,
    DateTime? DateOfBirth,
    string? PhoneNumber,
    string? Address,
    string? MedicalNotes,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);
