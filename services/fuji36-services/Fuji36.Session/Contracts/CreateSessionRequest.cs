namespace Fuji36.Session.Contracts;

public sealed record CreateSessionRequest(
    string UserId,
    string ExerciseType
);
