using Fuji36.Planning.Models;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace Fuji36.Planning.Data;

public sealed class MongoContext
{
    public IMongoDatabase Db { get; }
    public IMongoCollection<PlanEntity> Plans { get; }
    public IMongoCollection<TaskEntity> Tasks { get; }
    public IMongoCollection<PatientEntity> Patients { get; }
    public IMongoCollection<TherapistEntity> Therapists { get; }
    public IMongoCollection<TherapistPatientRelationship> TherapistPatientRelationships { get; }
    public IMongoCollection<TaskTemplateEntity> TaskTemplates { get; }

    public MongoContext(IOptions<MongoOptions> options)
    {
        var client = new MongoClient(options.Value.ConnectionString);
        Db = client.GetDatabase(options.Value.Database);

        Plans = Db.GetCollection<PlanEntity>("fuji36_plans");
        Tasks = Db.GetCollection<TaskEntity>("fuji36_plan_tasks");
        Patients = Db.GetCollection<PatientEntity>("fuji36_patients");
        Therapists = Db.GetCollection<TherapistEntity>("fuji36_therapists");
        TherapistPatientRelationships = Db.GetCollection<TherapistPatientRelationship>("fuji36_therapist_patient_relationships");
        TaskTemplates = Db.GetCollection<TaskTemplateEntity>("fuji36_task_templates");

        // Plan indexes
        Plans.Indexes.CreateOne(new CreateIndexModel<PlanEntity>(
            Builders<PlanEntity>.IndexKeys.Ascending(x => x.PatientId).Descending(x => x.CreatedAt)));

        Plans.Indexes.CreateOne(new CreateIndexModel<PlanEntity>(
            Builders<PlanEntity>.IndexKeys.Ascending(x => x.TherapistId).Descending(x => x.CreatedAt)));

        // Task indexes
        Tasks.Indexes.CreateOne(new CreateIndexModel<TaskEntity>(
            Builders<TaskEntity>.IndexKeys.Ascending(x => x.PlanId).Ascending(x => x.CreatedAt)));

        // Patient indexes
        Patients.Indexes.CreateOne(new CreateIndexModel<PatientEntity>(
            Builders<PatientEntity>.IndexKeys.Ascending(x => x.UserId),
            new CreateIndexOptions { Unique = true }));

        // Therapist indexes
        Therapists.Indexes.CreateOne(new CreateIndexModel<TherapistEntity>(
            Builders<TherapistEntity>.IndexKeys.Ascending(x => x.UserId),
            new CreateIndexOptions { Unique = true }));

        // Relationship indexes
        TherapistPatientRelationships.Indexes.CreateOne(new CreateIndexModel<TherapistPatientRelationship>(
            Builders<TherapistPatientRelationship>.IndexKeys.Ascending(x => x.TherapistId).Ascending(x => x.PatientId),
            new CreateIndexOptions { Unique = true }));

        TherapistPatientRelationships.Indexes.CreateOne(new CreateIndexModel<TherapistPatientRelationship>(
            Builders<TherapistPatientRelationship>.IndexKeys.Ascending(x => x.PatientId).Ascending(x => x.Status)));

        // TaskTemplate indexes
        TaskTemplates.Indexes.CreateOne(new CreateIndexModel<TaskTemplateEntity>(
            Builders<TaskTemplateEntity>.IndexKeys.Ascending(x => x.TaskType).Ascending(x => x.IsActive)));
    }
}
