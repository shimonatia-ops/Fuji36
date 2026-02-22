
using Fuji36.Analysis.Orchestrator;
using Fuji36.Analysis.Orchestrator.Data;
using Fuji36.Analysis.Orchestrator.Models;
using Fuji36.Analysis.Orchestrator.Services;


var builder = Host.CreateApplicationBuilder(args);

builder.Services.Configure<MongoOptions>(builder.Configuration.GetSection("Mongo"));
builder.Services.Configure<OrchestratorOptions>(builder.Configuration.GetSection("Orchestrator"));

builder.Services.AddSingleton<MongoContext>();
builder.Services.AddHttpClient<PostureScoringClient>();
builder.Services.AddHostedService<Worker>();

var host = builder.Build();
host.Run();
