# Start Fuji36 Local Development Environment
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fuji36 Local Development Environment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to docker directory
$dockerDir = Join-Path (Split-Path $PSScriptRoot -Parent) "docker"
if (-not (Test-Path $dockerDir)) {
    Write-Host "Error: docker directory not found at $dockerDir" -ForegroundColor Red
    exit 1
}

Set-Location $dockerDir

# Check if Docker is running
Write-Host "Checking Docker..." -ForegroundColor Yellow
try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Docker is not running. Please start Docker Desktop." -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Docker is running" -ForegroundColor Green
} catch {
    Write-Host "Error: Docker is not installed or not running." -ForegroundColor Red
    Write-Host "Please install Docker Desktop from https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Check if docker-compose is available
Write-Host "Checking docker-compose..." -ForegroundColor Yellow
try {
    $composeVersion = docker-compose --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "docker-compose is not available. Trying 'docker compose'..." -ForegroundColor Yellow
        $composeVersion = docker compose version 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Error: docker-compose is not available." -ForegroundColor Red
            exit 1
        }
        $composeCmd = "docker compose"
    } else {
        $composeCmd = "docker-compose"
    }
    Write-Host "[OK] docker-compose is available" -ForegroundColor Green
} catch {
    Write-Host "Error: docker-compose is not available." -ForegroundColor Red
    exit 1
}

# Build and start containers
Write-Host ""
Write-Host "Building and starting containers..." -ForegroundColor Yellow
Write-Host "This may take a few minutes on first run..." -ForegroundColor Gray

if ($composeCmd -eq "docker compose") {
    docker compose up -d --build
} else {
    docker-compose up -d --build
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to start containers." -ForegroundColor Red
    exit 1
}

# Wait for services to be ready
Write-Host ""
Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Check service status
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Service Status:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($composeCmd -eq "docker compose") {
    docker compose ps
} else {
    docker-compose ps
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Services are starting up!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Access your services:" -ForegroundColor White
Write-Host "  Frontend:        http://localhost:3000" -ForegroundColor Cyan
Write-Host "  API Gateway:     http://localhost:5000" -ForegroundColor Cyan
Write-Host "  Identity:        http://localhost:5001" -ForegroundColor Cyan
Write-Host "  Planning:        http://localhost:5002" -ForegroundColor Cyan
Write-Host "  Session:         http://localhost:5003" -ForegroundColor Cyan
Write-Host "  Analysis:        http://localhost:5004" -ForegroundColor Cyan
Write-Host "  MongoDB:         localhost:27017" -ForegroundColor Cyan
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor White
Write-Host "  View logs:       .\scripts\logs-dev.ps1" -ForegroundColor Yellow
Write-Host "  View logs (svc): .\scripts\logs-dev.ps1 -Service frontend" -ForegroundColor Yellow
Write-Host "  Stop services:   .\scripts\stop-dev.ps1" -ForegroundColor Yellow
Write-Host "  Restart service: docker-compose restart <service-name>" -ForegroundColor Yellow
Write-Host ""
