# Fuji36 Local Development Environment

This guide explains how to run the Fuji36 application locally using Docker Compose.

## Prerequisites

1. **Docker Desktop for Windows**
   - Download from: https://www.docker.com/products/docker-desktop
   - Enable WSL 2 backend (recommended for better performance)
   - Ensure Docker Desktop is running before starting services

2. **PowerShell** (included with Windows)

## Quick Start

### First Time Setup

1. **Start Docker Desktop**
   - Make sure Docker Desktop is running (you'll see the Docker icon in the system tray)

2. **Navigate to project root**
   ```powershell
   cd C:\Shimon\Dana\Fuji36
   ```

3. **Start all services**
   ```powershell
   .\scripts\start-dev.ps1
   ```

4. **Wait for services to start** (first time may take 5-10 minutes to build images)

5. **Access the application**
   - Frontend: http://localhost:3000
   - API Gateway: http://localhost:5000

### Daily Development

**Start services:**
```powershell
.\scripts\start-dev.ps1
```

**View logs:**
```powershell
# All services
.\scripts\logs-dev.ps1

# Specific service
.\scripts\logs-dev.ps1 -Service frontend
.\scripts\logs-dev.ps1 -Service api-gateway
```

**Stop services:**
```powershell
.\scripts\stop-dev.ps1
```

**Restart a service:**
```powershell
.\scripts\restart-dev.ps1 -Service frontend
```

**Clean up (remove containers and volumes):**
```powershell
.\scripts\clean-dev.ps1 -Volumes
```

## Service Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| API Gateway | 5000 | http://localhost:5000 |
| Identity Service | 5001 | http://localhost:5001 |
| Planning Service | 5002 | http://localhost:5002 |
| Session Service | 5003 | http://localhost:5003 |
| Analysis Orchestrator | 5004 | http://localhost:5004 |
| MongoDB | 27017 | localhost:27017 |

## Architecture

```
┌─────────────────────────────────────────┐
│         Docker Network                  │
│                                         │
│  Frontend (3000)                        │
│       ↓                                 │
│  API Gateway (5000)                     │
│       ↓                                 │
│  ┌──────────┬──────────┬──────────┐    │
│  │ Identity │ Planning │ Session  │    │
│  │  (5001)  │  (5002)  │  (5003)  │    │
│  └──────────┴──────────┴──────────┘    │
│       ↓                                 │
│  MongoDB (27017)                        │
└─────────────────────────────────────────┘
```

## Manual Docker Commands

If you prefer to use Docker commands directly:

**Start services:**
```powershell
cd docker
docker-compose up -d
```

**View logs:**
```powershell
docker-compose logs -f
docker-compose logs -f frontend
```

**Stop services:**
```powershell
docker-compose down
```

**Rebuild a service:**
```powershell
docker-compose up -d --build frontend
```

**View running containers:**
```powershell
docker-compose ps
```

## Troubleshooting

### Docker is not running
- Start Docker Desktop
- Wait for it to fully start (whale icon in system tray should be steady)

### Port already in use
If you get an error that a port is already in use:
1. Check what's using the port: `netstat -ano | findstr :3000`
2. Stop the conflicting service or change the port in `docker-compose.yml`

### Services won't start
1. Check Docker logs: `docker-compose logs`
2. Ensure MongoDB is healthy: `docker-compose ps`
3. Try rebuilding: `docker-compose up -d --build`

### MongoDB connection issues
- Wait for MongoDB to be fully ready (health check passes)
- Check MongoDB logs: `docker-compose logs mongodb`
- Verify connection string in service environment variables

### Frontend can't connect to API
- Ensure API Gateway is running: `docker-compose ps api-gateway`
- Check API Gateway logs: `docker-compose logs api-gateway`
- Verify `VITE_API_BASE_URL` in frontend environment

### Need to reset everything
```powershell
# Stop and remove everything including volumes
.\scripts\clean-dev.ps1 -Volumes -Images

# Start fresh
.\scripts\start-dev.ps1
```

## Development Tips

### Hot Reload (Frontend)
For faster frontend development, you can run the frontend outside Docker:
```powershell
cd frontend
npm run dev
```
The frontend will run on http://localhost:5173 (Vite default) and connect to the API Gateway at http://localhost:5000

### Database Access
Connect to MongoDB using any MongoDB client:
- Connection String: `mongodb://localhost:27017`
- Database: `fuji36`

### Viewing Service Logs
Each service logs to stdout. View them with:
```powershell
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f identity-service
```

### Rebuilding After Code Changes
After making code changes, rebuild the affected service:
```powershell
docker-compose up -d --build <service-name>
```

## Environment Variables

Configuration is managed through:
- `docker/.env` - Local environment variables
- `docker-compose.yml` - Service-specific environment variables

Key variables:
- `JWT_SIGNING_KEY` - Secret key for JWT tokens (change in production!)
- `MONGODB_CONNECTION_STRING` - MongoDB connection
- `VITE_API_BASE_URL` - Frontend API endpoint

## Next Steps

Once local development is working:
1. Test all features
2. Verify service communication
3. Check database persistence
4. Prepare for cloud deployment (staging/production)

## Support

For issues or questions:
1. Check service logs
2. Verify Docker is running
3. Ensure all ports are available
4. Review this README
