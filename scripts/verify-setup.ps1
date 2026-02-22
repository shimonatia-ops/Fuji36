# Verify Fuji36 Local Development Environment Setup
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fuji36 Setup Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Check Docker
Write-Host "Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Docker is installed: $dockerVersion" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Docker is not installed or not in PATH" -ForegroundColor Red
        $allGood = $false
    }
} catch {
    Write-Host "[FAIL] Docker is not installed" -ForegroundColor Red
    Write-Host "  Install from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    $allGood = $false
}

# Check Docker is running
Write-Host "Checking if Docker is running..." -ForegroundColor Yellow
try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Docker is running" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Docker is not running. Please start Docker Desktop." -ForegroundColor Red
        $allGood = $false
    }
} catch {
    Write-Host "[FAIL] Cannot connect to Docker daemon" -ForegroundColor Red
    $allGood = $false
}

# Check docker-compose
Write-Host "Checking docker-compose..." -ForegroundColor Yellow
$composeFound = $false
try {
    $null = docker-compose --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        $composeVersion = docker-compose --version
        Write-Host "[OK] docker-compose is available: $composeVersion" -ForegroundColor Green
        $composeFound = $true
    }
} catch {
    # docker-compose not found, will try docker compose (v2)
}

if (-not $composeFound) {
    try {
        $null = docker compose version 2>&1
        if ($LASTEXITCODE -eq 0) {
            $composeVersion = docker compose version
            Write-Host "[OK] docker compose (v2) is available: $composeVersion" -ForegroundColor Green
            $composeFound = $true
        }
    } catch {
        # docker compose not found either
    }
}

if (-not $composeFound) {
    Write-Host "[FAIL] docker-compose is not available" -ForegroundColor Red
    $allGood = $false
}

# Check required directories
Write-Host "Checking project structure..." -ForegroundColor Yellow
$requiredDirs = @(
    "docker",
    "docker/services",
    "docker/services/frontend",
    "docker/services/api-gateway",
    "docker/services/identity",
    "docker/services/planning",
    "docker/services/session",
    "docker/services/analysis-orchestrator",
    "services/fuji36-services",
    "frontend"
)

foreach ($dir in $requiredDirs) {
    if (Test-Path $dir) {
        Write-Host "[OK] $dir exists" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] $dir is missing" -ForegroundColor Red
        $allGood = $false
    }
}

# Check required files
Write-Host "Checking required files..." -ForegroundColor Yellow
$requiredFiles = @(
    "docker/docker-compose.yml",
    "docker/services/frontend/Dockerfile",
    "docker/services/api-gateway/Dockerfile",
    "docker/services/identity/Dockerfile",
    "docker/services/planning/Dockerfile",
    "docker/services/session/Dockerfile",
    "docker/services/analysis-orchestrator/Dockerfile"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "[OK] $file exists" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] $file is missing" -ForegroundColor Red
        $allGood = $false
    }
}

# Check port availability
Write-Host "Checking port availability..." -ForegroundColor Yellow
$ports = @(3000, 5000, 5001, 5002, 5003, 27017)
foreach ($port in $ports) {
    try {
        $portInUse = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($portInUse) {
            Write-Host "[WARN] Port $port is already in use" -ForegroundColor Yellow
            Write-Host "  You may need to stop the service using this port" -ForegroundColor Gray
        } else {
            Write-Host "[OK] Port $port is available" -ForegroundColor Green
        }
    } catch {
        Write-Host "[WARN] Could not check port $port (may require admin privileges)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "[OK] Setup verification complete!" -ForegroundColor Green
    Write-Host "You can now run: .\scripts\start-dev.ps1" -ForegroundColor Cyan
} else {
    Write-Host "[FAIL] Setup verification found issues" -ForegroundColor Red
    Write-Host "Please fix the issues above before starting services" -ForegroundColor Yellow
}
Write-Host "========================================" -ForegroundColor Cyan
