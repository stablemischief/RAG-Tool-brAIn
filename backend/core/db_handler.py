"""
RAG Tool Standalone - Database Handler (Single-User Simplified)
CRITICAL: Preserves all vector operations while removing multi-tenant complexity.
"""

from typing import List, Dict, Any, Optional
import os
import json
import traceback
from datetime import datetime
import asyncio
import base64
from supabase import create_client, Client
from .text_processor import chunk_text, create_embeddings

class DatabaseHandler:
    """Single-user database handler for RAG operations."""
    
    def __init__(self):
        """Initialize Supabase client from environment variables."""
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
    
    # CRITICAL: Preserve existing database operations - simplified for single-user
    def delete_document_by_file_id(self, file_id: str) -> bool:
        """
        Delete all records related to a specific file ID.
        Simplified from original - no tenant_id filtering needed.
        
        Args:
            file_id: The Google Drive file ID or local file identifier
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Delete all documents with the specified file_id in metadata
            response = self.supabase.table("documents").delete().eq("metadata->>file_id", file_id).execute()
            print(f"Deleted {len(response.data)} document chunks for file ID: {file_id}")
            
            # Delete all document_rows with the specified dataset_id
            try:
                rows_response = self.supabase.table("document_rows").delete().eq("dataset_id", file_id).execute()
                print(f"Deleted {len(rows_response.data)} document rows for file ID: {file_id}")
            except Exception as e:
                print(f"Error deleting document rows: {e}")
                
            # Delete the document_metadata record
            try:
                metadata_response = self.supabase.table("document_metadata").delete().eq("id", file_id).execute()
                print(f"Deleted metadata for file ID: {file_id}")
            except Exception as e:
                print(f"Error deleting document metadata: {e}")
                
            return True
                
        except Exception as e:
            print(f"Error deleting documents: {e}")
            return False
    
    def check_document_exists(self, file_id: str) -> bool:
        """
        Check if a document already exists in the database.
        
        Args:
            file_id: The file ID to check
            
        Returns:
            True if the document exists, False otherwise
        """
        try:
            # Check if document exists in the documents table
            response = self.supabase.table("documents").select("id").eq("metadata->>file_id", file_id).limit(1).execute()
            
            if response.data and len(response.data) > 0:
                return True
                
            # Also check document_metadata table as a backup
            metadata_response = self.supabase.table("document_metadata").select("id").eq("id", file_id).limit(1).execute()
            
            if metadata_response.data and len(metadata_response.data) > 0:
                return True
                
            return False
        except Exception as e:
            print(f"Error checking if document exists: {e}")
            return False
    
    def insert_document_chunks(self, chunks: List[str], embeddings: List[List[float]], 
                             file_id: str, file_url: str, file_title: str, mime_type: str, 
                             file_contents: bytes = None) -> bool:
        """
        Insert document chunks with their embeddings into the database.
        Simplified from original - no tenant_id handling.
        
        Args:
            chunks: List of text chunks
            embeddings: List of embedding vectors for each chunk
            file_id: The file ID
            file_url: The URL to access the file
            file_title: The title of the file
            mime_type: The mime type of the file
            file_contents: Optional binary content for metadata
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Ensure we have the same number of chunks and embeddings
            if len(chunks) != len(embeddings):
                raise ValueError("Number of chunks and embeddings must match")
            
            # Prepare the data for insertion
            data = []
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                file_bytes_str = base64.b64encode(file_contents).decode('utf-8') if file_contents else None
                data.append({
                    "content": chunk,
                    "metadata": {
                        "file_id": file_id,
                        "file_url": file_url,
                        "file_title": file_title,
                        "mime_type": mime_type,
                        "chunk_index": i,
                        **({"file_contents": file_bytes_str} if file_bytes_str else {})
                    },
                    "embedding": embedding
                })
            
            # Insert the data into the documents table
            for item in data:
                self.supabase.table("documents").insert(item).execute()
                
            return True
            
        except Exception as e:
            print(f"Error inserting document chunks: {e}")
            return False
    
    def insert_or_update_document_metadata(self, file_id: str, file_title: str, file_url: str, 
                                         schema: Optional[List[str]] = None) -> bool:
        """
        Insert or update a record in the document_metadata table.
        Simplified from original - no tenant_id handling.
        
        Args:
            file_id: The file ID (used as primary key)
            file_title: The title of the file
            file_url: The URL to access the file
            schema: Optional schema for tabular files
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Check if the record already exists
            response = self.supabase.table("document_metadata").select("*").eq("id", file_id).execute()
            
            # Prepare the data
            data = {
                "id": file_id,
                "title": file_title,
                "url": file_url
            }
            
            # Add schema if provided
            if schema:
                data["schema"] = json.dumps(schema)
            
            if response.data and len(response.data) > 0:
                # Update existing record
                self.supabase.table("document_metadata").update(data).eq("id", file_id).execute()
                print(f"Updated metadata for file '{file_title}' (ID: {file_id})")
            else:
                # Insert new record
                self.supabase.table("document_metadata").insert(data).execute()
                print(f"Inserted metadata for file '{file_title}' (ID: {file_id})")
            
            return True
            
        except Exception as e:
            print(f"Error inserting/updating document metadata: {e}")
            return False
    
    def insert_document_rows(self, file_id: str, rows: List[Dict[str, Any]]) -> bool:
        """
        Insert rows from a tabular file into the document_rows table.
        Port from original source - preserves exact logic.
        
        Args:
            file_id: The file ID (references document_metadata.id)
            rows: List of row data as dictionaries
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # First, delete any existing rows for this file
            self.supabase.table("document_rows").delete().eq("dataset_id", file_id).execute()
            print(f"Deleted existing rows for file ID: {file_id}")
            
            # Insert new rows
            for row in rows:
                self.supabase.table("document_rows").insert({
                    "dataset_id": file_id,
                    "row_data": row
                }).execute()
            print(f"Inserted {len(rows)} rows for file ID: {file_id}")
            
            return True
            
        except Exception as e:
            print(f"Error inserting document rows: {e}")
            return False
    
    # CRITICAL: Preserve the exact process_file_for_rag function logic
    def process_file_for_rag(self, file_content: bytes, text: str, file_id: str, 
                           file_url: str, file_title: str, mime_type: str = None, 
                           config: Dict[str, Any] = None) -> bool:
        """
        Process a file for the RAG pipeline.
        PRESERVES EXACT LOGIC from original system but simplified for single-user.
        
        Args:
            file_content: The binary content of the file
            text: The text content extracted from the file
            file_id: The file ID
            file_url: The URL to access the file
            file_title: The title of the file
            mime_type: Mime type of the file
            config: Configuration for chunk size and overlap
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # First, delete any existing records for this file
            self.delete_document_by_file_id(file_id)
            
            # Insert document metadata first (needed for foreign key constraint)
            if not self.insert_or_update_document_metadata(file_id, file_title, file_url):
                return False

            # Get text processing settings from config
            if config is None:
                config = {}
            
            text_processing = config.get('text_processing', {})
            chunk_size = text_processing.get('default_chunk_size', 400)  # NEVER CHANGE
            chunk_overlap = text_processing.get('default_chunk_overlap', 0)  # NEVER CHANGE

            # Chunk the text using EXACT original algorithm
            chunks = chunk_text(text, chunk_size=chunk_size, overlap=chunk_overlap)
            if not chunks:
                print(f"No chunks were created for file '{file_title}' (ID: {file_id})")
                return False
            
            # Create embeddings for the chunks using EXACT original model
            embeddings = create_embeddings(chunks)
            if not embeddings:
                print(f"No embeddings were created for file '{file_title}' (ID: {file_id})")
                return False

            # For images, include binary in metadata
            if mime_type and mime_type.startswith("image"):
                return self.insert_document_chunks(chunks, embeddings, file_id, file_url, 
                                                 file_title, mime_type, file_content)
            
            # Insert the chunks with their embeddings
            return self.insert_document_chunks(chunks, embeddings, file_id, file_url, 
                                             file_title, mime_type)

        except Exception as e:
            traceback.print_exc()
            print(f"Error processing file for RAG: {e}")
            return False
    
    def retrieve_full_file_content(self, file_id: str) -> Dict[str, Any]:
        """
        Retrieve all chunks for a specific file and reconstruct the complete document.
        Preserves exact logic from original system.
        
        Args:
            file_id: The file ID
            
        Returns:
            Dictionary containing reconstructed file content and metadata
        """
        try:
            # Query all chunks for this file_id, ordered by chunk_index
            response = self.supabase.table("documents").select("*").eq("metadata->>file_id", file_id).order("metadata->>chunk_index").execute()
            
            if not response.data:
                return {
                    "success": False,
                    "error": f"No chunks found for file_id: {file_id}",
                    "file_id": file_id
                }
            
            # Reconstruct the content from chunks
            chunks_data = []
            file_metadata = {}
            
            for chunk in response.data:
                chunks_data.append({
                    "content": chunk["content"],
                    "chunk_index": chunk["metadata"].get("chunk_index", 0),
                    "embedding": chunk.get("embedding", [])
                })
                
                # Get file metadata from the first chunk
                if not file_metadata:
                    file_metadata = {
                        "file_id": chunk["metadata"].get("file_id"),
                        "file_title": chunk["metadata"].get("file_title"),
                        "file_url": chunk["metadata"].get("file_url"),
                        "mime_type": chunk["metadata"].get("mime_type"),
                        "total_chunks": len(response.data)
                    }
            
            # Sort chunks by chunk_index to ensure proper order
            chunks_data.sort(key=lambda x: x["chunk_index"])
            
            # Reconstruct full text content
            full_content = " ".join([chunk["content"] for chunk in chunks_data])
            
            return {
                "success": True,
                "file_id": file_id,
                "metadata": file_metadata,
                "full_content": full_content,
                "chunks": chunks_data,
                "total_chunks": len(chunks_data)
            }
            
        except Exception as e:
            print(f"Error retrieving full file content: {e}")
            return {
                "success": False,
                "error": str(e),
                "file_id": file_id
            }
    
    def search_documents_by_similarity(self, query_embedding: List[float], 
                                     match_count: int = 5, filter_metadata: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Search for similar content using vector similarity.
        Uses the same match_documents function as original system.
        
        Args:
            query_embedding: The embedding vector to search for (1536 dimensions)
            match_count: Maximum number of results to return
            filter_metadata: Optional metadata filter
            
        Returns:
            List of matching chunks with similarity scores
        """
        try:
            # Use the pgvector match_documents function
            filter_dict = filter_metadata if filter_metadata else {}
            
            response = self.supabase.rpc('match_documents', {
                'query_embedding': query_embedding,
                'match_count': match_count,
                'filter': json.dumps(filter_dict)
            }).execute()
            
            return response.data if response.data else []
            
        except Exception as e:
            print(f"Error searching documents by similarity: {e}")
            return []

# Async wrapper for FastAPI compatibility
class AsyncDatabaseHandler:
    """Async wrapper for database operations in FastAPI."""
    
    def __init__(self):
        self.db = DatabaseHandler()
    
    async def delete_document_by_file_id(self, file_id: str) -> bool:
        """Async version of delete_document_by_file_id."""
        return await asyncio.get_event_loop().run_in_executor(
            None, self.db.delete_document_by_file_id, file_id
        )
    
    async def check_document_exists(self, file_id: str) -> bool:
        """Async version of check_document_exists."""
        return await asyncio.get_event_loop().run_in_executor(
            None, self.db.check_document_exists, file_id
        )
    
    async def process_file_for_rag(self, file_content: bytes, text: str, file_id: str, 
                                 file_url: str, file_title: str, mime_type: str = None, 
                                 config: Dict[str, Any] = None) -> bool:
        """Async version of process_file_for_rag."""
        return await asyncio.get_event_loop().run_in_executor(
            None, self.db.process_file_for_rag, file_content, text, file_id, 
            file_url, file_title, mime_type, config
        )
    
    async def retrieve_full_file_content(self, file_id: str) -> Dict[str, Any]:
        """Async version of retrieve_full_file_content."""
        return await asyncio.get_event_loop().run_in_executor(
            None, self.db.retrieve_full_file_content, file_id
        )
    
    async def search_documents_by_similarity(self, query_embedding: List[float], 
                                           match_count: int = 5, filter_metadata: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Async version of search_documents_by_similarity."""
        return await asyncio.get_event_loop().run_in_executor(
            None, self.db.search_documents_by_similarity, query_embedding, match_count, filter_metadata
        )
    
    async def insert_document_rows(self, file_id: str, rows: List[Dict[str, Any]]) -> bool:
        """Async version of insert_document_rows."""
        return await asyncio.get_event_loop().run_in_executor(
            None, self.db.insert_document_rows, file_id, rows
        )

# Global instance for easy access
db_handler = None

def get_database_handler() -> DatabaseHandler:
    """Get global database handler instance."""
    global db_handler
    if db_handler is None:
        db_handler = DatabaseHandler()
    return db_handler

def get_async_database_handler() -> AsyncDatabaseHandler:
    """Get async database handler for FastAPI routes."""
    return AsyncDatabaseHandler()