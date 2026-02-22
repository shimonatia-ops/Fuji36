using Fuji36.Common.Contracts.Auth;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Fuji36.Common.Contracts.Sessions;
using Fuji36.Common.Contracts.Planning;
using System.Net.Http.Headers;
using System.Security.Claims;



var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

var identityBaseUrl = builder.Configuration["Services:IdentityBaseUrl"]
                      ?? throw new InvalidOperationException("Missing Services:IdentityBaseUrl");

builder.Services.AddHttpClient("identity", client =>
{
    client.BaseAddress = new Uri(identityBaseUrl);
});

var sessionBaseUrl = builder.Configuration["Services:SessionBaseUrl"]
                     ?? throw new InvalidOperationException("Missing Services:SessionBaseUrl");

builder.Services.AddHttpClient("session", client =>
{
    client.BaseAddress = new Uri(sessionBaseUrl);
});

var planningBaseUrl = builder.Configuration["Services:PlanningBaseUrl"]
                     ?? throw new InvalidOperationException("Missing Services:PlanningBaseUrl");

builder.Services.AddHttpClient("planning", client =>
{
    client.BaseAddress = new Uri(planningBaseUrl);
});


var jwtIssuer = builder.Configuration["Jwt:Issuer"]!;
var jwtAudience = builder.Configuration["Jwt:Audience"]!;
var jwtSigningKey = builder.Configuration["Jwt:SigningKey"]!;
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
        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = ctx =>
            {
                Console.WriteLine("JWT auth failed: " + ctx.Exception.Message);
                Console.WriteLine("Exception type: " + ctx.Exception.GetType().Name);
                if (ctx.Exception.InnerException != null)
                {
                    Console.WriteLine("Inner exception: " + ctx.Exception.InnerException.Message);
                }
                return Task.CompletedTask;
            },
            OnChallenge = ctx =>
            {
                Console.WriteLine("JWT challenge triggered. Error: " + ctx.Error);
                Console.WriteLine("Error description: " + ctx.ErrorDescription);
                return Task.CompletedTask;
            },
            OnTokenValidated = ctx =>
            {
                Console.WriteLine("JWT token validated successfully for user: " + ctx.Principal?.Identity?.Name);
                return Task.CompletedTask;
            }
        };
        options.MapInboundClaims = false;
    });
builder.Services.AddAuthorization();

// Configure JSON options to handle enum strings
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        // Allow common development ports for Vite/React
        policy.WithOrigins(
                "http://localhost:5173",
                "http://localhost:3000",
                "http://localhost:5174",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:5174",
                "https://localhost:7000",
                "https://localhost:7001",
                "https://localhost:7002",
                "https://localhost:7003"
              )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});


builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Fuji36 API Gateway",
        Version = "v1"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter: Bearer {your JWT token}"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

static string? GetUserId(HttpContext ctx) =>
    ctx.User.FindFirstValue(ClaimTypes.NameIdentifier) ??
    ctx.User.FindFirstValue("sub");


app.MapGet("/health", () => Results.Ok(new { status = "ok", service = "fuji36-api-gateway" }));

app.MapGet("/api/_debug/common", () =>
{
    var sample = new MeDto("u1", "user@example.com", new[] { "user" });
    return Results.Ok(sample);
});


app.MapPost("/api/auth/login", async (LoginRequestDto req, IHttpClientFactory http) =>
{
    var client = http.CreateClient("identity");

    var resp = await client.PostAsJsonAsync("/auth/login", req);
    if (!resp.IsSuccessStatusCode)
        return Results.StatusCode((int)resp.StatusCode);

    var body = await resp.Content.ReadFromJsonAsync<LoginResponseDto>();
    return Results.Ok(body);
});

app.MapGet("/api/auth/me", [Authorize] async (HttpContext ctx, IHttpClientFactory http) =>
{
    var client = http.CreateClient("identity");

    // forward Authorization header
    var auth = ctx.Request.Headers.Authorization.ToString();
    if (!string.IsNullOrWhiteSpace(auth))
        client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", auth);

    var resp = await client.GetAsync("/auth/me");
    if (!resp.IsSuccessStatusCode)
        return Results.StatusCode((int)resp.StatusCode);

    var body = await resp.Content.ReadFromJsonAsync<MeDto>();
    return Results.Ok(body);
});

app.MapGet("/api/auth/users/{userId}", [Authorize] async (
    string userId,
    HttpContext ctx,
    IHttpClientFactory http) =>
{
    var client = http.CreateClient("identity");

    // forward Authorization header
    var auth = ctx.Request.Headers.Authorization.ToString();
    if (!string.IsNullOrWhiteSpace(auth))
        client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", auth);

    var resp = await client.GetAsync($"/auth/users/{userId}");
    if (!resp.IsSuccessStatusCode)
        return Results.StatusCode((int)resp.StatusCode);

    var body = await resp.Content.ReadFromJsonAsync<MeDto>();
    return Results.Ok(body);
});



app.MapPost("/api/sessions", [Authorize] async (
    CreateSessionRequestDto req,
    HttpContext ctx,
    IHttpClientFactory http) =>
{
    var userId = GetUserId(ctx);
    if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();



    var client = http.CreateClient("session");

    // IMPORTANT: sub may be mapped to NameIdentifier
    //var userId =
    //    ctx.User.FindFirstValue(ClaimTypes.NameIdentifier) ??
    //    ctx.User.FindFirstValue("sub");

    //if (string.IsNullOrWhiteSpace(userId))
    //    return Results.Unauthorized();

    client.DefaultRequestHeaders.Remove("X-User-Id");
    client.DefaultRequestHeaders.TryAddWithoutValidation("X-User-Id", userId);

    var resp = await client.PostAsJsonAsync("/sessions", req);

    var body = await resp.Content.ReadAsStringAsync();
    var contentType = resp.Content.Headers.ContentType?.MediaType ?? "application/json";
    return Results.Content(body, contentType, statusCode: (int)resp.StatusCode);
});


//app.MapPost("/api/sessions", [Authorize] async (
//    CreateSessionRequestDto req,
//    HttpContext ctx,
//    IHttpClientFactory http) =>
//{
//    var client = http.CreateClient("session");

//    // get userId from JWT
//    var userId = ctx.User.FindFirstValue("sub");
//    if (string.IsNullOrWhiteSpace(userId))
//        return Results.Unauthorized();

//    // send userId to Session service
//    client.DefaultRequestHeaders.Remove("X-User-Id");
//    client.DefaultRequestHeaders.TryAddWithoutValidation("X-User-Id", userId);

//    var resp = await client.PostAsJsonAsync("/sessions", req);

//    var body = await resp.Content.ReadAsStringAsync();
//    var contentType = resp.Content.Headers.ContentType?.MediaType ?? "application/json";
//    return Results.Content(body, contentType, statusCode: (int)resp.StatusCode);
//});


//app.MapPost("/api/sessions", [Authorize] async (
//    CreateSessionRequestDto req,
//    ClaimsPrincipal user,
//    IHttpClientFactory http) =>
//{
//    var client = http.CreateClient("session");

//    var userId = user.FindFirstValue("sub");
//    if (string.IsNullOrWhiteSpace(userId))
//        return Results.Unauthorized();

//    client.DefaultRequestHeaders.TryAddWithoutValidation("X-User-Id", userId);

//    var resp = await client.PostAsJsonAsync("/sessions", req);
//    var body = await resp.Content.ReadAsStringAsync();

//    return Results.Content(body, "application/json", statusCode: (int)resp.StatusCode);
//});


//app.MapPost("/api/sessions", [Authorize] async (HttpContext ctx, IHttpClientFactory http) =>
//{
//    var client = http.CreateClient("session");

//    // forward auth header (optional for now)
//    var auth = ctx.Request.Headers.Authorization.ToString();
//    if (!string.IsNullOrWhiteSpace(auth))
//        client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", auth);

//    // forward request body as-is
//    using var content = new StreamContent(ctx.Request.Body);
//    content.Headers.ContentType = new MediaTypeHeaderValue(ctx.Request.ContentType ?? "application/json");

//    var resp = await client.PostAsync("/sessions", content);
//    var body = await resp.Content.ReadAsStringAsync();
//    return Results.Content(body, "application/json", statusCode: (int)resp.StatusCode);

//    //return Results.StatusCode((int)resp.StatusCode, await resp.Content.ReadAsStringAsync());
//});

app.MapGet("/api/sessions/{sessionId}", [Authorize] async (
    string sessionId,
    HttpContext ctx,
    IHttpClientFactory http) =>
{
    var userId = GetUserId(ctx);
    if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

    var client = http.CreateClient("session");
    client.DefaultRequestHeaders.Remove("X-User-Id");
    client.DefaultRequestHeaders.TryAddWithoutValidation("X-User-Id", userId);

    var resp = await client.GetAsync($"/sessions/{sessionId}");
    var body = await resp.Content.ReadAsStringAsync();
    var contentType = resp.Content.Headers.ContentType?.MediaType ?? "application/json";
    return Results.Content(body, contentType, statusCode: (int)resp.StatusCode);
});

var sessions = app.MapGroup("/api/sessions").WithTags("Sessions");

sessions.MapPost("/{sessionId}/landmarks/batch", [Authorize] async (
    string sessionId,
    LandmarkBatchDto batch,
    HttpContext ctx,
    IHttpClientFactory http) =>
{
    var userId = GetUserId(ctx);
    if (string.IsNullOrWhiteSpace(userId))
        return Results.Unauthorized();

    if (!string.Equals(batch.SessionId, sessionId, StringComparison.Ordinal))
        return Results.BadRequest("Body sessionId must match route sessionId");

    var client = http.CreateClient("session");
    client.DefaultRequestHeaders.Remove("X-User-Id");
    client.DefaultRequestHeaders.TryAddWithoutValidation("X-User-Id", userId);

    var resp = await client.PostAsJsonAsync($"/sessions/{sessionId}/landmarks/batch", batch);

    var body = await resp.Content.ReadAsStringAsync();
    var contentType = resp.Content.Headers.ContentType?.MediaType ?? "application/json";
    return Results.Content(body, contentType, statusCode: (int)resp.StatusCode);
}); 


//app.MapPost("/api/sessions/{sessionId}/landmarks/batch", [Authorize] async (
//    string sessionId,
//    HttpContext ctx,
//    IHttpClientFactory http) =>
//{
//    var userId = GetUserId(ctx);
//    if (string.IsNullOrWhiteSpace(userId))
//        return Results.Unauthorized();

//    var client = http.CreateClient("session");
//    client.DefaultRequestHeaders.Remove("X-User-Id");
//    client.DefaultRequestHeaders.TryAddWithoutValidation("X-User-Id", userId);

//    using var content = new StreamContent(ctx.Request.Body);
//    content.Headers.ContentType = new MediaTypeHeaderValue(ctx.Request.ContentType ?? "application/json");

//    var resp = await client.PostAsync($"/sessions/{sessionId}/landmarks/batch", content);

//    var body = await resp.Content.ReadAsStringAsync();
//    var contentType = resp.Content.Headers.ContentType?.MediaType ?? "application/json";
//    return Results.Content(body, contentType, statusCode: (int)resp.StatusCode);
//});



//app.MapPost("/api/sessions/{sessionId}/landmarks/batch", [Authorize] async (
//    string sessionId,
//    HttpContext ctx,
//    IHttpClientFactory http) =>
//{
//    var client = http.CreateClient("session");

//    var auth = ctx.Request.Headers.Authorization.ToString();
//    if (!string.IsNullOrWhiteSpace(auth))
//        client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", auth);

//    using var content = new StreamContent(ctx.Request.Body);
//    content.Headers.ContentType = new MediaTypeHeaderValue(ctx.Request.ContentType ?? "application/json");

//    var resp = await client.PostAsync($"/sessions/{sessionId}/landmarks/batch", content);
//    if (!resp.IsSuccessStatusCode)
//    {
//        var body = await resp.Content.ReadAsStringAsync();
//        return Results.Content(body, "application/json", statusCode: (int)resp.StatusCode);
//    }
//    //return Results.StatusCode((int)resp.StatusCode, await resp.Content.ReadAsStringAsync());

//    return Results.Ok();
//});

app.MapPost("/api/sessions/{sessionId}/finalize", [Authorize] async (
    string sessionId,
    HttpContext ctx,
    IHttpClientFactory http) =>
{
    var userId = GetUserId(ctx);
    if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

    var client = http.CreateClient("session");
    client.DefaultRequestHeaders.Remove("X-User-Id");
    client.DefaultRequestHeaders.TryAddWithoutValidation("X-User-Id", userId);

    var resp = await client.PostAsync($"/sessions/{sessionId}/finalize", new StringContent(""));
    var body = await resp.Content.ReadAsStringAsync();
    var contentType = resp.Content.Headers.ContentType?.MediaType ?? "application/json";
    return Results.Content(body, contentType, statusCode: (int)resp.StatusCode);
});


//app.MapPost("/api/sessions/{sessionId}/finalize", [Authorize] async (
//    string sessionId,
//    HttpContext ctx,
//    IHttpClientFactory http) =>
//{
//    var client = http.CreateClient("session");

//    var auth = ctx.Request.Headers.Authorization.ToString();
//    if (!string.IsNullOrWhiteSpace(auth))
//        client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", auth);

//    // finalize has no body (or could have later), so forward body if exists
//    HttpContent? content = null;
//    if (ctx.Request.ContentLength is > 0)
//    {
//        content = new StreamContent(ctx.Request.Body);
//        content.Headers.ContentType = new MediaTypeHeaderValue(ctx.Request.ContentType ?? "application/json");
//    }
//    else
//    {
//        content = new StringContent("");
//        content.Headers.ContentType = new MediaTypeHeaderValue("application/json");
//    }

//    var resp = await client.PostAsync($"/sessions/{sessionId}/finalize", content);
//    var body = await resp.Content.ReadAsStringAsync();
//    return Results.Content(body, "application/json", statusCode: (int)resp.StatusCode);
//    //return Results.StatusCode((int)resp.StatusCode, await resp.Content.ReadAsStringAsync());
//});


//app.MapGet("/api/sessions/{sessionId}", [Authorize] async (
//    string sessionId,
//    HttpContext ctx,
//    IHttpClientFactory http) =>
//{
//    var client = http.CreateClient("session");

//    var auth = ctx.Request.Headers.Authorization.ToString();
//    if (!string.IsNullOrWhiteSpace(auth))
//        client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", auth);

//    var resp = await client.GetAsync($"/sessions/{sessionId}");
//    var body = await resp.Content.ReadAsStringAsync();
//    return Results.Content(body, "application/json", statusCode: (int)resp.StatusCode);
//    //return Results.StatusCode((int)resp.StatusCode, await resp.Content.ReadAsStringAsync());
//});

// Planning Service Routes
app.MapPost("/api/plans", [Authorize] async (
    CreatePlanRequestDto req,
    HttpContext ctx,
    IHttpClientFactory http) =>
{
    var userId = GetUserId(ctx);
    if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

    var client = http.CreateClient("planning");
    client.DefaultRequestHeaders.Remove("X-User-Id");
    client.DefaultRequestHeaders.TryAddWithoutValidation("X-User-Id", userId);

    var auth = ctx.Request.Headers.Authorization.ToString();
    if (!string.IsNullOrWhiteSpace(auth))
        client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", auth);

    var resp = await client.PostAsJsonAsync("/plans", req);
    var body = await resp.Content.ReadAsStringAsync();
    var contentType = resp.Content.Headers.ContentType?.MediaType ?? "application/json";
    return Results.Content(body, contentType, statusCode: (int)resp.StatusCode);
});

app.MapGet("/api/plans/{planId}", [Authorize] async (
    string planId,
    HttpContext ctx,
    IHttpClientFactory http) =>
{
    var userId = GetUserId(ctx);
    if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

    var client = http.CreateClient("planning");
    client.DefaultRequestHeaders.Remove("X-User-Id");
    client.DefaultRequestHeaders.TryAddWithoutValidation("X-User-Id", userId);

    var auth = ctx.Request.Headers.Authorization.ToString();
    if (!string.IsNullOrWhiteSpace(auth))
        client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", auth);

    var resp = await client.GetAsync($"/plans/{planId}");
    var body = await resp.Content.ReadAsStringAsync();
    var contentType = resp.Content.Headers.ContentType?.MediaType ?? "application/json";
    return Results.Content(body, contentType, statusCode: (int)resp.StatusCode);
});

app.MapGet("/api/plans/patient/{patientId}", [Authorize] async (
    string patientId,
    HttpContext ctx,
    IHttpClientFactory http) =>
{
    var userId = GetUserId(ctx);
    if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

    var client = http.CreateClient("planning");
    client.DefaultRequestHeaders.Remove("X-User-Id");
    client.DefaultRequestHeaders.TryAddWithoutValidation("X-User-Id", userId);

    var auth = ctx.Request.Headers.Authorization.ToString();
    if (!string.IsNullOrWhiteSpace(auth))
        client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", auth);

    var resp = await client.GetAsync($"/plans/patient/{patientId}");
    var body = await resp.Content.ReadAsStringAsync();
    var contentType = resp.Content.Headers.ContentType?.MediaType ?? "application/json";
    return Results.Content(body, contentType, statusCode: (int)resp.StatusCode);
});

app.MapPatch("/api/plans/{planId}/tasks/{taskId}/status", [Authorize] async (
    string planId,
    string taskId,
    UpdateTaskStatusRequestDto req,
    HttpContext ctx,
    IHttpClientFactory http) =>
{
    var userId = GetUserId(ctx);
    if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

    var client = http.CreateClient("planning");
    client.DefaultRequestHeaders.Remove("X-User-Id");
    client.DefaultRequestHeaders.TryAddWithoutValidation("X-User-Id", userId);

    var auth = ctx.Request.Headers.Authorization.ToString();
    if (!string.IsNullOrWhiteSpace(auth))
        client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", auth);

    var resp = await client.PatchAsJsonAsync($"/plans/{planId}/tasks/{taskId}/status", req);
    var body = await resp.Content.ReadAsStringAsync();
    var contentType = resp.Content.Headers.ContentType?.MediaType ?? "application/json";
    return Results.Content(body, contentType, statusCode: (int)resp.StatusCode);
});

app.MapPost("/api/plans/{planId}/tasks", [Authorize] async (
    string planId,
    CreateTaskRequestDto req,
    HttpContext ctx,
    IHttpClientFactory http) =>
{
    var userId = GetUserId(ctx);
    if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

    var client = http.CreateClient("planning");
    client.DefaultRequestHeaders.Remove("X-User-Id");
    client.DefaultRequestHeaders.TryAddWithoutValidation("X-User-Id", userId);

    var auth = ctx.Request.Headers.Authorization.ToString();
    if (!string.IsNullOrWhiteSpace(auth))
        client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", auth);

    var resp = await client.PostAsJsonAsync($"/plans/{planId}/tasks", req);
    var body = await resp.Content.ReadAsStringAsync();
    var contentType = resp.Content.Headers.ContentType?.MediaType ?? "application/json";
    return Results.Content(body, contentType, statusCode: (int)resp.StatusCode);
});

app.MapDelete("/api/plans/{planId}/tasks/{taskId}", [Authorize] async (
    string planId,
    string taskId,
    HttpContext ctx,
    IHttpClientFactory http) =>
{
    var userId = GetUserId(ctx);
    if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

    var client = http.CreateClient("planning");
    client.DefaultRequestHeaders.Remove("X-User-Id");
    client.DefaultRequestHeaders.TryAddWithoutValidation("X-User-Id", userId);

    var auth = ctx.Request.Headers.Authorization.ToString();
    if (!string.IsNullOrWhiteSpace(auth))
        client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", auth);

    var resp = await client.DeleteAsync($"/plans/{planId}/tasks/{taskId}");
    var body = await resp.Content.ReadAsStringAsync();
    var contentType = resp.Content.Headers.ContentType?.MediaType ?? "application/json";
    return Results.Content(body, contentType, statusCode: (int)resp.StatusCode);
});

// Patient Routes
app.MapPost("/api/patients", [Authorize] async (
    CreatePatientRequestDto req,
    HttpContext ctx,
    IHttpClientFactory http) =>
{
    var userId = GetUserId(ctx);
    if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

    var client = http.CreateClient("planning");
    client.DefaultRequestHeaders.Remove("X-User-Id");
    client.DefaultRequestHeaders.TryAddWithoutValidation("X-User-Id", userId);

    var auth = ctx.Request.Headers.Authorization.ToString();
    if (!string.IsNullOrWhiteSpace(auth))
        client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", auth);

    var resp = await client.PostAsJsonAsync("/patients", req);
    var body = await resp.Content.ReadAsStringAsync();
    var contentType = resp.Content.Headers.ContentType?.MediaType ?? "application/json";
    return Results.Content(body, contentType, statusCode: (int)resp.StatusCode);
});

// More specific route must come before generic route
app.MapGet("/api/patients/user/{userId}", [Authorize] async (
    string userId,
    HttpContext ctx,
    IHttpClientFactory http) =>
{
    var currentUserId = GetUserId(ctx);
    if (string.IsNullOrWhiteSpace(currentUserId)) return Results.Unauthorized();

    var client = http.CreateClient("planning");
    client.DefaultRequestHeaders.Remove("X-User-Id");
    client.DefaultRequestHeaders.TryAddWithoutValidation("X-User-Id", currentUserId);

    var auth = ctx.Request.Headers.Authorization.ToString();
    if (!string.IsNullOrWhiteSpace(auth))
        client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", auth);

    var resp = await client.GetAsync($"/patients/user/{userId}");
    var body = await resp.Content.ReadAsStringAsync();
    var contentType = resp.Content.Headers.ContentType?.MediaType ?? "application/json";
    return Results.Content(body, contentType, statusCode: (int)resp.StatusCode);
});

app.MapGet("/api/patients/{patientId}", [Authorize] async (
    string patientId,
    HttpContext ctx,
    IHttpClientFactory http) =>
{
    var userId = GetUserId(ctx);
    if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

    var client = http.CreateClient("planning");
    client.DefaultRequestHeaders.Remove("X-User-Id");
    client.DefaultRequestHeaders.TryAddWithoutValidation("X-User-Id", userId);

    var auth = ctx.Request.Headers.Authorization.ToString();
    if (!string.IsNullOrWhiteSpace(auth))
        client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", auth);

    var resp = await client.GetAsync($"/patients/{patientId}");
    var body = await resp.Content.ReadAsStringAsync();
    var contentType = resp.Content.Headers.ContentType?.MediaType ?? "application/json";
    return Results.Content(body, contentType, statusCode: (int)resp.StatusCode);
});

app.MapGet("/api/patients", [Authorize] async (
    HttpContext ctx,
    IHttpClientFactory http) =>
{
    var userId = GetUserId(ctx);
    if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

    var client = http.CreateClient("planning");
    client.DefaultRequestHeaders.Remove("X-User-Id");
    client.DefaultRequestHeaders.TryAddWithoutValidation("X-User-Id", userId);

    var auth = ctx.Request.Headers.Authorization.ToString();
    if (!string.IsNullOrWhiteSpace(auth))
        client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", auth);

    var resp = await client.GetAsync("/patients");
    var body = await resp.Content.ReadAsStringAsync();
    var contentType = resp.Content.Headers.ContentType?.MediaType ?? "application/json";
    return Results.Content(body, contentType, statusCode: (int)resp.StatusCode);
});

// Therapist Routes
app.MapPost("/api/therapists", [Authorize] async (
    CreateTherapistRequestDto req,
    HttpContext ctx,
    IHttpClientFactory http) =>
{
    var userId = GetUserId(ctx);
    if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

    var client = http.CreateClient("planning");
    client.DefaultRequestHeaders.Remove("X-User-Id");
    client.DefaultRequestHeaders.TryAddWithoutValidation("X-User-Id", userId);

    var auth = ctx.Request.Headers.Authorization.ToString();
    if (!string.IsNullOrWhiteSpace(auth))
        client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", auth);

    var resp = await client.PostAsJsonAsync("/therapists", req);
    var body = await resp.Content.ReadAsStringAsync();
    var contentType = resp.Content.Headers.ContentType?.MediaType ?? "application/json";
    return Results.Content(body, contentType, statusCode: (int)resp.StatusCode);
});

app.MapGet("/api/therapists/{therapistId}", [Authorize] async (
    string therapistId,
    HttpContext ctx,
    IHttpClientFactory http) =>
{
    var userId = GetUserId(ctx);
    if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

    var client = http.CreateClient("planning");
    client.DefaultRequestHeaders.Remove("X-User-Id");
    client.DefaultRequestHeaders.TryAddWithoutValidation("X-User-Id", userId);

    var auth = ctx.Request.Headers.Authorization.ToString();
    if (!string.IsNullOrWhiteSpace(auth))
        client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", auth);

    var resp = await client.GetAsync($"/therapists/{therapistId}");
    var body = await resp.Content.ReadAsStringAsync();
    var contentType = resp.Content.Headers.ContentType?.MediaType ?? "application/json";
    return Results.Content(body, contentType, statusCode: (int)resp.StatusCode);
});

app.MapGet("/api/therapists/user/{userId}", [Authorize] async (
    string userId,
    HttpContext ctx,
    IHttpClientFactory http) =>
{
    var currentUserId = GetUserId(ctx);
    if (string.IsNullOrWhiteSpace(currentUserId)) return Results.Unauthorized();

    var client = http.CreateClient("planning");
    client.DefaultRequestHeaders.Remove("X-User-Id");
    client.DefaultRequestHeaders.TryAddWithoutValidation("X-User-Id", currentUserId);

    var auth = ctx.Request.Headers.Authorization.ToString();
    if (!string.IsNullOrWhiteSpace(auth))
        client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", auth);

    var resp = await client.GetAsync($"/therapists/user/{userId}");
    var body = await resp.Content.ReadAsStringAsync();
    var contentType = resp.Content.Headers.ContentType?.MediaType ?? "application/json";
    return Results.Content(body, contentType, statusCode: (int)resp.StatusCode);
});

app.MapGet("/api/therapists/{therapistId}/patients", [Authorize] async (
    string therapistId,
    HttpContext ctx,
    IHttpClientFactory http) =>
{
    var userId = GetUserId(ctx);
    if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

    var client = http.CreateClient("planning");
    client.DefaultRequestHeaders.Remove("X-User-Id");
    client.DefaultRequestHeaders.TryAddWithoutValidation("X-User-Id", userId);

    var auth = ctx.Request.Headers.Authorization.ToString();
    if (!string.IsNullOrWhiteSpace(auth))
        client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", auth);

    var resp = await client.GetAsync($"/therapists/{therapistId}/patients");
    var body = await resp.Content.ReadAsStringAsync();
    var contentType = resp.Content.Headers.ContentType?.MediaType ?? "application/json";
    return Results.Content(body, contentType, statusCode: (int)resp.StatusCode);
});

app.MapGet("/api/therapists/with-patients", [Authorize] async (
    HttpContext ctx,
    IHttpClientFactory http) =>
{
    var userId = GetUserId(ctx);
    if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

    var client = http.CreateClient("planning");
    client.DefaultRequestHeaders.Remove("X-User-Id");
    client.DefaultRequestHeaders.TryAddWithoutValidation("X-User-Id", userId);

    var auth = ctx.Request.Headers.Authorization.ToString();
    if (!string.IsNullOrWhiteSpace(auth))
        client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", auth);

    var resp = await client.GetAsync("/therapists/with-patients");
    var body = await resp.Content.ReadAsStringAsync();
    var contentType = resp.Content.Headers.ContentType?.MediaType ?? "application/json";
    return Results.Content(body, contentType, statusCode: (int)resp.StatusCode);
});

// Therapist-Patient Relationship Routes
app.MapPost("/api/therapist-patient-relationships", [Authorize] async (
    AssignPatientToTherapistRequestDto req,
    HttpContext ctx,
    IHttpClientFactory http) =>
{
    var userId = GetUserId(ctx);
    if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

    var client = http.CreateClient("planning");
    client.DefaultRequestHeaders.Remove("X-User-Id");
    client.DefaultRequestHeaders.TryAddWithoutValidation("X-User-Id", userId);

    var auth = ctx.Request.Headers.Authorization.ToString();
    if (!string.IsNullOrWhiteSpace(auth))
        client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", auth);

    var resp = await client.PostAsJsonAsync("/therapist-patient-relationships", req);
    var body = await resp.Content.ReadAsStringAsync();
    var contentType = resp.Content.Headers.ContentType?.MediaType ?? "application/json";
    return Results.Content(body, contentType, statusCode: (int)resp.StatusCode);
});

app.MapDelete("/api/therapist-patient-relationships/{therapistId}/{patientId}", [Authorize] async (
    string therapistId,
    string patientId,
    HttpContext ctx,
    IHttpClientFactory http) =>
{
    var userId = GetUserId(ctx);
    if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

    var client = http.CreateClient("planning");
    client.DefaultRequestHeaders.Remove("X-User-Id");
    client.DefaultRequestHeaders.TryAddWithoutValidation("X-User-Id", userId);

    var auth = ctx.Request.Headers.Authorization.ToString();
    if (!string.IsNullOrWhiteSpace(auth))
        client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", auth);

    var resp = await client.DeleteAsync($"/therapist-patient-relationships/{therapistId}/{patientId}");
    var body = await resp.Content.ReadAsStringAsync();
    var contentType = resp.Content.Headers.ContentType?.MediaType ?? "application/json";
    return Results.Content(body, contentType, statusCode: (int)resp.StatusCode);
});

// Task Template Routes
var taskTemplates = app.MapGroup("/api/task-templates").WithTags("Task Templates");

taskTemplates.MapGet("/", [Authorize] async (
    HttpContext ctx,
    IHttpClientFactory http,
    [FromQuery] string? taskType = null,
    [FromQuery] bool? isActive = null) =>
{
    var userId = GetUserId(ctx);
    if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

    var client = http.CreateClient("planning");
    client.DefaultRequestHeaders.Remove("X-User-Id");
    client.DefaultRequestHeaders.TryAddWithoutValidation("X-User-Id", userId);

    var auth = ctx.Request.Headers.Authorization.ToString();
    if (!string.IsNullOrWhiteSpace(auth))
        client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", auth);

    var queryParams = new List<string>();
    if (!string.IsNullOrWhiteSpace(taskType))
        queryParams.Add($"taskType={Uri.EscapeDataString(taskType)}");
    if (isActive.HasValue)
        queryParams.Add($"isActive={isActive.Value}");

    var queryString = queryParams.Count > 0 ? "?" + string.Join("&", queryParams) : "";
    var resp = await client.GetAsync($"/task-templates{queryString}");
    var body = await resp.Content.ReadAsStringAsync();
    var contentType = resp.Content.Headers.ContentType?.MediaType ?? "application/json";
    return Results.Content(body, contentType, statusCode: (int)resp.StatusCode);
});

taskTemplates.MapGet("/{templateId}", [Authorize] async (
    string templateId,
    HttpContext ctx,
    IHttpClientFactory http) =>
{
    var userId = GetUserId(ctx);
    if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

    var client = http.CreateClient("planning");
    client.DefaultRequestHeaders.Remove("X-User-Id");
    client.DefaultRequestHeaders.TryAddWithoutValidation("X-User-Id", userId);

    var auth = ctx.Request.Headers.Authorization.ToString();
    if (!string.IsNullOrWhiteSpace(auth))
        client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", auth);

    var resp = await client.GetAsync($"/task-templates/{templateId}");
    var body = await resp.Content.ReadAsStringAsync();
    var contentType = resp.Content.Headers.ContentType?.MediaType ?? "application/json";
    return Results.Content(body, contentType, statusCode: (int)resp.StatusCode);
});

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
// Only redirect to HTTPS in production
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
