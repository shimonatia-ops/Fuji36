namespace Fuji36.Common.Contracts.Planning;

public sealed record AssignPatientToTherapistRequestDto(
    string TherapistId,
    string PatientId,
    string? Notes = null
);
