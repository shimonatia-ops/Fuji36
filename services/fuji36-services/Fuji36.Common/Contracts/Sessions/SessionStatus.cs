using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fuji36.Common.Contracts.Sessions
{
    public enum SessionStatus
    {
        Created = 0,
        Recording = 1,
        Ingesting = 2,
        Processing = 3,
        Completed = 4,
        Failed = 5
    }
}
