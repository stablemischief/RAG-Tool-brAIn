# RAG Tool Standalone

**Single-user RAG pipeline with Google Drive integration and real-time monitoring dashboard**

Transform your Google Drive documents into a powerful semantic search system with automatic processing, trashed file cleanup, and real-time WebSocket updates.

## 🎯 Key Features

- **Service Account Authentication**: VPS-friendly deployment without browser interaction
- **Exact Algorithm Preservation**: 400-character chunks with text-embedding-3-small (1536 dimensions)  
- **Complete File Format Support**: PDF, DOCX, TXT, HTML, CSV, XLS, XLSX, PPTX, MD, Google Workspace files
- **Real-time Dashboard**: WebSocket-powered monitoring with 4-column status grid
- **Automatic Cleanup**: Detects and removes trashed files from database
- **Single-User Simplified**: No multi-tenant complexity, optimized for personal use
- **One-Command Deployment**: `docker-compose up --build` gets everything running

## 🚀 Complete Setup Guide (Step-by-Step)

### Prerequisites (What You Need)

Before starting, ensure you have:
- **Docker Desktop** installed and running ([Download here](https://www.docker.com/products/docker-desktop/))
- **Google account** with access to Google Drive  
- **Supabase account** ([Sign up free](https://supabase.com/))
- **OpenAI API key** ([Get one here](https://platform.openai.com/api-keys))

### Step 1: Create Test Project Folder (Recommended)

For clean testing, create a separate folder:

```bash
# Create test folder
mkdir ~/RAG-Tool-Test
cd ~/RAG-Tool-Test

# Copy necessary files from main repo
cp -r /path/to/RAG-Tool/* .

# Or start fresh and copy only essential files:
mkdir -p config sql backend frontend
```

### Step 2: Google Drive Setup (DETAILED)

#### 2.1: Create Google Cloud Project

1. **Go to Google Cloud Console**: [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. **Click "New Project"** (top-left dropdown)
3. **Enter project name**: `RAG-Tool-Drive` (or your preferred name)
4. **Click "Create"** and wait for project creation
5. **Select your new project** from the dropdown

#### 2.2: Enable Google Drive API

1. **Navigate to APIs & Services** > **"+ Enable APIs and Services"**
2. **Search for "Google Drive API"**
3. **Click on "Google Drive API"** result
4. **Click "Enable"** button
5. **Wait for API to be enabled** (green checkmark appears)

#### 2.3: Create Service Account

1. **Go to APIs & Services** > **"Credentials"**
2. **Click "+ Create Credentials"** > **"Service Account"**
3. **Service Account Details**:
   - **Name**: `rag-tool-service-account`
   - **Service account ID**: Auto-generated (or customize)
   - **Description**: `Service account for RAG Tool Drive access`
4. **Click "Create and Continue"**
5. **Grant Service Account Access** (Skip this step - click "Continue")
6. **Grant Users Access** (Skip this step - click "Done")

#### 2.4: Create Service Account Key

1. **Find your service account** in the credentials list
2. **Click on the service account name** (blue link)
3. **Go to "Keys" tab** > **"Add Key"** > **"Create new key"**
4. **Select "JSON"** format
5. **Click "Create"**
6. **JSON file downloads automatically** - save it securely!

#### 2.5: Set Up Google Drive Access

**For Personal Drive Folders:**

1. **Open Google Drive**: [https://drive.google.com/](https://drive.google.com/)
2. **Navigate to your target folder** (or create one)
3. **Right-click the folder** > **"Share"**
4. **Add the service account email**:
   - Find email in your downloaded JSON file: `"client_email": "rag-tool-service-account@your-project.iam.gserviceaccount.com"`
   - **Paste this email** in the share dialog
   - **Set permission to "Viewer"** (sufficient for reading)
5. **Click "Send"** - no notification needed
6. **Copy the folder URL** and extract the folder ID:
   - URL: `https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz`
   - **Folder ID**: `1AbCdEfGhIjKlMnOpQrStUvWxYz` (the part after `/folders/`)

**For Shared Drive (Team Drive) Folders:**

1. **Open the Shared Drive** in Google Drive
2. **Navigate to your target folder** within the Shared Drive
3. **Right-click the folder** > **"Share"**
4. **Add service account email** with "Viewer" permission
5. **Get folder ID** from URL (same process as above)

**Alternative: Get Folder ID Programmatically**

```bash
# Install Google Drive CLI (optional)
pip install google-api-python-client

# Or simply copy from browser URL when viewing the folder
```

### Step 3: Supabase Database Setup

#### 3.1: Create Supabase Project

1. **Go to Supabase**: [https://supabase.com/](https://supabase.com/)
2. **Sign up/Login** with your account
3. **Click "New Project"**
4. **Choose your organization** (create one if needed)
5. **Project settings**:
   - **Name**: `rag-tool-standalone`
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your location
6. **Click "Create new project"**
7. **Wait 2-3 minutes** for database provisioning

#### 3.2: Get Supabase Credentials

1. **Go to Project Settings** (gear icon) > **"API"**
2. **Copy these values**:
   - **Project URL**: `https://your-project-ref.supabase.co`
   - **Service Role Key**: `eyJ...` (long JWT token - use this one!)

#### 3.3: Set Up Database Schema

1. **Go to SQL Editor** in Supabase dashboard
2. **Copy contents of `sql/00_setup_all.sql`** from this project
3. **Paste into SQL Editor**
4. **Click "Run"** (bottom-right)
5. **Verify success**: Should see messages like "Extensions enabled", "Tables created", etc.

### Step 4: Project Configuration

#### 4.1: Place Service Account File

```bash
# Create config directory
mkdir -p config

# Copy your downloaded service account JSON file
cp ~/Downloads/your-service-account-key.json config/service-account.json

# Verify file exists and has correct permissions
ls -la config/service-account.json
```

#### 4.2: Create Environment File

```bash
# Copy template
cp .env.example .env

# Edit with your actual values
nano .env  # or use any text editor
```

Fill in your `.env` file:

```env
# OpenAI Configuration (CRITICAL - DO NOT CHANGE MODEL)
OPENAI_API_KEY=sk-your-openai-key-here

# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_KEY=eyJ...your-service-role-key...

# Google Drive Service Account
GOOGLE_SERVICE_ACCOUNT_PATH=./config/service-account.json
GOOGLE_DRIVE_FOLDER_ID=1AbCdEfGhIjKlMnOpQrStUvWxYz

# Application Settings (these are fine as defaults)
POLLING_INTERVAL=300
LOG_LEVEL=INFO
CLEANUP_ENABLED=true
MAX_FILE_SIZE_MB=50
```

### Step 5: Docker Desktop Setup

#### 5.1: Verify Docker Installation

```bash
# Check Docker is running
docker --version
docker-compose --version

# Should show versions like:
# Docker version 24.x.x
# docker-compose version 2.x.x
```

If not installed:
1. **Download Docker Desktop**: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
2. **Install and start** Docker Desktop
3. **Verify it's running** (Docker icon in system tray)

#### 5.2: Build and Start Services

```bash
# Build all containers (first time will take 5-10 minutes)
docker-compose up --build

# Or run in background (detached mode)
docker-compose up --build -d

# View logs if running in background
docker-compose logs -f
```

**What happens during build:**
- Downloads Python and Node.js base images
- Installs all dependencies 
- Sets up networking between services
- Starts backend (port 8000), frontend (port 3000), and Redis

### Step 6: Verify Setup

#### 6.1: Check Services

Open these URLs in your browser:

1. **Backend Health**: [http://localhost:8000/health](http://localhost:8000/health)
   - Should show: `{"status": "healthy", "database": "connected", "google_drive": "connected"}`

2. **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
   - Should show: 4-column status grid with green indicators

3. **API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - Should show: Interactive FastAPI documentation

#### 6.2: Test Google Drive Connection

1. **Add a test file** to your monitored Google Drive folder
2. **Check dashboard** - should show processing activity
3. **Verify in logs**:
   ```bash
   docker-compose logs backend | grep "Processing file"
   ```

#### 6.3: Test Search Functionality

Use the Typing Mind plugin or test directly:

```bash
# Test search endpoint
curl -X POST "http://localhost:8000/api/search" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "query=test&limit=5"
```

### Step 7: Using Docker Desktop Interface

#### 7.1: Monitor in Docker Desktop

1. **Open Docker Desktop application**
2. **Go to "Containers" tab**
3. **Find "rag-tool" containers**:
   - `rag-tool-backend` (FastAPI server)
   - `rag-tool-frontend` (Next.js dashboard) 
   - `rag-tool-redis` (Redis cache)

#### 7.2: View Logs in Docker Desktop

1. **Click on any container name**
2. **Go to "Logs" tab** 
3. **See real-time logs** with color coding
4. **Use search** to filter specific messages

#### 7.3: Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend

# Stop everything
docker-compose down

# Start again (with rebuilding if code changed)
docker-compose up --build
```

## 🛠️ Troubleshooting Guide

### Common Issues and Solutions

#### Issue: "Service account authentication failed"

**Symptoms**: Backend logs show Google Drive connection errors

**Solutions**:
1. **Verify service account file**:
   ```bash
   # Check file exists and isn't empty
   ls -la config/service-account.json
   cat config/service-account.json | head -3
   ```

2. **Check Drive API is enabled**:
   - Go to Google Cloud Console > APIs & Services > Library
   - Search "Google Drive API" - should show "Enabled"

3. **Verify folder sharing**:
   - Open your Google Drive folder
   - Click "Share" - service account email should be listed
   - If not, re-add with "Viewer" permission

#### Issue: "Database connection failed"

**Symptoms**: Dashboard shows red database status

**Solutions**:
1. **Verify Supabase credentials**:
   ```bash
   # Test connection manually
   curl -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
        "$SUPABASE_URL/rest/v1/documents?limit=1"
   ```

2. **Check database setup**:
   - Go to Supabase SQL Editor
   - Run: `SELECT * FROM documents LIMIT 1;`
   - Should not error (even if empty)

3. **Verify pgvector extension**:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'vector';
   ```

#### Issue: "Docker containers won't start"

**Symptoms**: `docker-compose up` fails or containers exit immediately

**Solutions**:
1. **Check port conflicts**:
   ```bash
   # See what's using port 8000 or 3000
   lsof -i :8000
   lsof -i :3000
   ```

2. **View detailed logs**:
   ```bash
   docker-compose logs --no-log-prefix
   ```

3. **Rebuild from scratch**:
   ```bash
   docker-compose down -v
   docker system prune -f
   docker-compose up --build
   ```

#### Issue: "No files being processed"

**Symptoms**: Files in Drive folder but nothing in dashboard

**Solutions**:
1. **Check folder permissions**:
   - Ensure service account has access
   - Try adding a simple .txt file to test

2. **Verify folder ID**:
   ```bash
   # Check logs for Drive API calls
   docker-compose logs backend | grep -i "drive\|folder"
   ```

3. **Test manual processing trigger**:
   - Use dashboard "Start Processing" button
   - Check if files appear in activity feed

### Docker Desktop Specific Issues

#### Issue: "Docker Desktop not starting"

1. **Restart Docker Desktop application**
2. **Check system resources** (need ~4GB RAM available)  
3. **Reset Docker Desktop** (Settings > Reset to factory defaults)

#### Issue: "Containers showing as unhealthy"

1. **Check health check endpoints**:
   - Backend: `curl http://localhost:8000/health`
   - Frontend: `curl http://localhost:3000`

2. **Increase health check timeout** in `docker-compose.yml`:
   ```yaml
   healthcheck:
     timeout: 30s  # Increase from 10s
     start_period: 60s  # Increase from 40s
   ```

### Getting Help

#### Debug Information to Collect

When reporting issues, include:

1. **System information**:
   ```bash
   docker --version
   docker-compose --version
   uname -a  # or Get-ComputerInfo on Windows
   ```

2. **Service logs**:
   ```bash
   docker-compose logs backend > backend.log
   docker-compose logs frontend > frontend.log
   ```

3. **Environment check**:
   ```bash
   # Don't share actual keys, but verify format
   echo "OPENAI_API_KEY length: ${#OPENAI_API_KEY}"
   echo "SUPABASE_URL: $SUPABASE_URL"
   ```

4. **Health check results**:
   ```bash
   curl http://localhost:8000/health
   ```

## 📁 Supported File Types

All file types from the original system are preserved:

- **Documents**: PDF, DOCX, DOC, TXT, HTML, MD
- **Spreadsheets**: CSV, XLSX, XLS  
- **Presentations**: PPTX
- **Google Workspace**: Docs, Sheets, Slides (auto-converted to standard formats)
- **Images**: PNG, JPG (filename and metadata as searchable content)

## 🔍 Using the System

### Dashboard Features

#### Status Grid (4 Cards)
- **Database**: PostgreSQL + pgvector connection status
- **Google Drive**: Service account authentication and folder monitoring
- **Processing**: Active file processing and queue status  
- **Statistics**: Document count, chunks, storage usage

#### Activity Feed
- **Real-time updates** for file processing
- **Cleanup notifications** when trashed files are removed  
- **Error alerts** for failed operations
- **WebSocket connection status**

#### Quick Actions
- **Start/Stop**: Control automatic folder monitoring
- **Manual Cleanup**: Remove trashed files from database
- **Test Search**: Verify search functionality
- **View Logs**: Access detailed system logs

### Search Integration

#### Typing Mind Plugin
Use the included `rag_tool_standalone_FIXED.json` plugin:

```javascript
rag_tool_standalone({
  "query": "project requirements",
  "match_count": 10,
  "include_full_document": false
})
```

#### Direct API Usage
```bash
curl -X POST "http://localhost:8000/api/search" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "query=your search terms&limit=10"
```

## 🚨 Critical Preservation Requirements

### Never Change These Settings

The system preserves **EXACT** algorithms from the original implementation:

```env
# Text Processing (CRITICAL - NEVER MODIFY)
DEFAULT_CHUNK_SIZE=400
DEFAULT_CHUNK_OVERLAP=80
EMBEDDING_MODEL_NAME=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
```

**Why this matters:**
- Changing chunk size affects search quality
- Different embedding models break existing vectors  
- Overlap calculation is precisely tuned
- Any changes require complete re-indexing

### File Processing Pipeline

1. **Document Detection**: Google Drive API monitors folder
2. **Content Extraction**: Format-specific parsers (PDF, DOCX, etc.)
3. **Image Filtering**: Removes base64 data to prevent vector corruption
4. **Text Chunking**: 400 characters with 80-character overlap (20%)
5. **Embedding Generation**: OpenAI text-embedding-3-small
6. **Vector Storage**: PostgreSQL with pgvector indexing
7. **Cleanup Monitoring**: Automatic removal of trashed files

## 🎯 Success Checklist

After completing setup, verify:

- [ ] **Docker containers running** (3 healthy services in Docker Desktop)
- [ ] **Database connected** (green status in dashboard)  
- [ ] **Google Drive authenticated** (service account access working)
- [ ] **Files processing** (add test file, see it in dashboard)
- [ ] **Search functioning** (test with API or plugin)
- [ ] **Real-time updates** (WebSocket connection active)
- [ ] **Cleanup working** (trash a file, verify removal from database)

## 📞 Support and Next Steps

### For Testing
- **Create test folder**: Recommended for clean testing environment
- **Use small files first**: Start with simple .txt files before complex documents  
- **Monitor dashboard**: Watch real-time processing to understand the flow
- **Test search immediately**: Verify end-to-end functionality

### For Production
- **Set up HTTPS**: Use reverse proxy with SSL certificates
- **Configure monitoring**: Add Prometheus/Grafana for metrics
- **Set up backups**: Regular Supabase database backups
- **Scale resources**: Adjust Docker memory/CPU limits as needed

---

**RAG Tool Standalone** - From Google Drive to semantic search in 30 minutes! 🚀