# Analysis Orchestrator Service Dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy common project
COPY ["Fuji36.Common/Fuji36.Common.csproj", "Fuji36.Common/"]
RUN dotnet restore "Fuji36.Common/Fuji36.Common.csproj"

# Copy Analysis Orchestrator project
COPY ["Fuji36.Analysis.Orchestrator/Fuji36.Analysis.Orchestrator.csproj", "Fuji36.Analysis.Orchestrator/"]
RUN dotnet restore "Fuji36.Analysis.Orchestrator/Fuji36.Analysis.Orchestrator.csproj"

# Copy all source
COPY . .

# Build
WORKDIR "/src/Fuji36.Analysis.Orchestrator"
RUN dotnet build "Fuji36.Analysis.Orchestrator.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Fuji36.Analysis.Orchestrator.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app

# Install procps for pgrep (health check)
RUN apt-get update && apt-get install -y procps && rm -rf /var/lib/apt/lists/*

COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Fuji36.Analysis.Orchestrator.dll"]
