# Restart Fuji36 Local Development Environment
param(
    [string]$Service = ""
)

Write-Host "Restarting Fuji36 services..." -ForegroundColor Yellow

# Navigate to docker directory
$dockerDir = Join-Path (Split-Path $PSScriptRoot -Parent) "docker"
if (-not (Test-Path $dockerDir)) {
    Write-Host "Error: docker directory not found at $dockerDir" -ForegroundColor Red
    exit 1
}

Set-Location $dockerDir

# Check docker-compose command
try {
    $composeVersion = docker-compose --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        $composeCmd = "docker compose"
    } else {
        $composeCmd = "docker-compose"
    }
} catch {
    $composeCmd = "docker compose"
}

# Restart
if ($Service) {
    Write-Host "Restarting service: $Service" -ForegroundColor Cyan
    if ($composeCmd -eq "docker compose") {
        docker compose restart $Service
    } else {
        docker-compose restart $Service
    }
} else {
    Write-Host "Restarting all services..." -ForegroundColor Cyan
    if ($composeCmd -eq "docker compose") {
        docker compose restart
    } else {
        docker-compose restart
    }
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "Services restarted successfully." -ForegroundColor Green
} else {
    Write-Host "Error: Failed to restart services." -ForegroundColor Red
    exit 1
}
