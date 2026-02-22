using Fuji36.Identity.Models;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace Fuji36.Identity.Data
{
    public sealed class MongoContext
    {
        public IMongoDatabase Db { get; }
        public IMongoCollection<UserEntity> Users { get; }

        public MongoContext(IOptions<MongoOptions> options)
        {
            var client = new MongoClient(options.Value.ConnectionString);
            Db = client.GetDatabase(options.Value.Database);

            Users = Db.GetCollection<UserEntity>("fuji36_users");

            // indexes
            var emailIndex = new CreateIndexModel<UserEntity>(
                Builders<UserEntity>.IndexKeys.Ascending(x => x.Email),
                new CreateIndexOptions { Unique = true }
            );
            Users.Indexes.CreateOne(emailIndex);
        }
    }
}
