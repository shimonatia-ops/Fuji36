using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fuji36.Common.Contracts.Sessions
{
    public sealed record LandmarkFrameDto(
    long FrameId,
    long TsMs,
    IReadOnlyList<LandmarkDto>? Pose,
    IReadOnlyList<LandmarkDto>? LeftHand,
    IReadOnlyList<LandmarkDto>? RightHand,
    FrameMetaDto Meta
);
}
