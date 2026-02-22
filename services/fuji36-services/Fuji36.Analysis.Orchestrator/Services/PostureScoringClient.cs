using Fuji36.Common.Contracts.Scoring;
using Fuji36.Common.Contracts.Sessions;
using Microsoft.Extensions.Configuration;
using System.Net.Http.Json;

namespace Fuji36.Analysis.Orchestrator.Services;

public sealed class PostureScoringClient
{
    private readonly HttpClient _http;

    public PostureScoringClient(HttpClient http, IConfiguration cfg)
    {
        var baseUrl = cfg["Services:PostureScoringBaseUrl"] ?? "http://localhost:7003";
        http.BaseAddress = new Uri(baseUrl);
        _http = http;
    }

    public async Task<ScoreResponseDto> ScoreAsync(ScoreRequestDto req, CancellationToken ct)
    {
        try
        {
            var resp = await _http.PostAsJsonAsync("/score", req, ct);
            if (!resp.IsSuccessStatusCode)
                throw new Exception($"Scoring service status {(int)resp.StatusCode}");

            var body = await resp.Content.ReadFromJsonAsync<ScoreResponseDto>(cancellationToken: ct);
            if (body is null) throw new Exception("Empty scoring response");
            return body;
        }
        catch
        {
            // Fallback (MVP): no scoring service available yet
            var reps = Math.Max(0, req.Frames.Count / Math.Max(1, req.SampleFps)); // rough placeholder
            return new ScoreResponseDto(
                Reps: reps,
                CompensationScore: 10,
                Issues: Array.Empty<ScoringIssueDto>(),
                Confidence: 0.3f,
                Engine: "fallback",
                EngineVersion: "0.1"
            );
        }
    }
}
