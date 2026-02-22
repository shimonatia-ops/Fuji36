namespace Fuji36.Common.Contracts.Planning;

public sealed record TherapistDto(
    string TherapistId,
    string UserId,
    string? LicenseNumber,
    string? Specialization,
    string? PhoneNumber,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);
