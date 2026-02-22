# View logs for Fuji36 services
param(
    [string]$Service = "",
    [switch]$Follow = $true
)

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

# Show logs
if ($Service) {
    Write-Host "Showing logs for service: $Service" -ForegroundColor Cyan
    if ($Follow) {
        if ($composeCmd -eq "docker compose") {
            docker compose logs -f $Service
        } else {
            docker-compose logs -f $Service
        }
    } else {
        if ($composeCmd -eq "docker compose") {
            docker compose logs $Service
        } else {
            docker-compose logs $Service
        }
    }
} else {
    Write-Host "Showing logs for all services (Press Ctrl+C to exit)" -ForegroundColor Cyan
    if ($Follow) {
        if ($composeCmd -eq "docker compose") {
            docker compose logs -f
        } else {
            docker-compose logs -f
        }
    } else {
        if ($composeCmd -eq "docker compose") {
            docker compose logs
        } else {
            docker-compose logs
        }
    }
}
