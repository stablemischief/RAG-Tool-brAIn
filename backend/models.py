"""
Pydantic models for data validation and type safety in the RAG Pipeline.

These models ensure consistent data structures across the application
and provide automatic validation for all API endpoints and data processing.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any, Generic, TypeVar, Union
from pydantic import BaseModel, Field, conint, confloat, validator
from enum import Enum


# Generic type variable for API responses
T = TypeVar('T')


class ProcessingStatus(str, Enum):
    """Processing status enumeration."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class SourceType(str, Enum):
    """Document source type enumeration."""
    GOOGLE_DRIVE = "google_drive"
    LOCAL = "local"
    URL = "url"
    API = "api"


class DocumentMetadata(BaseModel):
    """
    Document metadata model with validation for file information.
    
    Critical: This model preserves the exact data structure required
    for compatibility with the existing vector database schema.
    """
    file_id: str = Field(..., description="Google Drive file ID or unique identifier")
    title: str = Field(..., min_length=1, max_length=500, description="Document title")
    url: Optional[str] = Field(None, description="Source URL (Google Drive or web)")
    mime_type: str = Field(..., description="MIME type of the document")
    file_size_bytes: conint(ge=0) = Field(..., description="File size in bytes")
    chunk_count: conint(ge=0) = Field(default=0, description="Number of text chunks")
    processing_status: ProcessingStatus = Field(default=ProcessingStatus.PENDING)
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    error_message: Optional[str] = Field(None, description="Error message if processing failed")
    
    class Config:
        """Pydantic configuration."""
        use_enum_values = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }


class FileInfo(BaseModel):
    """File information for batch processing requests."""
    file_id: str = Field(..., description="Unique file identifier")
    file_path: str = Field(..., description="Path to the file")
    mime_type: str = Field(..., description="MIME type of the file")


class ProcessingRequest(BaseModel):
    """
    Request model for document processing operations.
    
    Critical: Default values MUST match original implementation:
    - chunk_size: 400 characters
    - overlap_size: 80 characters (20% of chunk_size)
    """
    files: List[FileInfo] = Field(..., min_items=1, description="Files to process")
    chunk_size: conint(ge=100, le=2000) = Field(
        default=400, 
        description="Text chunk size in characters (CRITICAL: preserve 400)"
    )
    overlap_size: conint(ge=0) = Field(
        default=80,
        description="Chunk overlap in characters (CRITICAL: preserve 80, which is 20% of 400)"
    )
    batch_size: conint(ge=1, le=100) = Field(
        default=10,
        description="Number of files to process in parallel"
    )
    force_reprocess: bool = Field(
        default=False,
        description="Force reprocessing even if document already exists"
    )
    
    @validator('overlap_size')
    def validate_overlap(cls, v, values):
        """Ensure overlap is less than chunk size."""
        if 'chunk_size' in values and v >= values['chunk_size']:
            raise ValueError('overlap_size must be less than chunk_size')
        return v
    
    class Config:
        """Pydantic configuration."""
        schema_extra = {
            "example": {
                "files": [
                    {
                        "file_id": "1BvAP8ZYs7_example_id",
                        "file_path": "/path/to/document.pdf",
                        "mime_type": "application/pdf"
                    }
                ],
                "chunk_size": 400,
                "overlap_size": 80,
                "batch_size": 10,
                "force_reprocess": False
            }
        }


class DateRange(BaseModel):
    """Date range filter for searches."""
    start: str = Field(..., description="Start date in ISO format")
    end: str = Field(..., description="End date in ISO format")


class SearchFilters(BaseModel):
    """Optional filters for search requests."""
    source_type: Optional[SourceType] = Field(None, description="Filter by document source")
    file_types: Optional[List[str]] = Field(None, description="Filter by file extensions")
    date_range: Optional[DateRange] = Field(None, description="Filter by date range")


class SearchRequest(BaseModel):
    """
    Request model for semantic search operations.
    
    Validates query parameters and search filters for vector similarity search.
    """
    query: str = Field(
        ..., 
        min_length=3, 
        max_length=1000, 
        description="Search query text"
    )
    limit: conint(ge=1, le=100) = Field(
        default=20, 
        description="Maximum number of results to return"
    )
    threshold: confloat(ge=0.0, le=1.0) = Field(
        default=0.7,
        description="Minimum similarity score threshold"
    )
    include_metadata: bool = Field(
        default=True,
        description="Include document metadata in results"
    )
    filters: Optional[SearchFilters] = Field(
        None,
        description="Optional search filters"
    )
    
    class Config:
        """Pydantic configuration."""
        schema_extra = {
            "example": {
                "query": "machine learning algorithms",
                "limit": 20,
                "threshold": 0.7,
                "include_metadata": True,
                "filters": {
                    "source_type": "google_drive",
                    "file_types": ["pdf", "docx"],
                    "date_range": {
                        "start": "2024-01-01",
                        "end": "2024-12-31"
                    }
                }
            }
        }


class SearchResultMetadata(BaseModel):
    """Metadata for search result items."""
    file_id: str = Field(..., description="Source document file ID")
    title: str = Field(..., description="Document title")
    chunk_index: int = Field(..., description="Chunk index within document")
    source_type: str = Field(..., description="Document source type")
    created_at: str = Field(..., description="Document creation timestamp")
    file_url: Optional[str] = Field(None, description="Source file URL")


class SearchResult(BaseModel):
    """Individual search result with content and metadata."""
    id: str = Field(..., description="Unique result identifier")
    content: str = Field(..., description="Matching text content")
    similarity_score: confloat(ge=0.0, le=1.0) = Field(
        ..., 
        description="Cosine similarity score"
    )
    metadata: SearchResultMetadata = Field(..., description="Document metadata")
    highlighted_content: Optional[str] = Field(
        None,
        description="Content with search terms highlighted"
    )


class SearchResponse(BaseModel):
    """Response model for search operations."""
    results: List[SearchResult] = Field(..., description="Search results")
    total_results: int = Field(..., description="Total number of matching results")
    query_time_ms: int = Field(..., description="Query execution time in milliseconds")
    query: str = Field(..., description="Original search query")
    filters_applied: Optional[SearchFilters] = Field(
        None,
        description="Filters that were applied to the search"
    )


class SystemStatus(BaseModel):
    """System health and configuration status."""
    database_configured: bool = Field(..., description="Database connection configured")
    google_drive_connected: bool = Field(..., description="Google Drive service connected")
    supabase_connected: bool = Field(..., description="Supabase database connected")
    openai_connected: bool = Field(..., description="OpenAI API connected")
    monitoring_active: bool = Field(..., description="File monitoring is active")
    last_sync: Optional[str] = Field(None, description="Last successful sync timestamp")
    service_account_configured: bool = Field(..., description="Service account configured")
    oauth_configured: bool = Field(..., description="OAuth credentials configured")
    uptime_seconds: int = Field(..., description="System uptime in seconds")
    version: str = Field(..., description="Application version")


class ProcessingStats(BaseModel):
    """Processing statistics and metrics."""
    total_files_processed: int = Field(..., description="Total files processed")
    total_vectors_created: int = Field(..., description="Total embeddings created")
    total_errors: int = Field(..., description="Total processing errors")
    files_pending: int = Field(..., description="Files awaiting processing")
    last_processing_time: Optional[str] = Field(None, description="Last processing timestamp")
    processing_rate_per_hour: float = Field(..., description="Processing rate per hour")
    storage_used_mb: float = Field(..., description="Storage used in MB")
    documents_today: int = Field(..., description="Documents processed today")
    errors_today: int = Field(..., description="Errors encountered today")


class LogLevel(str, Enum):
    """Log level enumeration."""
    DEBUG = "DEBUG"
    INFO = "INFO" 
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class LogEntry(BaseModel):
    """Log entry model for system logging."""
    timestamp: str = Field(..., description="Log entry timestamp")
    level: LogLevel = Field(..., description="Log level")
    message: str = Field(..., description="Log message")
    module: str = Field(..., description="Source module name")
    function_name: Optional[str] = Field(None, description="Source function name")
    file_id: Optional[str] = Field(None, description="Related file ID")
    duration_ms: Optional[int] = Field(None, description="Operation duration in milliseconds")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    
    class Config:
        """Pydantic configuration."""
        use_enum_values = True


class ProcessingProgress(BaseModel):
    """Real-time processing progress for WebSocket updates."""
    file_id: str = Field(..., description="File being processed")
    filename: str = Field(..., description="Human-readable filename")
    stage: str = Field(
        ..., 
        description="Current processing stage",
        regex="^(downloading|extracting|chunking|embedding|storing|completed|failed)$"
    )
    progress_percent: confloat(ge=0.0, le=100.0) = Field(..., description="Progress percentage")
    chunks_processed: int = Field(..., description="Number of chunks processed")
    total_chunks: int = Field(..., description="Total chunks to process")
    current_operation: Optional[str] = Field(None, description="Current operation description")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    estimated_completion: Optional[str] = Field(None, description="Estimated completion time")


class WebSocketMessage(BaseModel):
    """WebSocket message structure for real-time updates."""
    type: str = Field(
        ...,
        description="Message type",
        regex="^(status_update|processing_progress|log_entry|error|stats_update)$"
    )
    timestamp: str = Field(..., description="Message timestamp")
    data: Dict[str, Any] = Field(..., description="Message payload")


class ApiResponse(BaseModel, Generic[T]):
    """
    Generic API response wrapper for consistent response format.
    
    Provides standardized success/error handling across all endpoints.
    """
    success: bool = Field(..., description="Indicates if operation was successful")
    data: Optional[T] = Field(None, description="Response data (if successful)")
    error: Optional[str] = Field(None, description="Error message (if failed)")
    error_code: Optional[str] = Field(None, description="Machine-readable error code")
    timestamp: str = Field(
        default_factory=lambda: datetime.utcnow().isoformat(),
        description="Response timestamp"
    )
    request_id: Optional[str] = Field(None, description="Unique request identifier")
    
    class Config:
        """Pydantic configuration."""
        schema_extra = {
            "example_success": {
                "success": True,
                "data": {"message": "Operation completed successfully"},
                "error": None,
                "timestamp": "2024-01-15T10:00:00Z",
                "request_id": "req_abc123"
            },
            "example_error": {
                "success": False,
                "data": None,
                "error": "File not found",
                "error_code": "FILE_NOT_FOUND",
                "timestamp": "2024-01-15T10:00:00Z",
                "request_id": "req_abc123"
            }
        }


class ValidationError(BaseModel):
    """Validation error details."""
    errors: List[Dict[str, Any]] = Field(..., description="List of validation errors")
    message: str = Field(..., description="Overall error message")


# Critical preservation constants
class EmbeddingConfig(BaseModel):
    """
    CRITICAL: Embedding configuration that MUST be preserved exactly.
    
    These values ensure compatibility with existing vector database and
    maintain consistency with the current implementation.
    """
    MODEL_NAME: str = Field(
        default="text-embedding-3-small",
        description="CRITICAL: Must remain text-embedding-3-small for compatibility"
    )
    DIMENSIONS: int = Field(
        default=1536,
        description="CRITICAL: Must remain 1536 dimensions for compatibility"
    )
    CHUNK_SIZE: int = Field(
        default=400,
        description="CRITICAL: Must remain 400 characters for compatibility"
    )
    OVERLAP_SIZE: int = Field(
        default=80,
        description="CRITICAL: Must remain 80 characters (20% of chunk_size)"
    )
    
    class Config:
        """Pydantic configuration."""
        schema_extra = {
            "description": "CRITICAL: These values must never be changed to maintain compatibility"
        }


# Export all models for easy importing
__all__ = [
    'DocumentMetadata',
    'ProcessingRequest', 
    'SearchRequest',
    'SearchResult',
    'SearchResponse',
    'SystemStatus',
    'ProcessingStats',
    'LogEntry',
    'ProcessingProgress',
    'WebSocketMessage',
    'ApiResponse',
    'ValidationError',
    'EmbeddingConfig',
    'ProcessingStatus',
    'SourceType',
    'LogLevel'
]