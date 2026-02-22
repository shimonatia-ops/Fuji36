using Fuji36.Identity.Data;
using Microsoft.Extensions.Hosting;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Fuji36.Identity.Services;

/// <summary>
/// Migration service to update existing users in MongoDB to match the new UserEntity structure:
/// - Add optional fields (firstName, lastName, userId) if missing
/// - Rename "realId" field to "userId" if it exists
/// - Convert ObjectId format IDs to GUIDs and update all references in other collections
/// WARNING: This will invalidate existing JWT tokens - users will need to re-login
/// </summary>
public sealed class UserMigrationService : IHostedService
{
    private readonly MongoContext _db;
    private readonly ILogger<UserMigrationService>? _logger;

    public UserMigrationService(MongoContext db, ILogger<UserMigrationService>? logger = null)
    {
        _db = db;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            _logger?.LogInformation("Starting user migration...");

            // Use raw MongoDB operations to handle missing fields and field renames
            var usersCollection = _db.Db.GetCollection<BsonDocument>("fuji36_users");
            var allUsers = await usersCollection.Find(_ => true).ToListAsync(cancellationToken);
            
            var fieldUpdateCount = 0;
            var idMigrationCount = 0;
            var idMapping = new Dictionary<string, string>(); // oldId -> newGuid

            // Step 1: Identify users with ObjectId format and create GUID mapping
            foreach (var userDoc in allUsers)
            {
                var idValue = userDoc["_id"];
                string oldId;
                
                // Get the ID as string, handling both ObjectId and string types
                if (idValue.IsObjectId)
                {
                    oldId = idValue.AsObjectId.ToString();
                }
                else
                {
                    oldId = idValue.ToString();
                }
                
                // Check if ID is in ObjectId format (24 hex characters)
                if (oldId.Length == 24 && ObjectId.TryParse(oldId, out var parsedObjectId))
                {
                    var newGuid = Guid.NewGuid().ToString();
                    idMapping[oldId] = newGuid;
                    var email = userDoc.Contains("email") ? userDoc["email"].AsString : "unknown";
                    _logger?.LogInformation($"Will migrate user {email} from ObjectId {oldId} to GUID {newGuid}");
                }
            }

            // Step 2: Migrate field structure (firstName, lastName, userId/realId)
            foreach (var userDoc in allUsers)
            {
                var docUpdate = false;
                var docUpdates = new List<UpdateDefinition<BsonDocument>>();

                // Add firstName if missing
                if (!userDoc.Contains("firstName"))
                {
                    docUpdates.Add(Builders<BsonDocument>.Update.Set("firstName", BsonNull.Value));
                    docUpdate = true;
                }

                // Add lastName if missing
                if (!userDoc.Contains("lastName"))
                {
                    docUpdates.Add(Builders<BsonDocument>.Update.Set("lastName", BsonNull.Value));
                    docUpdate = true;
                }

                // Add userId if missing (but check for realId first)
                if (!userDoc.Contains("userId"))
                {
                    if (userDoc.Contains("realId"))
                    {
                        // Migrate realId to userId
                        var realIdValue = userDoc["realId"];
                        docUpdates.Add(Builders<BsonDocument>.Update
                            .Set("userId", realIdValue)
                            .Unset("realId"));
                        docUpdate = true;
                        var email = userDoc.Contains("email") ? userDoc["email"].AsString : "unknown";
                        _logger?.LogInformation($"Migrated realId to userId for user {email}");
                    }
                    else
                    {
                        // Just add userId as null
                        docUpdates.Add(Builders<BsonDocument>.Update.Set("userId", BsonNull.Value));
                        docUpdate = true;
                    }
                }
                else if (userDoc.Contains("realId"))
                {
                    // userId exists but realId also exists - remove realId
                    docUpdates.Add(Builders<BsonDocument>.Update.Unset("realId"));
                    docUpdate = true;
                    var email = userDoc.Contains("email") ? userDoc["email"].AsString : "unknown";
                    _logger?.LogInformation($"Removed duplicate realId field for user {email}");
                }

                if (docUpdate)
                {
                    var combinedDocUpdate = Builders<BsonDocument>.Update.Combine(docUpdates);
                    await usersCollection.UpdateOneAsync(
                        Builders<BsonDocument>.Filter.Eq("_id", userDoc["_id"]),
                        combinedDocUpdate,
                        cancellationToken: cancellationToken);
                    fieldUpdateCount++;
                }
            }

            // Step 3: Convert ObjectId IDs to GUIDs and update all references
            if (idMapping.Count > 0)
            {
                _logger?.LogInformation($"Starting ID migration for {idMapping.Count} users...");

                foreach (var (oldId, newGuid) in idMapping)
                {
                    try
                    {
                        // Find user document by old ObjectId
                        var filter = Builders<BsonDocument>.Filter.Eq("_id", new ObjectId(oldId));
                        var userDoc = await usersCollection.Find(filter).FirstOrDefaultAsync(cancellationToken);

                        if (userDoc == null)
                        {
                            // Try as string if ObjectId filter didn't work
                            filter = Builders<BsonDocument>.Filter.Eq("_id", oldId);
                            userDoc = await usersCollection.Find(filter).FirstOrDefaultAsync(cancellationToken);
                        }

                        if (userDoc != null)
                        {
                            var email = userDoc.Contains("email") ? userDoc["email"].AsString : "unknown";
                            
                            // Check if document with new GUID already exists (migration might have run before)
                            var existingDoc = await usersCollection.Find(
                                Builders<BsonDocument>.Filter.Eq("_id", newGuid)
                            ).FirstOrDefaultAsync(cancellationToken);
                            
                            if (existingDoc != null)
                            {
                                _logger?.LogInformation($"User {email} with GUID {newGuid} already exists, skipping migration");
                                // Still update references in case they weren't updated
                                await UpdateReferencesInCollection("fuji36_patients", "userId", oldId, newGuid, cancellationToken);
                                await UpdateReferencesInCollection("fuji36_therapists", "userId", oldId, newGuid, cancellationToken);
                                await UpdateReferencesInCollection("fuji36_plans", "patientId", oldId, newGuid, cancellationToken);
                                await UpdateReferencesInCollection("fuji36_plans", "therapistId", oldId, newGuid, cancellationToken);
                                await UpdateReferencesInCollection("fuji36_sessions", "userId", oldId, newGuid, cancellationToken);
                                await UpdateReferencesInCollection("fuji36_session_results", "userId", oldId, newGuid, cancellationToken);
                                
                                // Delete old document if it still exists
                                var deleteFilter = Builders<BsonDocument>.Filter.Eq("_id", new ObjectId(oldId));
                                var deleteResult = await usersCollection.DeleteOneAsync(deleteFilter, cancellationToken: cancellationToken);
                                if (deleteResult.DeletedCount == 0)
                                {
                                    deleteFilter = Builders<BsonDocument>.Filter.Eq("_id", oldId);
                                    await usersCollection.DeleteOneAsync(deleteFilter, cancellationToken: cancellationToken);
                                }
                                continue;
                            }
                            
                            // Delete old document FIRST to avoid duplicate key error
                            var deleteFilterOld = Builders<BsonDocument>.Filter.Eq("_id", new ObjectId(oldId));
                            var deleteResultOld = await usersCollection.DeleteOneAsync(deleteFilterOld, cancellationToken: cancellationToken);
                            
                            if (deleteResultOld.DeletedCount == 0)
                            {
                                // Try deleting as string if ObjectId delete didn't work
                                deleteFilterOld = Builders<BsonDocument>.Filter.Eq("_id", oldId);
                                deleteResultOld = await usersCollection.DeleteOneAsync(deleteFilterOld, cancellationToken: cancellationToken);
                            }
                            
                            if (deleteResultOld.DeletedCount > 0)
                            {
                                // Create a new document with GUID ID
                                var newDoc = userDoc.DeepClone().AsBsonDocument;
                                newDoc["_id"] = newGuid;
                                
                                // Insert new document with GUID ID (old one is already deleted)
                                await usersCollection.InsertOneAsync(newDoc, cancellationToken: cancellationToken);
                                
                                idMigrationCount++;
                                _logger?.LogInformation($"Migrated user {email} ID from {oldId} to {newGuid}");

                                // Update all references in other collections
                                await UpdateReferencesInCollection("fuji36_patients", "userId", oldId, newGuid, cancellationToken);
                                await UpdateReferencesInCollection("fuji36_therapists", "userId", oldId, newGuid, cancellationToken);
                                await UpdateReferencesInCollection("fuji36_plans", "patientId", oldId, newGuid, cancellationToken);
                                await UpdateReferencesInCollection("fuji36_plans", "therapistId", oldId, newGuid, cancellationToken);
                                await UpdateReferencesInCollection("fuji36_sessions", "userId", oldId, newGuid, cancellationToken);
                                await UpdateReferencesInCollection("fuji36_session_results", "userId", oldId, newGuid, cancellationToken);
                            }
                            else
                            {
                                _logger?.LogWarning($"Could not delete old document with ID {oldId} for user {email}");
                            }
                        }
                        else
                        {
                            _logger?.LogWarning($"Could not find user document with ID {oldId} for migration");
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger?.LogError(ex, $"Error migrating user ID from {oldId} to {newGuid}");
                    }
                }

                _logger?.LogInformation($"ID migration completed. Migrated {idMigrationCount} user IDs and updated all references.");
            }

            _logger?.LogInformation($"User migration completed. Updated {fieldUpdateCount} users with new fields, migrated {idMigrationCount} user IDs.");
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error during user migration");
            throw;
        }
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
