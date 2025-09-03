"""
RAG Tool Standalone - FastAPI Backend with WebSocket Support
Implements all endpoints required by the PRP with real-time updates.
"""

import os
import asyncio
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from core.google_drive import ServiceAccountDriveWatcher, create_drive_watcher
from core.db_handler import get_async_database_handler
from core.text_processor import create_embeddings
from core.logging_system import get_logger, log_system_startup, log_system_shutdown, LogLevel

# Global state management
app_state = {
    "drive_watcher": None,
    "monitoring_task": None,
    "is_monitoring": False,
    "last_sync": None,
    "stats": {
        "total_documents": 0,
        "total_chunks": 0,
        "files_processed": 0,
        "files_cleaned": 0,
        "last_activity": None
    }
}

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                # Remove disconnected clients
                self.active_connections.remove(connection)

    async def broadcast_json(self, data: Dict[str, Any]):
        message = json.dumps(data)
        await self.broadcast(message)

manager = ConnectionManager()

# Pydantic models for API responses
class SystemStatus(BaseModel):
    database: bool
    google_drive: bool
    processing: bool
    last_sync: Optional[str]
    monitoring: bool

class SystemStats(BaseModel):
    total_documents: int
    total_chunks: int
    files_processed: int
    files_cleaned: int
    last_activity: Optional[str]

class CleanupResult(BaseModel):
    cleaned: int
    errors: int
    timestamp: str

# Initialize FastAPI app
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 RAG Tool Standalone starting up...")
    log_system_startup()
    logger = get_logger()
    
    # Initialize database handler
    try:
        db = get_async_database_handler()
        print("✅ Database handler initialized")
        logger.log_connection_status("database", "connected", "Supabase connection established")
    except Exception as e:
        print(f"❌ Database initialization error: {e}")
        logger.log_connection_status("database", "disconnected", str(e))
    
    # Initialize Google Drive watcher (but don't start monitoring yet)
    try:
        service_account_path = os.getenv("GOOGLE_SERVICE_ACCOUNT_PATH")
        folder_id = os.getenv("GOOGLE_DRIVE_FOLDER_ID")
        
        if service_account_path:
            app_state["drive_watcher"] = create_drive_watcher(service_account_path, folder_id)
            print("✅ Google Drive watcher initialized")
            logger.log_connection_status("google_drive", "connected", "Service account authenticated")
        else:
            print("⚠️ No service account path provided - Google Drive functionality disabled")
            logger.log_connection_status("google_drive", "disconnected", "No service account configured")
    except Exception as e:
        print(f"❌ Google Drive initialization error: {e}")
        logger.log_connection_status("google_drive", "disconnected", str(e))
    
    yield
    
    # Shutdown
    print("🛑 RAG Tool Standalone shutting down...")
    log_system_shutdown()
    if app_state["monitoring_task"]:
        app_state["monitoring_task"].cancel()

app = FastAPI(
    title="RAG Tool Standalone",
    description="Single-user RAG pipeline with Google Drive integration",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Basic health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# System status endpoint
@app.get("/api/status", response_model=SystemStatus)
async def get_system_status():
    """Get current system status for dashboard."""
    try:
        # Check database connectivity
        db = get_async_database_handler()
        database_ok = True
        try:
            # Simple test - this will fail if database is not accessible
            await db.check_document_exists("test")
        except:
            database_ok = False
        
        # Check Google Drive connectivity
        google_drive_ok = False
        if app_state["drive_watcher"]:
            try:
                # Simple test - check if service is available
                if app_state["drive_watcher"].service:
                    google_drive_ok = True
            except:
                pass
        
        return SystemStatus(
            database=database_ok,
            google_drive=google_drive_ok,
            processing=app_state["is_monitoring"],
            last_sync=app_state["last_sync"],
            monitoring=app_state["is_monitoring"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting system status: {e}")

# System statistics endpoint
@app.get("/api/stats", response_model=SystemStats)
async def get_system_stats():
    """Get system statistics for dashboard."""
    try:
        # In a real implementation, you would query the database for actual stats
        # For now, return the cached stats
        return SystemStats(**app_state["stats"])
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting system stats: {e}")

# Start monitoring endpoint
@app.post("/api/start")
async def start_monitoring(background_tasks: BackgroundTasks):
    """Start Google Drive monitoring."""
    logger = get_logger()
    
    if not app_state["drive_watcher"]:
        logger.log_error("Start monitoring failed: Google Drive watcher not configured", "api")
        raise HTTPException(status_code=400, detail="Google Drive watcher not configured")
    
    if app_state["is_monitoring"]:
        logger.log_activity("Start monitoring requested but already active", LogLevel.INFO, "api")
        return {"message": "Monitoring already active", "status": "running"}
    
    try:
        # Start monitoring in background
        app_state["monitoring_task"] = asyncio.create_task(
            start_background_monitoring()
        )
        app_state["is_monitoring"] = True
        logger.log_activity("File monitoring started", LogLevel.INFO, "monitoring")
        
        # Broadcast status update via WebSocket
        await manager.broadcast_json({
            "type": "status_update",
            "data": {"monitoring": True, "message": "Monitoring started"}
        })
        
        return {"message": "Monitoring started successfully", "status": "started"}
        
    except Exception as e:
        logger.log_error(f"Failed to start monitoring: {e}", "api", e)
        raise HTTPException(status_code=500, detail=f"Error starting monitoring: {e}")

# Stop monitoring endpoint
@app.post("/api/stop")
async def stop_monitoring():
    """Stop Google Drive monitoring."""
    logger = get_logger()
    if not app_state["is_monitoring"]:
        logger.log_activity("Stop monitoring requested but not active", LogLevel.INFO, "api")
        return {"message": "Monitoring not active", "status": "stopped"}
    
    try:
        if app_state["monitoring_task"]:
            app_state["monitoring_task"].cancel()
            app_state["monitoring_task"] = None
        
        app_state["is_monitoring"] = False
        logger.log_activity("File monitoring stopped", LogLevel.INFO, "monitoring")
        
        # Broadcast status update via WebSocket
        await manager.broadcast_json({
            "type": "status_update", 
            "data": {"monitoring": False, "message": "Monitoring stopped"}
        })
        
        return {"message": "Monitoring stopped successfully", "status": "stopped"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error stopping monitoring: {e}")

# Manual cleanup endpoint
@app.post("/api/cleanup", response_model=CleanupResult)
async def manual_cleanup():
    """Manually trigger cleanup of trashed files."""
    logger = get_logger()
    
    if not app_state["drive_watcher"]:
        logger.log_error("Manual cleanup failed: Google Drive watcher not configured", "api")
        raise HTTPException(status_code=400, detail="Google Drive watcher not configured")
    
    try:
        logger.log_activity("Manual cleanup initiated", LogLevel.INFO, "cleanup")
        
        # Perform cleanup
        result = await app_state["drive_watcher"].cleanup_trashed_files()
        
        # Update stats
        app_state["stats"]["files_cleaned"] += result["cleaned"]
        app_state["stats"]["last_activity"] = datetime.utcnow().isoformat()
        
        cleanup_result = CleanupResult(
            cleaned=result["cleaned"],
            errors=result["errors"], 
            timestamp=datetime.utcnow().isoformat()
        )
        
        # Log cleanup results
        if result["cleaned"] > 0:
            logger.log_activity(f"Cleanup completed: {result['cleaned']} files cleaned", LogLevel.INFO, "cleanup")
        else:
            logger.log_activity("Cleanup completed: No files to clean", LogLevel.INFO, "cleanup")
        
        if result["errors"]:
            for error in result["errors"]:
                logger.log_activity(f"Cleanup error: {error}", LogLevel.WARNING, "cleanup")
        
        # Broadcast cleanup results via WebSocket
        await manager.broadcast_json({
            "type": "cleanup_complete",
            "data": cleanup_result.dict()
        })
        
        return cleanup_result
        
    except Exception as e:
        logger.log_error(f"Manual cleanup failed: {e}", "cleanup", e)
        raise HTTPException(status_code=500, detail=f"Error during cleanup: {e}")

# Search endpoint
@app.post("/api/search")
async def search_documents(query: str, limit: int = 5):
    """Search documents using vector similarity."""
    logger = get_logger()
    
    if not query:
        logger.log_activity(f"Search request failed: Empty query", LogLevel.WARNING, "search")
        raise HTTPException(status_code=400, detail="Query parameter required")
    
    try:
        logger.log_activity(f"Search initiated: '{query[:50]}{'...' if len(query) > 50 else ''}' (limit: {limit})", LogLevel.INFO, "search")
        
        db = get_async_database_handler()
        
        # Create embedding for the query
        query_embedding = create_embeddings([query])
        if not query_embedding:
            logger.log_error("Search failed: Could not create query embedding", "search")
            raise HTTPException(status_code=500, detail="Failed to create query embedding")
        
        # Search for similar documents
        results = await db.search_documents_by_similarity(
            query_embedding[0], match_count=limit
        )
        
        logger.log_activity(f"Search completed: Found {len(results)} results for query", LogLevel.INFO, "search")
        
        return {
            "query": query,
            "results": results,
            "count": len(results),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.log_error(f"Search failed: {e}", "search", e)
        raise HTTPException(status_code=500, detail=f"Search error: {e}")

# WebSocket endpoint for real-time updates
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates."""
    logger = get_logger()
    client_info = f"{websocket.client.host}:{websocket.client.port}" if websocket.client else "unknown"
    
    await manager.connect(websocket)
    logger.log_activity(f"WebSocket client connected: {client_info}", LogLevel.INFO, "websocket")
    
    try:
        # Send initial status
        status = await get_system_status()
        await websocket.send_json({
            "type": "initial_status",
            "data": status.dict()
        })
        
        # Keep connection alive and listen for client messages
        while True:
            try:
                data = await websocket.receive_text()
                # Echo back for heartbeat
                await websocket.send_json({
                    "type": "heartbeat",
                    "timestamp": datetime.utcnow().isoformat()
                })
            except WebSocketDisconnect:
                logger.log_activity(f"WebSocket client disconnected normally: {client_info}", LogLevel.INFO, "websocket")
                break
                
    except WebSocketDisconnect:
        logger.log_activity(f"WebSocket client disconnected: {client_info}", LogLevel.INFO, "websocket")
        manager.disconnect(websocket)
    except Exception as e:
        logger.log_error(f"WebSocket error for client {client_info}: {e}", "websocket", e)
        manager.disconnect(websocket)

# Background monitoring task
async def start_background_monitoring():
    """Background task for monitoring Google Drive changes."""
    logger = get_logger()
    
    if not app_state["drive_watcher"]:
        logger.log_error("Background monitoring failed: drive_watcher not initialized", "monitoring")
        return
    
    try:
        interval = int(os.getenv("POLLING_INTERVAL", "300"))  # 5 minutes default
        logger.log_activity(f"Background monitoring started with {interval}s interval", LogLevel.INFO, "monitoring")
        
        # Broadcast monitoring start
        await manager.broadcast_json({
            "type": "monitoring_started",
            "data": {"interval": interval, "timestamp": datetime.utcnow().isoformat()}
        })
        
        # Start the actual monitoring
        await app_state["drive_watcher"].watch_for_changes(interval)
        
    except asyncio.CancelledError:
        logger.log_activity("Background monitoring cancelled", LogLevel.INFO, "monitoring")
        app_state["is_monitoring"] = False
        await manager.broadcast_json({
            "type": "monitoring_stopped",
            "data": {"timestamp": datetime.utcnow().isoformat()}
        })
    except Exception as e:
        logger.log_error(f"Background monitoring error: {e}", "monitoring", e)
        app_state["is_monitoring"] = False
        await manager.broadcast_json({
            "type": "monitoring_error",
            "data": {"error": str(e), "timestamp": datetime.utcnow().isoformat()}
        })

# Configuration endpoint
@app.get("/api/config")
async def get_configuration():
    """Get current configuration."""
    config = {
        "google_drive_folder_id": os.getenv("GOOGLE_DRIVE_FOLDER_ID"),
        "polling_interval": int(os.getenv("POLLING_INTERVAL", "300")),
        "has_service_account": bool(os.getenv("GOOGLE_SERVICE_ACCOUNT_PATH")),
        "has_openai_key": bool(os.getenv("OPENAI_API_KEY")),
        "has_supabase_config": bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_SERVICE_KEY"))
    }
    return config

# Logs endpoint (simplified - in production you'd implement proper logging)
@app.get("/api/logs")
async def get_logs(limit: int = 100, level_filter: Optional[str] = None):
    """Get recent system logs with optional filtering."""
    logger = get_logger()
    logs = logger.get_recent_logs(limit=limit, level_filter=level_filter)
    
    return {
        "logs": logs,
        "count": len(logs),
        "limit": limit,
        "level_filter": level_filter
    }

@app.get("/api/logs/stats")
async def get_log_stats():
    """Get logging statistics for dashboard."""
    logger = get_logger()
    return logger.get_log_stats()

@app.get("/api/logs/export")
async def export_logs(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    level_filter: Optional[str] = None
):
    """Export logs as text file for specified date range."""
    logger = get_logger()
    
    # Parse dates if provided
    start_dt = None
    end_dt = None
    
    try:
        if start_date:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        if end_date:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {e}")
    
    export_content = logger.export_logs(
        start_date=start_dt,
        end_date=end_dt,
        level_filter=level_filter
    )
    
    return {
        "export_content": export_content,
        "start_date": start_date,
        "end_date": end_date,
        "level_filter": level_filter
    }

# Error handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler."""
    logger = get_logger()
    logger.log_error(f"Global exception: {exc}", "global_handler", exc)
    
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )

if __name__ == "__main__":
    # Get configuration from environment
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    reload = os.getenv("RELOAD", "true").lower() == "true"
    
    print(f"🚀 Starting RAG Tool Standalone on {host}:{port}")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info"
    )