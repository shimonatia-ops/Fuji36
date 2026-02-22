using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fuji36.Common.Contracts.Sessions
{
    public sealed record LandmarkBatchDto(
    string SessionId,
    string BatchId,
    int SampleFps,
    IReadOnlyList<LandmarkFrameDto> Frames
    );
}
