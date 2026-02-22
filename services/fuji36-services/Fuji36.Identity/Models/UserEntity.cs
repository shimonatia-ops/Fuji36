using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Fuji36.Identity.Models
{
    public sealed class UserEntity
    {
        [BsonId]
        [BsonRepresentation(BsonType.String)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [BsonElement("email")]
        public string Email { get; set; } = default!;

        [BsonElement("passwordHash")]
        public string PasswordHash { get; set; } = default!;

        [BsonElement("roles")]
        public List<string> Roles { get; set; } = new();

        [BsonElement("firstName")]
        public string? FirstName { get; set; }

        [BsonElement("lastName")]
        public string? LastName { get; set; }

        [BsonElement("userId")]
        public string? UserId { get; set; }

        [BsonElement("avatarUrl")]
        public string? AvatarUrl { get; set; }

        [BsonElement("createdAt")]
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
