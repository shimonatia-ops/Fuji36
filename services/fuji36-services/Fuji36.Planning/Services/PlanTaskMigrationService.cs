using Fuji36.Planning.Data;
using Microsoft.Extensions.Hosting;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Fuji36.Planning.Services;

/// <summary>
/// Migration service to convert ObjectId format IDs to GUIDs for Plan and Task entities
/// and update all references in related collections (Tasks reference Plans)
/// </summary>
public sealed class PlanTaskMigrationService : IHostedService
{
    private readonly MongoContext _db;
    private readonly ILogger<PlanTaskMigrationService>? _logger;

    public PlanTaskMigrationService(MongoContext db, ILogger<PlanTaskMigrationService>? logger = null)
    {
        _db = db;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            _logger?.LogInformation("Starting Plan and Task ID migration...");

            // First, migrate Plans (since Tasks reference Plans)
            await MigrateCollection(
                "fuji36_plans",
                "Plan",
                new[] { ("fuji36_plan_tasks", "planId") },
                cancellationToken);

            // Then migrate Tasks (no outgoing references from tasks)
            await MigrateCollection(
                "fuji36_plan_tasks",
                "Task",
                Array.Empty<(string, string)>(),
                cancellationToken);

            _logger?.LogInformation("Plan and Task ID migration completed.");
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error during Plan and Task migration");
            throw;
        }
    }

    private async Task MigrateCollection(
        string collectionName,
        string entityName,
        IEnumerable<(string CollectionName, string FieldName)> referenceCollections,
        CancellationToken cancellationToken)
    {
        var collection = _db.Db.GetCollection<BsonDocument>(collectionName);
        var allDocuments = await collection.Find(_ => true).ToListAsync(cancellationToken);
        
        var idMapping = new Dictionary<string, string>(); // oldId -> newGuid
        var migrationCount = 0;

        // Step 1: Identify documents with ObjectId format and create GUID mapping
        foreach (var doc in allDocuments)
        {
            var idValue = doc["_id"];
            var oldId = idValue.ToString();

            // Check if ID is in ObjectId format (24 hex characters)
            if (idValue.IsObjectId && !string.IsNullOrEmpty(oldId))
            {
                var newGuid = Guid.NewGuid().ToString();
                idMapping[oldId] = newGuid;
                _logger?.LogInformation($"Will migrate {entityName} {oldId} to GUID {newGuid}");
            }
        }

        // Step 2: Convert ObjectId IDs to GUIDs and update all references
        if (idMapping.Count > 0)
        {
            _logger?.LogInformation($"Starting ID migration for {idMapping.Count} {entityName}s...");

            foreach (var kvp in idMapping)
            {
                var oldId = kvp.Key;
                var newGuid = kvp.Value;
                try
                {
                    // Check if a document with the new GUID already exists (idempotency)
                    var newIdFilter = Builders<BsonDocument>.Filter.Eq("_id", newGuid);
                    var existingNewDoc = await collection.Find(newIdFilter).FirstOrDefaultAsync(cancellationToken);
                    if (existingNewDoc != null)
                    {
                        _logger?.LogInformation($"Skipping {entityName} ID migration for {oldId} to {newGuid}: new GUID already exists.");
                        // Update references even if the main document wasn't migrated in this run
                        await UpdateReferencesInOtherCollections(referenceCollections, oldId, newGuid, cancellationToken);
                        continue;
                    }

                    // Find document by old ObjectId
                    var oldIdFilter = Builders<BsonDocument>.Filter.Eq("_id", ObjectId.Parse(oldId));
                    var docToMigrate = await collection.Find(oldIdFilter).FirstOrDefaultAsync(cancellationToken);

                    if (docToMigrate != null)
                    {
                        // Delete old document first to avoid unique key constraints
                        var deleteResult = await collection.DeleteOneAsync(oldIdFilter, cancellationToken: cancellationToken);

                        if (deleteResult.DeletedCount > 0)
                        {
                            // Create a new document with GUID ID
                            var newDoc = docToMigrate.DeepClone().AsBsonDocument;
                            newDoc["_id"] = newGuid;
                            
                            // Insert new document with GUID ID
                            await collection.InsertOneAsync(newDoc, cancellationToken: cancellationToken);
                            
                            migrationCount++;
                            _logger?.LogInformation($"Migrated {entityName} ID from {oldId} to {newGuid}");

                            // Update all references in other collections
                            await UpdateReferencesInOtherCollections(referenceCollections, oldId, newGuid, cancellationToken);
                        }
                        else
                        {
                            _logger?.LogWarning($"Could not delete old {entityName} document with ID {oldId}. Skipping ID migration.");
                        }
                    }
                    else
                    {
                        _logger?.LogWarning($"Could not find {entityName} document with ID {oldId} for migration.");
                    }
                }
                catch (Exception ex)
                {
                    _logger?.LogError(ex, $"Error migrating {entityName} with old ID {oldId}");
                }
            }

            _logger?.LogInformation($"ID migration completed for {entityName}s. Migrated {migrationCount} IDs.");
        }
        else
        {
            _logger?.LogInformation($"No {entityName}s found with ObjectId format for migration.");
        }
    }

    private async Task UpdateReferencesInOtherCollections(
        IEnumerable<(string CollectionName, string FieldName)> referenceCollections,
        string oldId,
        string newGuid,
        CancellationToken cancellationToken)
    {
        foreach (var (refCollectionName, refFieldName) in referenceCollections)
        {
            try
            {
                var refCollection = _db.Db.GetCollection<BsonDocument>(refCollectionName);
                var updateResult = await refCollection.UpdateManyAsync(
                    Builders<BsonDocument>.Filter.Eq(refFieldName, oldId),
                    Builders<BsonDocument>.Update.Set(refFieldName, newGuid),
                    cancellationToken: cancellationToken);

                if (updateResult.ModifiedCount > 0)
                {
                    _logger?.LogInformation($"Updated {updateResult.ModifiedCount} references in {refCollectionName}.{refFieldName} from {oldId} to {newGuid}");
                }
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, $"Could not update references in {refCollectionName}.{refFieldName} (collection may not exist or field may not be present)");
            }
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
