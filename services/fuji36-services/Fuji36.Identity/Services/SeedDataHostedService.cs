using Fuji36.Identity.Data;
using Fuji36.Identity.Models;
using Microsoft.Extensions.Hosting;
using MongoDB.Driver;

namespace Fuji36.Identity.Services;

public sealed class SeedDataHostedService : IHostedService
{
    private readonly MongoContext _db;

    public SeedDataHostedService(MongoContext db) => _db = db;

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        await EnsureUserAsync("admin@example.com", "Admin123!", new[] { "admin" }, cancellationToken);
        await EnsureUserAsync("reviewer@example.com", "Reviewer123!", new[] { "reviewer" }, cancellationToken);
        await EnsureUserAsync("user@example.com", "User123!", new[] { "user" }, cancellationToken);
        await EnsureUserAsync("patient@example.com", "Patient123!", new[] { "patient" }, cancellationToken);
        await EnsureUserAsync("therapist@example.com", "Therapist123!", new[] { "therapist" }, cancellationToken);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private async Task EnsureUserAsync(string email, string password, IEnumerable<string> roles, CancellationToken ct)
    {
        email = email.ToLowerInvariant();
        var exists = await _db.Users.Find(x => x.Email == email).AnyAsync(ct);
        if (exists) return;

        var user = new UserEntity
        {
            Id = Guid.NewGuid().ToString(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Roles = roles.ToList(),
            CreatedAt = DateTimeOffset.UtcNow
        };

        await _db.Users.InsertOneAsync(user, cancellationToken: ct);
    }
}
