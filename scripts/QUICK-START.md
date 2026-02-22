# Quick Start Guide - Fuji36 Local Development

## First Time Setup (5 minutes)

1. **Install Docker Desktop**
   - Download: https://www.docker.com/products/docker-desktop
   - Install and start Docker Desktop
   - Wait for Docker to be fully running (whale icon in system tray)

2. **Verify Setup**
   ```powershell
   .\scripts\verify-setup.ps1
   ```

3. **Start Services**
   ```powershell
   .\scripts\start-dev.ps1
   ```
   - First run will take 5-10 minutes (building images)
   - Subsequent runs are faster (~1-2 minutes)

4. **Access Application**
   - Open browser: http://localhost:3000
   - API: http://localhost:5000

## Daily Commands

| Action | Command |
|--------|---------|
| Start all services | `.\scripts\start-dev.ps1` |
| Stop all services | `.\scripts\stop-dev.ps1` |
| View logs | `.\scripts\logs-dev.ps1` |
| View specific service logs | `.\scripts\logs-dev.ps1 -Service frontend` |
| Restart a service | `.\scripts\restart-dev.ps1 -Service frontend` |
| Clean everything | `.\scripts\clean-dev.ps1 -Volumes` |

## Service URLs

- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:5000
- **Identity Service**: http://localhost:5001
- **Planning Service**: http://localhost:5002
- **Session Service**: http://localhost:5003
- **MongoDB**: localhost:27017

## Troubleshooting

**Docker not running?**
- Start Docker Desktop
- Wait for it to fully start

**Port already in use?**
- Check: `netstat -ano | findstr :3000`
- Stop conflicting service or change port in `docker-compose.yml`

**Services won't start?**
- Check logs: `.\scripts\logs-dev.ps1`
- Rebuild: `cd docker && docker-compose up -d --build`

**Need to reset everything?**
```powershell
.\scripts\clean-dev.ps1 -Volumes
.\scripts\start-dev.ps1
```

## Next Steps

- Read full guide: `README-DEV.md`
- Check service status: `docker-compose ps` (in docker directory)
- View service logs: `.\scripts\logs-dev.ps1`
