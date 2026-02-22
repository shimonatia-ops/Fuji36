using Fuji36.Common.Contracts.Planning;
using Fuji36.Planning.Data;
using Fuji36.Planning.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Fuji36.Planning.Controllers;

[ApiController]
[Route("task-templates")]
[Authorize]
public sealed class TaskTemplatesController : ControllerBase
{
    private readonly MongoContext _db;

    public TaskTemplatesController(MongoContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<TaskTemplateDto>>> GetAll(
        [FromQuery] TaskType? taskType = null,
        [FromQuery] bool? isActive = true)
    {
        // All authenticated users can view task templates

        var filterBuilder = Builders<TaskTemplateEntity>.Filter;
        var filter = filterBuilder.Empty;

        if (taskType.HasValue)
        {
            filter &= filterBuilder.Eq(x => x.TaskType, taskType.Value);
        }

        if (isActive.HasValue)
        {
            filter &= filterBuilder.Eq(x => x.IsActive, isActive.Value);
        }

        var templates = await _db.TaskTemplates
            .Find(filter)
            .SortBy(x => x.TemplateName)
            .ToListAsync();

        var result = templates.Select(t => new TaskTemplateDto(
            t.Id,
            t.TemplateName,
            t.TaskType,
            t.Name,
            t.Description,
            ConvertBsonDocumentToDictionary(t.Properties),
            t.IsActive,
            t.CreatedAt,
            t.UpdatedAt
        )).ToList();

        return Ok(result);
    }

    [HttpGet("{templateId}")]
    public async Task<ActionResult<TaskTemplateDto>> Get(string templateId)
    {
        // All authenticated users can view task templates

        var template = await _db.TaskTemplates.Find(x => x.Id == templateId).FirstOrDefaultAsync();
        if (template is null) return NotFound();

        return Ok(new TaskTemplateDto(
            template.Id,
            template.TemplateName,
            template.TaskType,
            template.Name,
            template.Description,
            ConvertBsonDocumentToDictionary(template.Properties),
            template.IsActive,
            template.CreatedAt,
            template.UpdatedAt
        ));
    }

    private static Dictionary<string, object>? ConvertBsonDocumentToDictionary(BsonDocument doc)
    {
        if (doc == null || doc.ElementCount == 0)
            return null;

        var dict = new Dictionary<string, object>();
        foreach (var element in doc)
        {
            dict[element.Name] = element.Value.BsonType switch
            {
                BsonType.String => element.Value.AsString,
                BsonType.Int32 => element.Value.AsInt32,
                BsonType.Int64 => element.Value.AsInt64,
                BsonType.Double => element.Value.AsDouble,
                BsonType.Boolean => element.Value.AsBoolean,
                BsonType.Null => (object?)null,
                BsonType.Document => ConvertBsonDocumentToDictionary(element.Value.AsBsonDocument) ?? new Dictionary<string, object>(),
                BsonType.Array => element.Value.AsBsonArray.Select(v => v.ToUniversalValue()).ToList(),
                _ => element.Value.ToString()
            };
        }
        return dict;
    }
}

// Extension method to convert BsonValue to a more universal C# type
public static class BsonValueExtensions
{
    public static object ToUniversalValue(this BsonValue bsonValue)
    {
        return bsonValue.BsonType switch
        {
            BsonType.String => bsonValue.AsString,
            BsonType.Int32 => bsonValue.AsInt32,
            BsonType.Int64 => bsonValue.AsInt64,
            BsonType.Double => bsonValue.AsDouble,
            BsonType.Boolean => bsonValue.AsBoolean,
            BsonType.Document => BsonDocumentToDictionary(bsonValue.AsBsonDocument),
            BsonType.Array => bsonValue.AsBsonArray.Select(v => v.ToUniversalValue()).ToList(),
            _ => bsonValue.ToString()
        };
    }

    private static Dictionary<string, object> BsonDocumentToDictionary(BsonDocument doc)
    {
        var dict = new Dictionary<string, object>();
        foreach (var element in doc)
        {
            dict[element.Name] = element.Value.ToUniversalValue();
        }
        return dict;
    }
}
