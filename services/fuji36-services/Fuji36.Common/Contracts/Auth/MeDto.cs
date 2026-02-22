using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fuji36.Common.Contracts.Auth
{
    public sealed record MeDto(
        string UserId,
        string Email,
        IReadOnlyList<string> Roles,
        string? FirstName = null,
        string? LastName = null,
        string? ExternalUserId = null,
        string? AvatarUrl = null
    );
}
