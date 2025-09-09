# RAG Tool Standalone

**Single-user RAG pipeline with Google Drive integration and real-time monitoring dashboard**

Transform your Google Drive documents into a powerful semantic search system with automatic processing, trashed file cleanup, and real-time WebSocket updates.

## 🎯 Key Features

- **Single-Command Installation**: One command gets you running in minutes
- **Service Account Authentication**: VPS-friendly deployment without browser interaction
- **Exact Algorithm Preservation**: 400-character chunks with text-embedding-3-small (1536 dimensions)  
- **Complete File Format Support**: PDF, DOCX, TXT, HTML, CSV, XLS, XLSX, PPTX, MD, Google Workspace files
- **Real-time Dashboard**: WebSocket-powered monitoring with 4-column status grid
- **Automatic Cleanup**: Detects and removes trashed files from database
- **Interactive Setup**: Guided configuration with real-time validation
- **Clean Installation**: Users get only what they need, no source code clutter

## 🚀 Quick Start (5 Minutes)

### Prerequisites

Before starting, ensure you have:
- **Docker Desktop** installed and running
- **OpenAI API key** ([Get one here](https://platform.openai.com/api-keys))
- **Supabase account** ([Sign up free](https://supabase.com/))
- **Google Service Account JSON** file ([Setup guide below](#google-drive-authentication-setup))

### Installation

```bash
# Single command installation 
curl -fsSL https://raw.githubusercontent.com/stablemischief/RAG-Tool-brAIn/main/install.sh | bash

# Enter the installation directory
cd rag-tool-standalone

# Run interactive setup wizard
./setup.sh
```

**That's it!** The setup wizard will guide you through:
- ✅ OpenAI API key validation
- ✅ Supabase database configuration  
- ✅ Google Drive integration setup
- ✅ Automatic database schema deployment
- ✅ Service health validation
- ✅ Automatic service startup

### Access Your System

After setup completes:
- **Dashboard**: http://localhost:3000
- **API Documentation**: http://localhost:8000/docs  
- **Health Check**: http://localhost:8000/health

## 📋 Google Drive Authentication Setup

### Step 1: Create Google Cloud Project

1. **Go to Google Cloud Console**: [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. **Click "New Project"** (top-left dropdown)
3. **Enter project name**: `RAG-Tool-Drive` (or your preferred name)
4. **Click "Create"** and wait for project creation
5. **Select your new project** from the dropdown

### Step 2: Enable Google Drive API

1. **Navigate to APIs & Services** → **"+ Enable APIs and Services"**
2. **Search for "Google Drive API"**
3. **Click on "Google Drive API"** result
4. **Click "Enable"** button
5. **Wait for API to be enabled** (green checkmark appears)

### Step 3: Create Service Account

**⚠️ Important:** Choose **"Service Account"** (NOT OAuth2 Client ID). Service accounts work headlessly without browser interaction - perfect for VPS deployment!

1. **Go to APIs & Services** → **"Credentials"**
2. **Click "+ Create Credentials"** → **"Service Account"** ⚠️ (NOT "OAuth 2.0 Client ID")
3. **Service Account Details**:
   - **Name**: `rag-tool-service-account`
   - **Service account ID**: Auto-generated (or customize)
   - **Description**: `Service account for RAG Tool Drive access`
4. **Click "Create and Continue"**
5. **Skip role assignment** (click "Continue") - no special roles needed
6. **Skip user access** (click "Done")

**✅ No redirect URIs, authorized domains, or OAuth consent screen needed!**

### Step 4: Create Service Account Key

1. **Find your service account** in the credentials list
2. **Click on the service account name** (blue link)
3. **Go to "Keys" tab** → **"Add Key"** → **"Create new key"**
4. **Select "JSON"** format
5. **Click "Create"**
6. **JSON file downloads automatically** - save it securely!

**📋 The JSON file contains everything needed:**
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "client_email": "rag-tool-service-account@your-project.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  ...
}
```
**📌 You'll need the `client_email` value for sharing your Drive folder!**

### Step 5: Share Your Drive Folder

**For Personal Drive Folders:**

1. **Open Google Drive**: [https://drive.google.com/](https://drive.google.com/)
2. **Navigate to your target folder** (or create one)
3. **Right-click the folder** → **"Share"**
4. **Add the service account email**:
   - **Open your downloaded JSON file** and find: `"client_email": "rag-tool-service-account@your-project.iam.gserviceaccount.com"`
   - **Copy and paste this email** in the share dialog
   - **Set permission to "Viewer"** (sufficient for reading)
   - **⚠️ This is a robot account, not a real person** - it's normal that it looks like a service email
5. **Click "Send"** - no notification needed (the service account won't receive emails)
6. **Copy the folder URL** and extract the folder ID:
   - URL: `https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz`
   - **Folder ID**: `1AbCdEfGhIjKlMnOpQrStUvWxYz` (the part after `/folders/`)

**For Shared Drive (Team Drive) Folders:**

1. **Open the Shared Drive** in Google Drive
2. **Navigate to your target folder** within the Shared Drive
3. **Right-click the folder** → **"Share"**
4. **Add service account email** with "Viewer" permission
5. **Get folder ID** from URL (same process as above)

## 🗄️ Supabase Database Setup

### Create Supabase Project

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

### Get Supabase Credentials

1. **Go to Project Settings** (gear icon) → **"API"**
2. **Copy these values** (you'll need them during setup):
   - **Project URL**: `https://your-project-ref.supabase.co`
   - **Service Role Key**: `eyJ...` (long JWT token - use this one!)

**Note**: The interactive setup wizard will automatically deploy the database schema for you - no manual SQL required!

## 🛠️ What You Need During Setup

When you run `./setup.sh`, have these ready:

### Required Information
1. **OpenAI API Key**: `sk-...`
2. **Supabase Project URL**: `https://your-project.supabase.co`
3. **Supabase Service Role Key**: `eyJ...`
4. **Google Service Account JSON file**: Downloaded and accessible
5. **Google Drive Folder ID**: Extracted from folder URL

### What the Setup Wizard Does

**🔍 Validates Everything:**
- Tests OpenAI API key with real API call
- Verifies Supabase database connection
- Checks if service account JSON is valid
- Extracts service account email automatically
- Provides exact sharing instructions if needed

**🚀 Deploys Automatically:**
- Creates database schema (tables, indexes, functions)
- Sets up environment configuration
- Starts all Docker containers  
- Validates service health
- Opens dashboard when ready

**⚠️ Provides Smart Guidance:**
- Clear error messages with solutions
- Direct links to fix configuration issues
- Real-time validation feedback
- Retry options for failed steps

## 🔧 Directory Structure

After installation, you get a clean user directory:

```
rag-tool-standalone/
├── setup.sh                 # Interactive setup wizard
├── docker-compose.yml       # Container orchestration
├── .env                     # Your configuration (created by setup)
├── config/
│   └── service-account.json # Google service account (you provide)
├── sql/                     # Database setup files
├── logs/                    # Runtime logs  
└── data/                    # Persistent data
```

**No source code clutter** - just what you need to run your RAG system!

## 📊 Using the Dashboard

### Status Grid (4 Cards)
- **Database**: PostgreSQL + pgvector connection status
- **Google Drive**: Service account authentication and folder monitoring
- **Processing**: Active file processing and queue status  
- **Statistics**: Document count, chunks, storage usage

### Real-time Features
- **Activity Feed**: Live updates for file processing
- **Cleanup Notifications**: When trashed files are removed  
- **Error Alerts**: For failed operations
- **WebSocket Connection**: Auto-reconnection and heartbeat monitoring

### Quick Actions
- **Start/Stop**: Control automatic folder monitoring
- **Manual Cleanup**: Remove trashed files from database
- **Test Search**: Verify search functionality
- **View Logs**: Access detailed system logs

## 🔍 Search Integration

### Typing Mind Plugin
Use the included `rag_tool_standalone_FIXED.json` plugin:

```javascript
rag_tool_standalone({
  "query": "project requirements",
  "match_count": 10,
  "include_full_document": false
})
```

### Direct API Usage
```bash
curl -X POST "http://localhost:8000/api/search" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "query=your search terms&limit=10"
```

## 📁 Supported File Types

All file types from the original system are preserved:

- **Documents**: PDF, DOCX, DOC, TXT, HTML, MD
- **Spreadsheets**: CSV, XLSX, XLS  
- **Presentations**: PPTX
- **Google Workspace**: Docs, Sheets, Slides (auto-converted)
- **Images**: PNG, JPG (filename and metadata as searchable content)

## 🚨 Critical Preservation Requirements

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

## 🛠️ Management Commands

```bash
# Start services
docker-compose up -d

# Stop services  
docker-compose down

# View logs
docker-compose logs -f [service-name]

# Restart services
docker-compose restart

# Reconfigure system
./setup.sh
```

## 🚨 Troubleshooting

### Installation Issues

**"Docker not running"**
- Start Docker Desktop and wait for it to initialize
- Check system tray for Docker icon

**"Ports already in use"**
- Stop services using ports 3000, 8000, 6379
- Or modify ports in `docker-compose.yml`

### Setup Wizard Issues

**"OpenAI API key invalid"**
- Verify key starts with `sk-`
- Check key hasn't expired
- Ensure sufficient credits available

**"Supabase connection failed"**  
- Verify Project URL format: `https://project.supabase.co`
- Use Service Role Key (not anon key)
- Check project isn't paused

**"Google Drive access failed"**
- Verify service account JSON file placement
- Check folder is shared with service account email
- Ensure Drive API is enabled

### Runtime Issues

**"No files being processed"**
- Check folder sharing permissions
- Add test file to monitored folder
- View logs: `docker-compose logs backend`

**"Search returns no results"**
- Wait for files to process completely
- Check dashboard shows document count > 0
- Verify database connection in dashboard

## 🎯 Success Checklist

After setup, verify:

- [ ] **Docker containers running** (3 healthy services)
- [ ] **Dashboard accessible** at http://localhost:3000
- [ ] **Database connected** (green status in dashboard)  
- [ ] **Google Drive authenticated** (green status in dashboard)
- [ ] **Files processing** (add test file, watch activity feed)
- [ ] **Search functioning** (try search in dashboard)
- [ ] **Real-time updates working** (WebSocket connection active)

## 🏗️ For Developers

### Development Setup

If you want to modify the RAG Tool source code:

```bash
# Clone the full repository
git clone https://github.com/stablemischief/RAG-Tool-brAIn.git
cd RAG-Tool

# Use development docker-compose (builds from source)
docker-compose -f docker-compose.dev.yml up --build
```

### Building Docker Images

```bash
# Build backend image
docker build -t ragool/rag-tool-backend:latest ./backend

# Build frontend image  
docker build -t ragool/rag-tool-frontend:latest ./frontend

# Push to registry (for distribution)
docker push ragool/rag-tool-backend:latest
docker push ragool/rag-tool-frontend:latest
```

### Repository Structure

- **`install.sh`**: Single-command installer
- **`template/`**: User installation files
- **`backend/`**: FastAPI source code
- **`frontend/`**: Next.js source code
- **`sql/`**: Database schema files

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/stablemischief/RAG-Tool-brAIn/issues)
- **Documentation**: This README + inline help in setup wizard
- **Community**: [GitHub Discussions](https://github.com/stablemischief/RAG-Tool-brAIn/discussions)

## 🎉 Success!

**RAG Tool Standalone** - From Google Drive to semantic search in 5 minutes! 🚀

Your documents are now searchable knowledge. Add files to your Drive folder and watch them get processed automatically. Happy searching! 🔍

---

**Made with ❤️ for seamless document search**