namespace Fuji36.Identity.Data
{
    public sealed class MongoOptions
    {
        public string ConnectionString { get; init; } = default!;
        public string Database { get; init; } = default!;
    }
}
