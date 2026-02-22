using Fuji36.Common.Contracts.Sessions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fuji36.Common.Contracts.Scoring
{
    public sealed record ScoreRequestDto(
    string SessionId,
    string ExerciseType,
    int SampleFps,
    IReadOnlyList<LandmarkFrameDto> Frames,
    ScoringConfigDto? Config = null
    );

    public sealed record ScoringConfigDto(
    SmoothingConfigDto? Smoothing = null,
    Dictionary<string, float>? Thresholds = null
    );

    public sealed record SmoothingConfigDto(
        int Window = 7
    );
}
