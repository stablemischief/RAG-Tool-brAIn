# RAG Tool Standalone - Product Requirements Prompt (PRP) v4.0

## 🎯 Mission Statement
Transform the existing tightly-coupled RAG Pipeline sub-module into a production-ready, standalone personal document processing and semantic search system. This system must preserve EXACT functionality while simplifying deployment and adding real-time monitoring capabilities.

## 📅 Context
- **Date**: 2025-09-02  
- **Version**: 4.0 (Enhanced from v3 with code examples and implementation details)
- **Author**: Sarah (Product Owner)
- **Status**: Approved for Implementation

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
```yaml
text_processor: /RAG_Pipeline/common/text_processor.py  # COPY EXACTLY
db_handler: /RAG_Pipeline/common/db_handler.py  # Modify for single-user, async
drive_watcher: /RAG_Pipeline/Google_Drive/drive_watcher.py  # Convert to service account
documents_sql: /sql/documents.sql  # Remove tenant_id
metadata_sql: /sql/document_metadata.sql  # Simplify
rows_sql: /sql/document_rows.sql  # Simplify
working_plugin: /RAG_Pipeline/enhanced_kb_search_corrected.json  # Adapt endpoints
env_config: /.env  # Extract RAG variables
```

## 💻 Critical Code Examples

### 1. Text Processor - PRESERVE EXACTLY (Priority 100)

**CRITICAL**: Copy these functions from `text_processor.py` EXACTLY - NO MODIFICATIONS

```python
def chunk_text(text: str, chunk_size: int = 400, overlap: int = 0) -> List[str]:
    """
    Chunk text into smaller pieces with optional overlap.
    
    Args:
        text: The text to chunk
        chunk_size: The size of each chunk in characters (MUST BE 400)
        overlap: The number of characters to overlap between chunks (MUST BE 0)
        
    Returns:
        List of text chunks
    """
    # Sanitize the text first
    text = sanitize_text(text)
    
    if not text:
        return []
    
    chunks = []
    start = 0
    text_length = len(text)
    
    while start < text_length:
        end = min(start + chunk_size, text_length)
        chunk = text[start:end]
        chunks.append(chunk)
        start = end - overlap if overlap > 0 else end
    
    return chunks

def create_embeddings(texts: List[str]) -> List[List[float]]:
    """Create embeddings using text-embedding-3-small EXACTLY"""
    if not texts:
        return []
    
    sanitized_texts = [sanitize_text(text) for text in texts]
    sanitized_texts = [text for text in sanitized_texts if text]
    
    if not sanitized_texts:
        return []
    
    client = get_openai_client()
    response = client.embeddings.create(
        model="text-embedding-3-small",  # NEVER CHANGE THIS
        input=sanitized_texts
    )
    
    return [item.embedding for item in response.data]
```

### 2. Service Account Authentication (Priority 99)

```python
# backend/core/google_drive.py
from google.oauth2 import service_account
from googleapiclient.discovery import build
import os

class ServiceAccountDriveService:
    def __init__(self):
        self.service = self._authenticate()
    
    def _authenticate(self):
        """Authenticate using service account - NO BROWSER REQUIRED"""
        service_account_path = os.getenv("GOOGLE_SERVICE_ACCOUNT_PATH")
        if not service_account_path:
            raise ValueError("GOOGLE_SERVICE_ACCOUNT_PATH not configured")
        
        credentials = service_account.Credentials.from_service_account_file(
            service_account_path,
            scopes=['https://www.googleapis.com/auth/drive.readonly']
        )
        
        return build('drive', 'v3', credentials=credentials)
    
    def list_files(self, folder_id: str) -> List[Dict]:
        """List files in folder without OAuth2"""
        results = self.service.files().list(
            q=f"'{folder_id}' in parents",
            fields="files(id, name, mimeType, modifiedTime, trashed)"
        ).execute()
        return results.get('files', [])
    
    def detect_trashed(self, folder_id: str) -> List[str]:
        """Find trashed files for cleanup"""
        results = self.service.files().list(
            q=f"'{folder_id}' in parents and trashed=true",
            fields="files(id, name)"
        ).execute()
        return [f['id'] for f in results.get('files', [])]
```

### 3. Trashed File Cleanup (Priority 95)

```python
# backend/core/cleanup_service.py
from typing import List, Dict
import asyncio
from datetime import datetime

class TrashCleanupService:
    def __init__(self, drive_service, db_handler):
        self.drive = drive_service
        self.db = db_handler
    
    async def cleanup_trashed_files(self, folder_id: str) -> Dict:
        """Complete cleanup of trashed files from database"""
        # Detect trashed files
        trashed_ids = self.drive.detect_trashed(folder_id)
        
        if not trashed_ids:
            return {"cleaned": 0, "errors": []}
        
        # Atomic cleanup across all tables
        async with self.db.begin_transaction() as tx:
            try:
                # Delete from documents table
                await tx.execute(
                    "DELETE FROM documents WHERE metadata->>'file_id' = ANY($1)",
                    trashed_ids
                )
                
                # Delete from document_metadata
                await tx.execute(
                    "DELETE FROM document_metadata WHERE id = ANY($1)",
                    trashed_ids
                )
                
                # Delete from document_rows
                await tx.execute(
                    "DELETE FROM document_rows WHERE dataset_id = ANY($1)",
                    trashed_ids
                )
                
                await tx.commit()
                
                return {
                    "cleaned": len(trashed_ids),
                    "files": trashed_ids,
                    "timestamp": datetime.now().isoformat(),
                    "errors": []
                }
            except Exception as e:
                await tx.rollback()
                return {
                    "cleaned": 0,
                    "errors": [str(e)]
                }
```

### 4. Single-User Database Schema (Priority 90)

```sql
-- sql/single_user_schema.sql
-- SINGLE-USER SIMPLIFIED SCHEMA - NO TENANT_ID

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table (simplified)
CREATE TABLE IF NOT EXISTS documents (
  id bigserial PRIMARY KEY,
  content text NOT NULL,
  metadata jsonb NOT NULL,
  embedding vector(1536) NOT NULL  -- MUST BE 1536 for text-embedding-3-small
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS documents_metadata_idx ON documents USING gin (metadata);
CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents USING ivfflat (embedding vector_cosine_ops);

-- Document metadata table (simplified)
CREATE TABLE IF NOT EXISTS document_metadata (
    id TEXT PRIMARY KEY,  -- file_id from Google Drive
    title TEXT NOT NULL,
    url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    schema TEXT
);

-- Document rows table (simplified)
CREATE TABLE IF NOT EXISTS document_rows (
    id SERIAL PRIMARY KEY,
    dataset_id TEXT REFERENCES document_metadata(id) ON DELETE CASCADE,
    row_data JSONB NOT NULL
);

-- Search function (PRESERVE EXACTLY)
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  filter jsonb DEFAULT '{}'
) RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE metadata @> filter
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### 5. WebSocket Real-time Updates (Priority 85)

```python
# backend/api/websocket.py
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json

class WebSocketManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.subscriptions: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        # Send initial status
        await self.send_personal(websocket, {
            "type": "connected",
            "data": {"message": "WebSocket connected"}
        })
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        for channel in self.subscriptions.values():
            channel.discard(websocket)
    
    async def broadcast_cleanup(self, cleanup_result: Dict):
        """Broadcast cleanup results to all clients"""
        message = {
            "type": "cleanup_complete",
            "data": {
                "cleaned": cleanup_result["cleaned"],
                "timestamp": cleanup_result["timestamp"]
            }
        }
        await self.broadcast(message, "cleanup")
    
    async def broadcast_processing(self, file_name: str, progress: int):
        """Broadcast processing progress"""
        message = {
            "type": "processing_progress",
            "data": {
                "file": file_name,
                "progress": progress,
                "status": "embedding" if progress > 50 else "extracting"
            }
        }
        await self.broadcast(message, "processing")
    
    async def broadcast(self, message: Dict, channel: str = "all"):
        """Send message to all subscribers of a channel"""
        dead_connections = set()
        
        subscribers = self.subscriptions.get(channel, self.active_connections)
        for connection in subscribers:
            try:
                await connection.send_json(message)
            except:
                dead_connections.add(connection)
        
        # Clean up dead connections
        for conn in dead_connections:
            self.disconnect(conn)
    
    async def send_personal(self, websocket: WebSocket, message: Dict):
        """Send message to specific client"""
        try:
            await websocket.send_json(message)
        except:
            self.disconnect(websocket)

# Usage in FastAPI
manager = WebSocketManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            # Handle client messages (subscriptions, etc.)
            if data["type"] == "subscribe":
                channel = data.get("channel", "all")
                if channel not in manager.subscriptions:
                    manager.subscriptions[channel] = set()
                manager.subscriptions[channel].add(websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
```

### 6. FastAPI Main Application (Priority 70)

```python
# backend/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio

# Lifecycle management
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    app.state.drive_service = ServiceAccountDriveService()
    app.state.db_handler = AsyncDatabaseHandler()
    app.state.cleanup_service = TrashCleanupService(
        app.state.drive_service,
        app.state.db_handler
    )
    app.state.monitor_task = asyncio.create_task(monitor_loop(app))
    yield
    # Shutdown
    app.state.monitor_task.cancel()

app = FastAPI(
    title="RAG Tool Standalone",
    version="1.0.0",
    lifespan=lifespan
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Status endpoint
@app.get("/api/status")
async def get_status():
    return {
        "database": await check_database(),
        "google_drive": await check_drive(),
        "processing": app.state.get("processing_active", False),
        "monitoring": app.state.get("monitoring_enabled", False)
    }

# Cleanup endpoints
@app.post("/api/cleanup")
async def trigger_cleanup():
    """Manual cleanup trigger"""
    folder_id = os.getenv("GOOGLE_DRIVE_FOLDER_ID")
    result = await app.state.cleanup_service.cleanup_trashed_files(folder_id)
    
    # Broadcast via WebSocket
    await manager.broadcast_cleanup(result)
    
    return result

@app.get("/api/cleanup/stats")
async def get_cleanup_stats():
    """Get cleanup statistics"""
    # Read from JSON log file
    with open("logs/cleanup_stats.json", "r") as f:
        stats = json.load(f)
    return stats

# Monitoring control
@app.post("/api/start")
async def start_monitoring():
    app.state["monitoring_enabled"] = True
    await manager.broadcast({
        "type": "monitoring_started",
        "data": {"message": "File monitoring started"}
    })
    return {"status": "started"}

@app.post("/api/stop")
async def stop_monitoring():
    app.state["monitoring_enabled"] = False
    await manager.broadcast({
        "type": "monitoring_stopped", 
        "data": {"message": "File monitoring stopped"}
    })
    return {"status": "stopped"}

# Background monitoring loop
async def monitor_loop(app):
    """Background task for file monitoring and cleanup"""
    while True:
        try:
            if app.state.get("monitoring_enabled", False):
                folder_id = os.getenv("GOOGLE_DRIVE_FOLDER_ID")
                
                # Check for new/modified files
                await process_new_files(app, folder_id)
                
                # Check for trashed files
                cleanup_result = await app.state.cleanup_service.cleanup_trashed_files(folder_id)
                if cleanup_result["cleaned"] > 0:
                    await manager.broadcast_cleanup(cleanup_result)
            
            # Wait for polling interval
            await asyncio.sleep(int(os.getenv("POLLING_INTERVAL", 300)))
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"Monitor loop error: {e}")
            await asyncio.sleep(60)  # Wait before retry
```

### 7. Dashboard Component (Priority 70)

```tsx
// frontend/src/app/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Database, HardDrive, Activity, BarChart3, Play, Square, Trash2, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface SystemStatus {
  database: boolean
  google_drive: boolean
  processing: boolean
  monitoring: boolean
}

interface StatusCardProps {
  title: string
  status: 'connected' | 'disconnected' | 'processing'
  details: string
  icon: React.ReactNode
}

function StatusCard({ title, status, details, icon }: StatusCardProps) {
  const statusColors = {
    connected: 'bg-green-500 text-white',
    disconnected: 'bg-red-500 text-white',
    processing: 'bg-blue-500 text-white'
  }

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        <div className="text-gray-400">{icon}</div>
      </div>
      <div className="space-y-2">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status]}`}>
          {status === 'connected' && <CheckCircle className="w-3 h-3 mr-1" />}
          {status === 'disconnected' && <XCircle className="w-3 h-3 mr-1" />}
          {status === 'processing' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
          {status}
        </span>
        <p className="text-xs text-gray-600">{details}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [status, setStatus] = useState<SystemStatus>({
    database: false,
    google_drive: false,
    processing: false,
    monitoring: false
  })
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [activities, setActivities] = useState<Array<{id: string, message: string, timestamp: string}>>([])

  // WebSocket connection
  useEffect(() => {
    const websocket = new WebSocket('ws://localhost:8000/ws')
    
    websocket.onopen = () => {
      console.log('WebSocket connected')
      websocket.send(JSON.stringify({ type: 'subscribe', channel: 'all' }))
    }
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      switch(data.type) {
        case 'cleanup_complete':
          addActivity(`Cleaned ${data.data.cleaned} trashed files`)
          break
        case 'processing_progress':
          addActivity(`Processing ${data.data.file}: ${data.data.progress}%`)
          break
        case 'monitoring_started':
        case 'monitoring_stopped':
          fetchStatus()
          break
      }
    }
    
    setWs(websocket)
    
    return () => {
      websocket.close()
    }
  }, [])

  const fetchStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/status')
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      console.error('Failed to fetch status:', error)
    }
  }

  const addActivity = (message: string) => {
    setActivities(prev => [...prev, {
      id: Date.now().toString(),
      message,
      timestamp: new Date().toISOString()
    }].slice(-10))
  }

  const handleStart = async () => {
    await fetch('http://localhost:8000/api/start', { method: 'POST' })
  }

  const handleStop = async () => {
    await fetch('http://localhost:8000/api/stop', { method: 'POST' })
  }

  const handleCleanup = async () => {
    await fetch('http://localhost:8000/api/cleanup', { method: 'POST' })
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">RAG Pipeline Dashboard</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Quick Actions */}
        <div className="bg-white rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="flex gap-3">
            <button onClick={handleStart} disabled={status.monitoring}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400">
              <Play className="w-4 h-4 mr-2" />
              Start Monitoring
            </button>
            <button onClick={handleStop} disabled={!status.monitoring}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100">
              <Square className="w-4 h-4 mr-2" />
              Stop Monitoring
            </button>
            <button onClick={handleCleanup}
              className="inline-flex items-center px-4 py-2 border border-orange-300 text-orange-700 rounded-md hover:bg-orange-50">
              <Trash2 className="w-4 h-4 mr-2" />
              Manual Cleanup
            </button>
          </div>
        </div>

        {/* Status Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatusCard
            title="Database"
            status={status.database ? 'connected' : 'disconnected'}
            details="Supabase PostgreSQL + pgvector"
            icon={<Database className="h-6 w-6" />}
          />
          <StatusCard
            title="Google Drive"
            status={status.google_drive ? 'connected' : 'disconnected'}
            details="Service Account Authentication"
            icon={<HardDrive className="h-6 w-6" />}
          />
          <StatusCard
            title="Processing"
            status={status.processing ? 'processing' : 'connected'}
            details="File processing pipeline"
            icon={<Activity className="h-6 w-6" />}
          />
          <StatusCard
            title="Statistics"
            status="connected"
            details="System metrics"
            icon={<BarChart3 className="h-6 w-6" />}
          />
        </div>

        {/* Activity Feed */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Live Activity Feed</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {activities.length === 0 ? (
              <p className="text-gray-500">No recent activity</p>
            ) : (
              activities.map(activity => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-blue-500" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

### 8. Docker Configuration (Priority 75)

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

```dockerfile
# frontend/Dockerfile  
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - EMBEDDING_MODEL_NAME=text-embedding-3-small
      - EMBEDDING_DIMENSIONS=1536
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
      - GOOGLE_SERVICE_ACCOUNT_PATH=/app/config/service-account.json
      - GOOGLE_DRIVE_FOLDER_ID=${GOOGLE_DRIVE_FOLDER_ID}
      - POLLING_INTERVAL=${POLLING_INTERVAL:-300}
      - DEFAULT_CHUNK_SIZE=400
      - DEFAULT_CHUNK_OVERLAP=0
    volumes:
      - ./config:/app/config
      - ./logs:/app/logs
    depends_on:
      - redis

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
      - NEXT_PUBLIC_WS_URL=ws://localhost:8000
    depends_on:
      - backend

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

volumes:
  redis-data:
  logs:
```

## 🎯 Critical MVP Tasks (From Archon Project)

Based on the Archon project tasks, these must be completed in order:

1. **service-account-auth** (Priority 100) - Implement Service Account Authentication
2. **preserve-chunking** (Priority 99) - Preserve Exact Chunking Algorithm  
3. **trashed-file-cleanup** (Priority 95) - Implement Complete Trashed File Cleanup
4. **single-user-schema** (Priority 90) - Create Single-User Database Schema
5. **websocket-realtime** (Priority 85) - Implement WebSocket Real-time Updates
6. **cleanup-api** (Priority 80) - Create Cleanup API Endpoints
7. **simple-dashboard** - Create Next.js dashboard UI
8. **docker-deployment** - Create Docker containerization
9. **typing-mind-plugin** - Enhance existing plugin
10. **database-setup-wizard** - Implement UI wizard for database setup

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

## ⚠️ Critical Constraints

### Preservation Requirements
- **Text processing algorithms CANNOT be modified**
- **Embedding model CANNOT be changed** (text-embedding-3-small)
- **Chunk size MUST be 400 characters**
- **Overlap MUST be 0**
- **Vector dimensions MUST be 1536**

### Technical Constraints
- **Single-user only** (no multi-tenant features)
- **Service account auth only** (no OAuth2 browser flow)
- **Docker deployment required**
- **Real-time updates mandatory** (WebSocket integration)

## 🔄 Implementation Strategy

### Follow Archon Task-Driven Development
1. Get task from Archon: `archon:get_task(task_id)`
2. Mark as doing: `archon:update_task(status="doing")`
3. Research if needed: `archon:perform_rag_query()`
4. Implement with reference to source files
5. Test thoroughly
6. Mark for review: `archon:update_task(status="review")`
7. Move to next task

### Key Implementation Notes
- **ALWAYS** reference source files before implementing
- **NEVER** modify core algorithms (chunking, embedding)
- **TEST** against original system for identical results
- **UPDATE** Archon tasks as you progress
- **VALIDATE** each component before moving forward

---

**This PRP v4 includes all critical code examples and implementation details needed to build the RAG Tool Standalone while following the Archon task-driven development approach.**