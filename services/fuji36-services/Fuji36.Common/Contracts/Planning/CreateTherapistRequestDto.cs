namespace Fuji36.Common.Contracts.Planning;

public sealed record CreateTherapistRequestDto(
    string UserId,
    string? LicenseNumber = null,
    string? Specialization = null,
    string? PhoneNumber = null
);
