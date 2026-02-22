using Fuji36.Session.Data;

var builder = WebApplication.CreateBuilder(args);




builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.Configure<MongoOptions>(builder.Configuration.GetSection("Mongo"));
builder.Services.AddSingleton<MongoContext>();

var app = builder.Build();

app.MapGet("/health", () => Results.Ok(new { status = "ok", service = "Fuji36.Session" }));



app.UseSwagger();
app.UseSwaggerUI();

app.MapControllers();
app.Run();
