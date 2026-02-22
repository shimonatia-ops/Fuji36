# API Gateway Dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy common project
COPY ["Fuji36.Common/Fuji36.Common.csproj", "Fuji36.Common/"]
RUN dotnet restore "Fuji36.Common/Fuji36.Common.csproj"

# Copy API Gateway project
COPY ["fuji36-api-gateway/Fuji36-api-gateway.csproj", "fuji36-api-gateway/"]
RUN dotnet restore "fuji36-api-gateway/Fuji36-api-gateway.csproj"

# Copy all source
COPY . .

# Build
WORKDIR "/src/fuji36-api-gateway"
RUN dotnet build "Fuji36-api-gateway.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Fuji36-api-gateway.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app

# Install wget for health checks
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*

COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Fuji36-api-gateway.dll"]
