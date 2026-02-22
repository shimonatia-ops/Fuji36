using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fuji36.Common.Contracts.Scoring
{
    public sealed record ScoreResponseDto(
    int Reps,
    int CompensationScore,
    IReadOnlyList<ScoringIssueDto> Issues,
    float Confidence,
    string Engine,
    string EngineVersion
);

    public sealed record ScoringIssueDto(
        string Type,
        string Severity,
        int Count = 1
    );
}
