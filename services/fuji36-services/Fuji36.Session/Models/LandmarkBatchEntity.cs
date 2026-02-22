using Fuji36.Common.Contracts.Sessions;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Fuji36.Session.Models;

public sealed class LandmarkBatchEntity
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = default!;

    [BsonElement("sessionId")]
    public string SessionId { get; set; } = default!;

    [BsonElement("batchId")]
    public string BatchId { get; set; } = default!;

    [BsonElement("sampleFps")]
    public int SampleFps { get; set; }

    [BsonElement("frames")]
    public List<LandmarkFrameDto> Frames { get; set; } = new();

    [BsonElement("createdAt")]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
