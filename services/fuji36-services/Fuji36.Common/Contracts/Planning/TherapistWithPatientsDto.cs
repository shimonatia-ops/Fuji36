namespace Fuji36.Common.Contracts.Planning;

public sealed record TherapistWithPatientsDto(
    TherapistDto Therapist,
    IReadOnlyList<PatientDto> Patients
);
