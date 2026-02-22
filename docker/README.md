# Fuji36 Docker Local Development

This directory contains all Docker configuration files for running Fuji36 locally.

## Quick Start

1. **Verify setup:**
   ```powershell
   .\scripts\verify-setup.ps1
   ```

2. **Start all services:**
   ```powershell
   .\scripts\start-dev.ps1
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - API Gateway: http://localhost:5000

## Directory Structure

```
docker/
├── docker-compose.yml          # Main compose file
├── .env.example                # Environment variables template
├── .dockerignore               # Files to ignore in Docker builds
├── services/
│   ├── frontend/
│   │   ├── Dockerfile
│   │   └── nginx.conf
│   ├── api-gateway/
│   │   └── Dockerfile
│   ├── identity/
│   │   └── Dockerfile
│   ├── planning/
│   │   └── Dockerfile
│   ├── session/
│   │   └── Dockerfile
│   └── analysis-orchestrator/
│       └── Dockerfile
└── README.md                   # This file
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | React application |
| API Gateway | 5000 | Main API entry point |
| Identity | 5001 | Authentication service |
| Planning | 5002 | Planning service |
| Session | 5003 | Session service |
| Analysis Orchestrator | - | Background worker (no HTTP) |
| MongoDB | 27017 | Database |

## Environment Variables

Copy `.env.example` to `.env` and customize as needed:

```powershell
Copy-Item docker\.env.example docker\.env
```

Key variables:
- `JWT_SIGNING_KEY` - Secret for JWT tokens (change in production!)

## Building Images

Images are built automatically when you run `start-dev.ps1`. To rebuild manually:

```powershell
cd docker
docker-compose build
```

To rebuild a specific service:

```powershell
docker-compose build frontend
```

## Troubleshooting

### Port conflicts
If a port is already in use, either:
1. Stop the conflicting service
2. Change the port in `docker-compose.yml`

### Services won't start
1. Check logs: `.\scripts\logs-dev.ps1`
2. Verify Docker is running: `docker info`
3. Rebuild: `docker-compose up -d --build`

### MongoDB connection issues
- Wait for MongoDB to be healthy (check with `docker-compose ps`)
- Verify connection string in service environment variables

## Cleanup

Remove all containers and volumes:
```powershell
.\scripts\clean-dev.ps1 -Volumes
```

Remove containers, volumes, and images:
```powershell
.\scripts\clean-dev.ps1 -Volumes -Images
```

## Next Steps

See `README-DEV.md` in the project root for complete development guide.
