# RAG Tool Standalone - Product Requirements Prompt (PRP) v4

## 🎯 Mission Statement
Transform the existing tightly-coupled RAG Pipeline sub-module into a production-ready, standalone personal document processing and semantic search system. This system must preserve EXACT functionality while simplifying deployment and adding real-time monitoring capabilities.

## 🚨 Critical Requirements (NON-NEGOTIABLE)

### Algorithm Preservation (PRIORITY 100)
- **NEVER modify text chunking algorithm** - Copy from `text_processor.py` EXACTLY 
- **Chunk size**: MUST remain 400 characters
- **Chunk overlap**: MUST remain 0 (which gives 20% effective overlap)
- **Embedding model**: MUST use text-embedding-3-small with 1536 dimensions
- **File processing**: ALL formats must work identically to current system

### Service Account Authentication (PRIORITY 99)
- **Replace OAuth2** with Google Service Account JSON authentication
- **Enable VPS deployment** without browser interaction
- **Maintain all Google Drive functionality** (file monitoring, processing, cleanup)

### Automatic Trashed File Cleanup (PRIORITY 95)
- **Detect trashed files** in Google Drive automatically
- **Remove ALL database records** for trashed files atomically
- **Real-time notifications** when cleanup occurs

### Single-User Architecture (PRIORITY 90)
- **Remove tenant_id** from ALL database tables
- **Remove users/tenants** tables completely
- **Simplify all queries** to work without multi-tenant complexity

## 📁 Source Code References (CRITICAL)

### Main Repository Location
```
/Users/james/Documents/GitHub/ai-agent-mastery/4_Pydantic_AI_Agent/
```

### CRITICAL FILES TO REFERENCE:
- `RAG_Pipeline/common/text_processor.py` - **COPY EXACTLY** (chunking algorithm)
- `RAG_Pipeline/common/db_handler.py` - Modify for single-user, async for FastAPI
- `RAG_Pipeline/Google_Drive/drive_watcher.py` - Convert to service account
- `sql/documents.sql` - Remove tenant_id, preserve pgvector
- `sql/document_metadata.sql` - Simplify for single user
- `sql/document_rows.sql` - Simplify for single user
- `.env` - Extract all RAG-related variables

## 🏗️ Technical Architecture

### Backend Stack
- **FastAPI** (Python 3.11+) with async/await patterns
- **WebSocket** support for real-time dashboard updates
- **Supabase** PostgreSQL with pgvector extension
- **Service Account** Google Drive integration (NO OAuth2)
- **Docker** containerization

### Frontend Stack  
- **Next.js 14+** with App Router
- **TypeScript** for type safety
- **shadcn/ui** components with Tailwind CSS
- **Real-time WebSocket** integration
- **Responsive design** (mobile-first)

### Database Architecture
- **Supabase PostgreSQL** with pgvector extension
- **Single-user schema** (no tenant_id complexity)
- **1536-dimension vectors** for text-embedding-3-small
- **Optimized indexes** for vector similarity search

## 🎨 UI/UX Requirements

### Dashboard Layout (Single Page)
```
┌─ Header ──────────────────────────────┐
│ RAG Pipeline │ Status │ Settings     │
├─ Quick Actions ──────────────────────┤  
│ [Start] [Stop] [Cleanup] [Test]      │
├─ Status Cards (4-column grid) ───────┤
│ Database │ Drive │ Processing │ Stats │
├─ Activity Feed ──────────────────────┤
│ Real-time processing/cleanup updates │
├─ Log Viewer ─────────────────────────┤
│ Filterable system logs with export   │
└───────────────────────────────────────┘
```

### Design System
- **Primary Color**: Blue (#3b82f6)
- **Success Color**: Green (#10b981)  
- **Error Color**: Red (#ef4444)
- **Warning Color**: Yellow (#f59e0b)
- **Typography**: Inter font family
- **Components**: shadcn/ui base with custom status cards

## 📋 Core Features

### Real-time Dashboard
- **4-column status grid** showing system health
- **WebSocket updates** for live processing status
- **Activity feed** with timestamped events
- **System logs** with filtering capabilities
- **Quick actions** for start/stop/cleanup/test

### Document Processing
- **Preserve exact algorithms** from original system
- **All file formats supported**: PDF, DOCX, TXT, HTML, CSV, XLS, XLSX, PPTX, MD, Google Workspace
- **Automatic file monitoring** via Google Drive API
- **Background processing** with progress updates

### Cleanup Operations
- **Automatic detection** of trashed files in Google Drive
- **Complete database cleanup** (documents + metadata + chunks)
- **Real-time notifications** when files are cleaned
- **Manual cleanup trigger** via dashboard

### Search Functionality
- **Vector similarity search** using pgvector
- **Identical results** to original system
- **Fast response times** with optimized queries

## 🔧 Implementation Plan

### Phase 1: Core Backend (Week 1)
1. **Copy text_processor.py exactly** - NO modifications to chunking
2. **Convert db_handler.py** to async, remove tenant_id
3. **Implement service account auth** for Google Drive
4. **Create FastAPI endpoints** with WebSocket support
5. **Set up Supabase schema** (single-user simplified)

### Phase 2: Frontend Dashboard (Week 1) 
1. **Next.js 14 setup** with TypeScript
2. **shadcn/ui components** implementation
3. **Real-time WebSocket** integration
4. **4-column status grid** as specified
5. **Activity feed and log viewer**

### Phase 3: Integration & Testing (Week 1)
1. **Docker containerization** for both services
2. **End-to-end testing** with real Google Drive
3. **Performance validation** against original system
4. **Documentation and deployment guides**

## 🚀 Deployment Requirements

### Development Deployment
- **docker-compose up** single command
- **Local development** with hot reload
- **Mock data** for testing without Google Drive

### Production Deployment  
- **VPS-friendly** with service account (no browser)
- **SSL termination** with Nginx reverse proxy
- **Resource monitoring** with health checks
- **Log aggregation** and rotation
- **Backup procedures** for database

## 🔒 Security & Configuration

### Environment Variables
```env
# OpenAI (CRITICAL - preserve exact model)
OPENAI_API_KEY=sk-...
EMBEDDING_MODEL_NAME=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536

# Supabase (simplified single-user)
SUPABASE_URL=https://project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# Google Drive (Service Account)
GOOGLE_SERVICE_ACCOUNT_PATH=/app/config/service-account.json
GOOGLE_DRIVE_FOLDER_ID=folder-id
POLLING_INTERVAL=300

# Application
LOG_LEVEL=INFO
CLEANUP_ENABLED=true
MAX_FILE_SIZE_MB=50
```

### Security Measures
- **Service account JSON** never committed to repo
- **Environment variables** for all sensitive data
- **Docker network isolation** between services
- **Health check endpoints** for monitoring
- **Input validation** on all API endpoints

## 🧪 Testing & Validation

### Preservation Validation
- **Side-by-side testing** with current system
- **Identical chunk outputs** verification
- **Same embedding results** confirmation
- **Search quality comparison** metrics

### System Testing
- **End-to-end workflows** from file upload to search
- **Real-time updates** validation via WebSocket
- **Cleanup operations** with trashed files
- **Error handling** and recovery procedures

### Performance Testing
- **Response time** benchmarks
- **Concurrent user** handling
- **Memory usage** monitoring
- **Database query** optimization

## 📊 Success Metrics

### Functional Requirements
- [ ] **Algorithm preservation**: Identical results to original system
- [ ] **Service account auth**: VPS deployment without browser
- [ ] **Trashed file cleanup**: Automatic detection and removal
- [ ] **Real-time updates**: WebSocket dashboard working
- [ ] **All file formats**: Processing with same quality

### User Experience
- [ ] **30-minute setup**: From zero to working system
- [ ] **One-command deployment**: docker-compose up success
- [ ] **Intuitive dashboard**: Non-technical users can operate
- [ ] **Real-time feedback**: Processing status visible

### Technical Performance
- [ ] **Search speed**: <200ms response time
- [ ] **Processing speed**: Same as original system
- [ ] **Resource usage**: Efficient memory/CPU utilization
- [ ] **Error recovery**: Graceful handling of failures

## 🔄 Migration Strategy

### Database Migration
- **Export current data** from multi-tenant system
- **Transform schema** to single-user format
- **Import and validate** all documents and chunks
- **Test search functionality** post-migration

### Configuration Transfer
- **Extract environment variables** from current .env
- **Convert OAuth2 settings** to service account
- **Validate Google Drive access** with new authentication
- **Test all file format processing**

## 📚 Documentation Deliverables

### User Documentation
- **Setup guide**: Step-by-step installation
- **Configuration guide**: Environment variables and service account
- **User manual**: Dashboard operation and troubleshooting
- **Deployment guide**: Production setup with Docker

### Technical Documentation  
- **Architecture overview**: System design and components
- **API documentation**: Endpoint specifications
- **Database schema**: Table structures and relationships
- **Development guide**: Local setup and contribution guidelines

## ⚠️ Critical Constraints

### Preservation Requirements
- **Text processing algorithms CANNOT be modified**
- **Embedding model CANNOT be changed**
- **File format support MUST remain identical**
- **Search quality MUST match exactly**

### Technical Constraints
- **Single-user only** (no multi-tenant features)
- **Service account auth only** (no OAuth2 browser flow)
- **Docker deployment required** (no bare metal instructions)
- **Real-time updates mandatory** (WebSocket integration)

### Timeline Constraints
- **Maximum 3 weeks** for complete implementation
- **Weekly milestones** with functional demos
- **Continuous testing** throughout development
- **Production deployment** by end of timeline

## 🎯 Definition of Done

### System is complete when:
1. **Non-technical user** can complete setup in under 30 minutes
2. **Search results** are identical to original system
3. **VPS deployment** works without browser interaction
4. **Automatic cleanup** removes trashed files correctly
5. **Real-time dashboard** updates smoothly via WebSocket
6. **All file formats** process with original quality
7. **Docker containers** start with single command
8. **Production deployment** guide tested on fresh VPS

---

**This PRP serves as the complete specification for transforming the RAG Pipeline into a standalone product while preserving all critical functionality and adding modern real-time monitoring capabilities.**