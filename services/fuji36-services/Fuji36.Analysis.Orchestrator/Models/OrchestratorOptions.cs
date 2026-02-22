namespace Fuji36.Analysis.Orchestrator.Models;

public sealed class OrchestratorOptions
{
    public int PollIntervalMs { get; init; } = 750;
    public int MaxFramesPerJob { get; init; } = 6000;
}
