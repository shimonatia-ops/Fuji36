namespace Fuji36.Analysis.Orchestrator.Data;

public sealed class MongoOptions
{
    public string ConnectionString { get; init; } = default!;
    public string Database { get; init; } = default!;
}
