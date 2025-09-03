# RAG Tool Standalone - Docker Desktop Setup Guide

## 🚀 Quick Start (Fresh Supabase + Docker Desktop)

This guide will get you running in **under 10 minutes** with Docker Desktop and a fresh Supabase project.

### Prerequisites

1. **Docker Desktop** installed and running
2. **Fresh Supabase project** (with NO tables built)
3. **Google Service Account JSON** file  
4. **OpenAI API key**

### Step 1: Database Setup (2 minutes)

1. **Open Supabase SQL Editor** for your fresh project
2. **Copy and paste** the contents of `sql/00_setup_all.sql` 
3. **Click Run** - this will create all tables, indexes, and functions
4. **Verify setup** - you should see success messages and health check results

### Step 2: Configuration (3 minutes)

1. **Copy environment template**:
   ```bash
   cp .env.example .env
   ```

2. **Edit .env file** with your values:
   ```env
   # OpenAI
   OPENAI_API_KEY=sk-your-key-here
   
   # Supabase (from project settings)
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   
   # Google Drive
   GOOGLE_DRIVE_FOLDER_ID=your-folder-id-here
   ```

3. **Place Service Account JSON**:
   ```bash
   mkdir -p config
   cp /path/to/your/service-account.json config/service-account.json
   ```

### Step 3: Launch (1 minute)

```bash
# Build and start all services
docker-compose up --build

# Or run in background
docker-compose up --build -d
```

### Step 4: Verify (1 minute)

1. **Backend Health**: http://localhost:8000/health
2. **Frontend Dashboard**: http://localhost:3000  
3. **API Documentation**: http://localhost:8000/docs

### Step 5: Test (3 minutes)

1. **Check Dashboard** - should show "Database: Connected" and "Google Drive: Connected"
2. **Monitor Google Drive** - the tool will start processing files automatically
3. **Test Search** - use the Typing Mind plugin or API directly

## 🛠️ Docker Desktop Management

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Restart Services
```bash
# Restart everything
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Stop Services
```bash
# Stop all
docker-compose down

# Stop and remove volumes (fresh start)
docker-compose down -v
```

### Rebuild After Changes
```bash
# Rebuild and restart
docker-compose up --build

# Force rebuild specific service
docker-compose build --no-cache backend
```

## 📊 Monitoring in Docker Desktop

1. **Open Docker Desktop**
2. **Navigate to Containers**
3. **Find "rag-tool" containers**
4. **Click on each service** to view:
   - Real-time logs
   - Resource usage
   - Port mappings
   - Volume mounts

## 🔧 Service Details

### Backend Container
- **Port**: 8000
- **Health Check**: `/health` endpoint
- **Logs**: `./logs/` volume mount
- **Config**: `./config/` volume mount

### Frontend Container  
- **Port**: 3000
- **Health Check**: Next.js health endpoint
- **Environment**: Points to backend at localhost:8000

### Redis Container
- **Port**: 6379  
- **Purpose**: Caching and session management
- **Data**: Persistent volume `redis-data`

## 🚨 Troubleshooting

### Container Won't Start
```bash
# Check logs for errors
docker-compose logs backend

# Common issues:
# - Missing service account file
# - Invalid environment variables  
# - Port already in use
```

### Database Connection Failed
```bash
# Verify Supabase credentials
curl -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
     "$SUPABASE_URL/rest/v1/documents?limit=1"

# Check if database was set up
# Run sql/00_setup_all.sql again in Supabase
```

### Google Drive Not Connecting
```bash
# Verify service account file exists
ls -la config/service-account.json

# Check permissions in Google Cloud Console
# Ensure service account has Drive API access
```

### Port Conflicts
```bash
# Change ports in docker-compose.yml if needed
ports:
  - "8080:8000"  # Backend on 8080 instead
  - "3001:3000"  # Frontend on 3001 instead
```

## 🔄 Development Mode

For development with hot reload:

1. **Modify docker-compose.yml** to mount source code:
   ```yaml
   volumes:
     - ./backend:/app
     - ./frontend:/app
   ```

2. **Use development commands** in containers:
   ```bash
   # Backend: uvicorn with reload
   # Frontend: next dev
   ```

## 📦 Production Deployment

For production (VPS/cloud):

1. **Set NODE_ENV=production** in .env
2. **Use production builds** (already configured)
3. **Set up reverse proxy** (nginx/traefik)
4. **Configure HTTPS** with SSL certificates
5. **Set up monitoring** (health checks, logs)

## 💾 Data Persistence

Data is persisted in Docker volumes:
- **redis-data**: Redis cache and sessions
- **logs**: Application logs  
- **config**: Service account and configuration files

To backup/restore data:
```bash
# Backup
docker run --rm -v rag-tool_redis-data:/data -v $(pwd):/backup alpine tar czf /backup/redis-backup.tar.gz /data

# Restore  
docker run --rm -v rag-tool_redis-data:/data -v $(pwd):/backup alpine tar xzf /backup/redis-backup.tar.gz
```

## 🎯 Success Indicators

✅ **All containers running** (green in Docker Desktop)  
✅ **Health checks passing** (3/3 healthy)  
✅ **Frontend accessible** at http://localhost:3000  
✅ **Backend API responding** at http://localhost:8000/health  
✅ **Database connected** (dashboard shows green status)  
✅ **Google Drive monitoring** (files being processed)  
✅ **Search working** (test with sample query)

---

**Setup Time**: ~10 minutes  
**Dependencies**: Docker Desktop, Supabase, Google Service Account  
**Support**: Check logs in Docker Desktop or `docker-compose logs`