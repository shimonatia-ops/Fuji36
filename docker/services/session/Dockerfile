# Session Service Dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy common project
COPY ["Fuji36.Common/Fuji36.Common.csproj", "Fuji36.Common/"]
RUN dotnet restore "Fuji36.Common/Fuji36.Common.csproj"

# Copy Session project
COPY ["Fuji36.Session/Fuji36.Session.csproj", "Fuji36.Session/"]
RUN dotnet restore "Fuji36.Session/Fuji36.Session.csproj"

# Copy all source
COPY . .

# Build
WORKDIR "/src/Fuji36.Session"
RUN dotnet build "Fuji36.Session.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Fuji36.Session.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app

# Install wget for health checks
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*

COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Fuji36.Session.dll"]
