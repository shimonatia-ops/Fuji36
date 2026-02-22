using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fuji36.Common.Contracts.Auth
{
    public sealed record LoginResponseDto(
    string AccessToken,
    string TokenType = "Bearer"
);
}
