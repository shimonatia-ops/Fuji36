# Planning Service Dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy common project
COPY ["Fuji36.Common/Fuji36.Common.csproj", "Fuji36.Common/"]
RUN dotnet restore "Fuji36.Common/Fuji36.Common.csproj"

# Copy Planning project
COPY ["Fuji36.Planning/Fuji36.Planning.csproj", "Fuji36.Planning/"]
RUN dotnet restore "Fuji36.Planning/Fuji36.Planning.csproj"

# Copy all source
COPY . .

# Build
WORKDIR "/src/Fuji36.Planning"
RUN dotnet build "Fuji36.Planning.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Fuji36.Planning.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app

# Install wget for health checks
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*

COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Fuji36.Planning.dll"]
