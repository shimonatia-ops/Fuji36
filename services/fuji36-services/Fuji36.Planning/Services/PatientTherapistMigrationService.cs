using Fuji36.Planning.Data;
using Microsoft.Extensions.Hosting;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Fuji36.Planning.Services;

/// <summary>
/// Migration service to convert ObjectId format IDs to GUIDs for Patient and Therapist entities
/// and update all references in related collections (Plans, TherapistPatientRelationships)
/// </summary>
public sealed class PatientTherapistMigrationService : IHostedService
{
    private readonly MongoContext _db;
    private readonly ILogger<PatientTherapistMigrationService>? _logger;

    public PatientTherapistMigrationService(MongoContext db, ILogger<PatientTherapistMigrationService>? logger = null)
    {
        _db = db;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            _logger?.LogInformation("Starting Patient and Therapist ID migration...");

            // Migrate Patients
            await MigrateCollection(
                "fuji36_patients",
                "Patient",
                new[] { ("fuji36_plans", "patientId"), ("fuji36_therapist_patient_relationships", "patientId") },
                cancellationToken);

            // Migrate Therapists
            await MigrateCollection(
                "fuji36_therapists",
                "Therapist",
                new[] { ("fuji36_plans", "therapistId"), ("fuji36_therapist_patient_relationships", "therapistId") },
                cancellationToken);

            // Migrate TherapistPatientRelationships
            await MigrateCollection(
                "fuji36_therapist_patient_relationships",
                "TherapistPatientRelationship",
                Array.Empty<(string, string)>(),
                cancellationToken);

            _logger?.LogInformation("Patient and Therapist ID migration completed.");
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error during Patient and Therapist migration");
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
            string oldId;

            if (idValue.IsObjectId)
            {
                oldId = idValue.AsObjectId.ToString();
            }
            else
            {
                oldId = idValue.ToString();
            }

            // Check if ID is in ObjectId format (24 hex characters)
            if (oldId.Length == 24 && ObjectId.TryParse(oldId, out _))
            {
                var newGuid = Guid.NewGuid().ToString();
                idMapping[oldId] = newGuid;
                var identifier = GetDocumentIdentifier(doc, entityName);
                _logger?.LogInformation($"Will migrate {entityName} {identifier} from ObjectId {oldId} to GUID {newGuid}");
            }
        }

        // Step 2: Migrate IDs
        if (idMapping.Count > 0)
        {
            _logger?.LogInformation($"Starting ID migration for {idMapping.Count} {entityName} documents...");

            foreach (var (oldId, newGuid) in idMapping)
            {
                try
                {
                    // Find document by old ObjectId
                    var filter = Builders<BsonDocument>.Filter.Eq("_id", new ObjectId(oldId));
                    var doc = await collection.Find(filter).FirstOrDefaultAsync(cancellationToken);

                    if (doc == null)
                    {
                        // Try as string if ObjectId filter didn't work
                        filter = Builders<BsonDocument>.Filter.Eq("_id", oldId);
                        doc = await collection.Find(filter).FirstOrDefaultAsync(cancellationToken);
                    }

                    if (doc != null)
                    {
                        var identifier = GetDocumentIdentifier(doc, entityName);

                        // Check if document with new GUID already exists
                        var existingDoc = await collection.Find(
                            Builders<BsonDocument>.Filter.Eq("_id", newGuid)
                        ).FirstOrDefaultAsync(cancellationToken);

                        if (existingDoc != null)
                        {
                            _logger?.LogInformation($"{entityName} {identifier} with GUID {newGuid} already exists, skipping migration");
                            // Still update references
                            foreach (var (refCollection, refField) in referenceCollections)
                            {
                                await UpdateReferencesInCollection(refCollection, refField, oldId, newGuid, cancellationToken);
                            }
                            // Delete old document if it still exists
                            await DeleteOldDocument(collection, oldId, cancellationToken);
                            continue;
                        }

                        // Delete old document FIRST to avoid duplicate key errors
                        var deleted = await DeleteOldDocument(collection, oldId, cancellationToken);

                        if (deleted)
                        {
                            // Create new document with GUID ID
                            var newDoc = doc.DeepClone().AsBsonDocument;
                            newDoc["_id"] = newGuid;

                            // Insert new document
                            await collection.InsertOneAsync(newDoc, cancellationToken: cancellationToken);

                            migrationCount++;
                            _logger?.LogInformation($"Migrated {entityName} {identifier} ID from {oldId} to {newGuid}");

                            // Update all references in other collections
                            foreach (var (refCollection, refField) in referenceCollections)
                            {
                                await UpdateReferencesInCollection(refCollection, refField, oldId, newGuid, cancellationToken);
                            }
                        }
                        else
                        {
                            _logger?.LogWarning($"Could not delete old {entityName} document with ID {oldId}");
                        }
                    }
                    else
                    {
                        _logger?.LogWarning($"Could not find {entityName} document with ID {oldId} for migration");
                    }
                }
                catch (Exception ex)
                {
                    _logger?.LogError(ex, $"Error migrating {entityName} ID from {oldId} to {newGuid}");
                }
            }

            _logger?.LogInformation($"{entityName} ID migration completed. Migrated {migrationCount} documents.");
        }
        else
        {
            _logger?.LogInformation($"No {entityName} documents with ObjectId format found to migrate.");
        }
    }

    private string GetDocumentIdentifier(BsonDocument doc, string entityName)
    {
        return entityName switch
        {
            "Patient" => doc.Contains("userId") ? $"UserId: {doc["userId"]}" : "Unknown",
            "Therapist" => doc.Contains("userId") ? $"UserId: {doc["userId"]}" : "Unknown",
            "TherapistPatientRelationship" => $"TherapistId: {(doc.Contains("therapistId") ? doc["therapistId"].ToString() : "unknown")}, PatientId: {(doc.Contains("patientId") ? doc["patientId"].ToString() : "unknown")}",
            _ => "Unknown"
        };
    }

    private async Task<bool> DeleteOldDocument(
        IMongoCollection<BsonDocument> collection,
        string oldId,
        CancellationToken cancellationToken)
    {
        var deleteFilter = Builders<BsonDocument>.Filter.Eq("_id", new ObjectId(oldId));
        var deleteResult = await collection.DeleteOneAsync(deleteFilter, cancellationToken: cancellationToken);

        if (deleteResult.DeletedCount == 0)
        {
            // Try deleting as string if ObjectId delete didn't work
            deleteFilter = Builders<BsonDocument>.Filter.Eq("_id", oldId);
            deleteResult = await collection.DeleteOneAsync(deleteFilter, cancellationToken: cancellationToken);
        }

        return deleteResult.DeletedCount > 0;
    }

    private async Task UpdateReferencesInCollection(
        string collectionName,
        string fieldName,
        string oldId,
        string newGuid,
        CancellationToken cancellationToken)
    {
        try
        {
            var collection = _db.Db.GetCollection<BsonDocument>(collectionName);
            var updateResult = await collection.UpdateManyAsync(
                Builders<BsonDocument>.Filter.Eq(fieldName, oldId),
                Builders<BsonDocument>.Update.Set(fieldName, newGuid),
                cancellationToken: cancellationToken);

            if (updateResult.ModifiedCount > 0)
            {
                _logger?.LogInformation($"Updated {updateResult.ModifiedCount} references in {collectionName}.{fieldName} from {oldId} to {newGuid}");
            }
        }
        catch (Exception ex)
        {
            // Log but don't fail - collection might not exist yet
            _logger?.LogWarning(ex, $"Could not update references in {collectionName}.{fieldName} (collection may not exist)");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
