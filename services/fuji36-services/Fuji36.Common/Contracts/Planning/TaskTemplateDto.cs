using System.Collections.Generic;

namespace Fuji36.Common.Contracts.Planning;

public sealed record TaskTemplateDto(
    string TemplateId,
    string TemplateName,
    TaskType TaskType,
    string Name,
    string? Description,
    Dictionary<string, object>? Properties,
    bool IsActive,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);
