# Clean up Fuji36 Local Development Environment (removes containers, volumes, and images)
param(
    [switch]$Volumes = $false,
    [switch]$Images = $false
)

Write-Host "Cleaning up Fuji36 Local Development Environment..." -ForegroundColor Yellow

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

# Stop and remove containers
Write-Host "Stopping and removing containers..." -ForegroundColor Yellow
if ($Volumes) {
    if ($composeCmd -eq "docker compose") {
        docker compose down -v
    } else {
        docker-compose down -v
    }
    Write-Host "✓ Removed containers and volumes" -ForegroundColor Green
} else {
    if ($composeCmd -eq "docker compose") {
        docker compose down
    } else {
        docker-compose down
    }
    Write-Host "✓ Removed containers (volumes preserved)" -ForegroundColor Green
}

# Remove images if requested
if ($Images) {
    Write-Host "Removing images..." -ForegroundColor Yellow
    $images = @(
        "fuji36-frontend",
        "fuji36-api-gateway",
        "fuji36-identity",
        "fuji36-planning",
        "fuji36-session",
        "fuji36-analysis"
    )
    
    foreach ($image in $images) {
        $imageId = docker images -q "$image*" 2>&1
        if ($imageId) {
            docker rmi -f $imageId 2>&1 | Out-Null
            Write-Host "  Removed image: $image" -ForegroundColor Gray
        }
    }
    Write-Host "✓ Removed images" -ForegroundColor Green
}

Write-Host ""
Write-Host "Cleanup complete!" -ForegroundColor Green
if (-not $Volumes) {
    Write-Host "Note: MongoDB data volumes were preserved. Use -Volumes to remove them." -ForegroundColor Yellow
}
