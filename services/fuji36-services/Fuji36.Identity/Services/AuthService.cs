using Fuji36.Identity.Data;
using MongoDB.Driver;

namespace Fuji36.Identity.Services;

public sealed class AuthService
{
    private readonly MongoContext _db;

    public AuthService(MongoContext db) => _db = db;

    public async Task<(bool Ok, string UserId, string Email, List<string> Roles)> ValidateAsync(string email, string password)
    {
        var user = await _db.Users.Find(x => x.Email == email.ToLowerInvariant()).FirstOrDefaultAsync();
        if (user is null) return (false, "", "", new List<string>());

        var ok = BCrypt.Net.BCrypt.Verify(password, user.PasswordHash);
        return ok ? (true, user.Id, user.Email, user.Roles) : (false, "", "", new List<string>());
    }

    public async Task<(string UserId, string Email, List<string> Roles)?> FindByIdAsync(string userId)
    {
        var user = await _db.Users.Find(x => x.Id == userId).FirstOrDefaultAsync();
        if (user is null) return null;
        return (user.Id, user.Email, user.Roles);
    }

    public async Task<Models.UserEntity?> GetUserByIdAsync(string userId)
    {
        return await _db.Users.Find(x => x.Id == userId).FirstOrDefaultAsync();
    }
}
