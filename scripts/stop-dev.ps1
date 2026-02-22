# Stop Fuji36 Local Development Environment
Write-Host "Stopping Fuji36 Local Development Environment..." -ForegroundColor Yellow

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

# Stop containers
if ($composeCmd -eq "docker compose") {
    docker compose down
} else {
    docker-compose down
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "Services stopped successfully." -ForegroundColor Green
} else {
    Write-Host "Error: Failed to stop services." -ForegroundColor Red
    exit 1
}
