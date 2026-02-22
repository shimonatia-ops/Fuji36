using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Fuji36.Planning.Converters;
using Fuji36.Planning.Data;
using Fuji36.Planning.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using PlanningTaskFactory = Fuji36.Planning.Services.TaskFactory;

var builder = WebApplication.CreateBuilder(args);

// Configure HttpClient for Identity service
var identityBaseUrl = builder.Configuration["Services:IdentityBaseUrl"]
                      ?? throw new InvalidOperationException("Missing Services:IdentityBaseUrl");

builder.Services.AddHttpClient("identity", client =>
{
    client.BaseAddress = new Uri(identityBaseUrl);
});

// Configure JSON options to handle Dictionary<string, object> with nested objects
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
    options.SerializerOptions.Converters.Add(new DictionaryStringObjectJsonConverter());
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        options.JsonSerializerOptions.Converters.Add(new DictionaryStringObjectJsonConverter());
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure JWT Authentication
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "fuji36";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "fuji36";
var jwtSigningKey = builder.Configuration["Jwt:SigningKey"] ?? throw new InvalidOperationException("Missing Jwt:SigningKey");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSigningKey)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
        options.MapInboundClaims = false;
    });

builder.Services.AddAuthorization();

builder.Services.Configure<MongoOptions>(builder.Configuration.GetSection("Mongo"));
builder.Services.AddSingleton<MongoContext>();
builder.Services.AddSingleton<ITaskFactory, PlanningTaskFactory>();
builder.Services.AddSingleton<IPlanProgressService, PlanProgressService>();
builder.Services.AddHostedService<PatientTherapistMigrationService>(); // Run migration on startup
builder.Services.AddHostedService<PlanTaskMigrationService>(); // Migrate Plans and Tasks to GUIDs
builder.Services.AddHostedService<TaskTemplateSeedService>(); // Seed task templates on startup

var app = builder.Build();

app.MapGet("/health", () => Results.Ok(new { status = "ok", service = "Fuji36.Planning" }));

app.UseSwagger();
app.UseSwaggerUI();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.Run();
