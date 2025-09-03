"""
RAG Tool Standalone - Google Drive Integration with Service Account Authentication
CRITICAL: Replaces OAuth2 browser flow with service account for VPS deployment
PRESERVES: All file monitoring, processing, and cleanup functionality
"""

import os
import io
import json
import time
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from pathlib import Path

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from google.auth.exceptions import DefaultCredentialsError

from .text_processor import extract_text_from_file, get_default_config
from .db_handler import get_async_database_handler

class ServiceAccountDriveWatcher:
    """
    Google Drive watcher using service account authentication for VPS deployment.
    PRESERVES all functionality from original OAuth2 version while enabling headless operation.
    """
    
    def __init__(self, service_account_path: str = None, folder_id: str = None, 
                 config: Dict[str, Any] = None):
        """
        Initialize the Google Drive watcher with service account authentication.
        
        Args:
            service_account_path: Path to service account JSON file
            folder_id: ID of the Google Drive folder to watch (None for all files)
            config: Configuration dictionary
        """
        # Service account setup
        self.service_account_path = service_account_path or os.getenv("GOOGLE_SERVICE_ACCOUNT_PATH")
        if not self.service_account_path:
            raise ValueError("Service account path must be provided via parameter or GOOGLE_SERVICE_ACCOUNT_PATH env var")
        
        # Folder and service setup
        self.folder_id = folder_id or os.getenv("GOOGLE_DRIVE_FOLDER_ID")
        self.service = None
        self.credentials = None
        
        # File tracking
        self.known_files = {}
        self.initialized = False
        
        # Configuration - use provided config or get default
        self.config = config or get_default_config()
        self.last_check_time = datetime.fromtimestamp(0, timezone.utc)  # Start from epoch
        
        # Database handler
        self.db = get_async_database_handler()
        
        # Initialize authentication
        self._authenticate()
    
    def _authenticate(self) -> None:
        """
        Authenticate with Google Drive API using service account.
        NO BROWSER INTERACTION - perfect for VPS deployment.
        """
        try:
            # Verify service account file exists
            if not os.path.exists(self.service_account_path):
                raise FileNotFoundError(f"Service account file not found: {self.service_account_path}")
            
            # Load service account credentials
            self.credentials = service_account.Credentials.from_service_account_file(
                self.service_account_path,
                scopes=[
                    'https://www.googleapis.com/auth/drive.metadata.readonly',
                    'https://www.googleapis.com/auth/drive.readonly'
                ]
            )
            
            # Build the Drive API service
            self.service = build('drive', 'v3', credentials=self.credentials)
            
            # Test the connection
            self.service.about().get(fields="user").execute()
            print("✅ Successfully authenticated with Google Drive using service account")
            
        except FileNotFoundError as e:
            raise ValueError(f"Service account file error: {e}")
        except DefaultCredentialsError as e:
            raise ValueError(f"Service account authentication failed: {e}")
        except Exception as e:
            raise ValueError(f"Google Drive authentication error: {e}")
    
    def get_folder_contents(self, folder_id: str, time_str: str) -> List[Dict[str, Any]]:
        """
        Get all files in a folder that have been modified after the specified time.
        PRESERVES EXACT LOGIC from original OAuth2 version.
        
        Args:
            folder_id: The ID of the folder to check
            time_str: The time string in RFC 3339 format
            
        Returns:
            List of files with their metadata
        """
        try:
            # Query for files modified or created after the specified time
            # Include trashed files for cleanup detection
            query = f"(modifiedTime > '{time_str}' or createdTime > '{time_str}') and '{folder_id}' in parents"
            
            results = self.service.files().list(
                q=query,
                pageSize=100,
                fields="nextPageToken, files(id, name, mimeType, webViewLink, modifiedTime, createdTime, trashed)",
                supportsAllDrives=True,
                includeItemsFromAllDrives=True
            ).execute()
            
            items = results.get('files', [])
            
            # Recursively get contents of subfolders
            folder_query = f"'{folder_id}' in parents and mimeType = 'application/vnd.google-apps.folder'"
            folder_results = self.service.files().list(
                q=folder_query,
                pageSize=100,
                fields="files(id)",
                supportsAllDrives=True,
                includeItemsFromAllDrives=True
            ).execute()
            
            subfolders = folder_results.get('files', [])
            
            # Process each subfolder recursively
            for subfolder in subfolders:
                subfolder_items = self.get_folder_contents(subfolder['id'], time_str)
                items.extend(subfolder_items)
            
            return items
            
        except Exception as e:
            print(f"Error getting folder contents: {e}")
            return []
    
    def get_changes(self) -> List[Dict[str, Any]]:
        """
        Get changes in Google Drive since the last check.
        PRESERVES EXACT LOGIC while using service account authentication.
        
        Returns:
            List of changed files with their metadata
        """
        if not self.service:
            self._authenticate()
        
        try:
            # Convert last_check_time to RFC 3339 format
            time_str = self.last_check_time.strftime('%Y-%m-%dT%H:%M:%S.%fZ')
            
            files = []
            
            if self.folder_id:
                # Get files in specified folder and its subfolders
                files = self.get_folder_contents(self.folder_id, time_str)
            else:
                # Get all files in drive (be careful - this could be a lot!)
                query = f"(modifiedTime > '{time_str}' or createdTime > '{time_str}')"
                results = self.service.files().list(
                    q=query,
                    pageSize=100,
                    fields="nextPageToken, files(id, name, mimeType, webViewLink, modifiedTime, createdTime, trashed)",
                    supportsAllDrives=True,
                    includeItemsFromAllDrives=True
                ).execute()
                
                files = results.get('files', [])
            
            # Update the last check time
            self.last_check_time = datetime.now(timezone.utc)
            
            return files
            
        except Exception as e:
            print(f"Error getting changes: {e}")
            return []
    
    def download_file(self, file_id: str, mime_type: str) -> Optional[bytes]:
        """
        Download a file from Google Drive.
        PRESERVES EXACT EXPORT LOGIC for Google Workspace files.
        
        Args:
            file_id: The ID of the file to download
            mime_type: The MIME type of the file
            
        Returns:
            The file content as bytes, or None if download failed
        """
        if not self.service:
            self._authenticate()
        
        try:
            file_content = io.BytesIO()
            
            # Check if this is a Google Workspace file that needs to be exported
            export_mime_types = self.config.get('export_mime_types', {})
            if mime_type in export_mime_types:
                # Export the file in the appropriate format
                request = self.service.files().export_media(
                    fileId=file_id, 
                    mimeType=export_mime_types[mime_type]
                )
            else:
                # For regular files, download directly
                request = self.service.files().get_media(fileId=file_id)
            
            # Download the file
            downloader = MediaIoBaseDownload(file_content, request)
            done = False
            while not done:
                status, done = downloader.next_chunk()
            
            # Reset the pointer to the beginning
            file_content.seek(0)
            return file_content.read()
        
        except Exception as e:
            print(f"Error downloading file {file_id}: {e}")
            return None
    
    async def process_file(self, file: Dict[str, Any]) -> bool:
        """
        Process a file for the RAG pipeline.
        PRESERVES EXACT PROCESSING LOGIC including trashed file cleanup.
        
        Args:
            file: The file metadata from Google Drive
            
        Returns:
            True if successful, False otherwise
        """
        file_id = file['id']
        file_name = file['name']
        mime_type = file['mimeType']
        web_view_link = file.get('webViewLink', '')
        is_trashed = file.get('trashed', False)
        
        try:
            # CRITICAL: Handle trashed files - delete from database
            if is_trashed:
                print(f"🗑️ File '{file_name}' (ID: {file_id}) has been trashed. Removing from database...")
                success = await self.db.delete_document_by_file_id(file_id)
                if success and file_id in self.known_files:
                    del self.known_files[file_id]
                return success
            
            # Skip unsupported file types
            supported_mime_types = self.config.get('supported_mime_types', [])
            if not any(mime_type.startswith(t) for t in supported_mime_types):
                print(f"⏭️ Skipping unsupported file type: {mime_type}")
                return False
            
            # Download the file
            print(f"⬇️ Downloading file '{file_name}'...")
            file_content = self.download_file(file_id, mime_type)
            if not file_content:
                print(f"❌ Failed to download file '{file_name}' (ID: {file_id})")
                return False
            
            # Extract text from the file using EXACT original algorithm
            text = extract_text_from_file(file_content, mime_type, file_name, self.config)
            if not text:
                print(f"⚠️ No text could be extracted from file '{file_name}' (ID: {file_id})")
                return False
            
            print(f"📄 Extracted {len(text)} characters from '{file_name}'")
            
            # Process the file for RAG using EXACT original algorithm
            success = await self.db.process_file_for_rag(
                file_content, text, file_id, web_view_link, file_name, mime_type, self.config
            )
            
            # Update the known files dictionary
            self.known_files[file_id] = file.get('modifiedTime')
            
            if success:
                print(f"✅ Successfully processed file '{file_name}' (ID: {file_id})")
            else:
                print(f"❌ Failed to process file '{file_name}' (ID: {file_id})")
            
            return success
            
        except Exception as e:
            print(f"❌ Error processing file '{file_name}': {e}")
            return False
    
    async def detect_trashed_files(self) -> List[str]:
        """
        NEW: Detect files that have been trashed in Google Drive.
        This addresses the cleanup requirement from the PRP.
        
        Returns:
            List of file IDs that have been trashed
        """
        if not self.service:
            self._authenticate()
        
        trashed_file_ids = []
        
        try:
            # Query for trashed files that we might have in our database
            query = "trashed=true"
            
            # If we have a specific folder, limit to that folder
            if self.folder_id:
                query += f" and '{self.folder_id}' in parents"
            
            results = self.service.files().list(
                q=query,
                pageSize=100,
                fields="files(id, name)",
                supportsAllDrives=True,
                includeItemsFromAllDrives=True
            ).execute()
            
            trashed_files = results.get('files', [])
            
            for file in trashed_files:
                file_id = file['id']
                # Check if this file exists in our database
                if await self.db.check_document_exists(file_id):
                    trashed_file_ids.append(file_id)
                    print(f"🗑️ Found trashed file in database: {file.get('name', 'Unknown')} (ID: {file_id})")
            
            return trashed_file_ids
            
        except Exception as e:
            print(f"Error detecting trashed files: {e}")
            return []
    
    async def cleanup_trashed_files(self) -> Dict[str, int]:
        """
        NEW: Clean up trashed files from the database.
        This addresses the automatic cleanup requirement from the PRP.
        
        Returns:
            Dictionary with cleanup statistics
        """
        try:
            trashed_file_ids = await self.detect_trashed_files()
            
            if not trashed_file_ids:
                return {"cleaned": 0, "errors": 0}
            
            cleaned_count = 0
            error_count = 0
            
            print(f"🧹 Cleaning up {len(trashed_file_ids)} trashed files from database...")
            
            for file_id in trashed_file_ids:
                try:
                    success = await self.db.delete_document_by_file_id(file_id)
                    if success:
                        cleaned_count += 1
                        # Remove from known_files if present
                        if file_id in self.known_files:
                            del self.known_files[file_id]
                    else:
                        error_count += 1
                except Exception as e:
                    print(f"❌ Error cleaning up file {file_id}: {e}")
                    error_count += 1
            
            print(f"✅ Cleanup complete: {cleaned_count} files cleaned, {error_count} errors")
            
            return {"cleaned": cleaned_count, "errors": error_count}
            
        except Exception as e:
            print(f"Error in cleanup process: {e}")
            return {"cleaned": 0, "errors": 1}
    
    async def initialize_and_sync_files(self) -> Dict[str, int]:
        """
        Initialize by syncing all files in the watched folder.
        PRESERVES EXACT SYNC LOGIC while using service account authentication.
        
        Returns:
            Dictionary with sync statistics
        """
        if not self.service:
            self._authenticate()
        
        print("🔄 Initializing and syncing all files with the vector database...")
        
        stats = {"processed": 0, "skipped": 0, "cleaned": 0, "errors": 0}
        
        if not self.folder_id:
            print("⚠️ Warning: No specific folder ID set. This would sync ALL files in your Drive.")
            print("Please set GOOGLE_DRIVE_FOLDER_ID environment variable.")
            return stats
        
        try:
            # Get ALL files in the folder (no time filter)
            query = f"'{self.folder_id}' in parents"
            results = self.service.files().list(
                q=query,
                pageSize=1000,
                fields="files(id, name, mimeType, webViewLink, modifiedTime, createdTime, trashed)",
                supportsAllDrives=True,
                includeItemsFromAllDrives=True
            ).execute()
            
            all_files = results.get('files', [])
            
            # Filter and categorize files
            files_to_process = []
            trashed_files_to_cleanup = []
            supported_mime_types = self.config.get('supported_mime_types', [])
            
            for file in all_files:
                mime_type = file.get('mimeType', '')
                file_id = file['id']
                is_trashed = file.get('trashed', False)
                
                # Skip folders
                if mime_type == 'application/vnd.google-apps.folder':
                    continue
                
                # Skip unsupported file types
                if not any(mime_type.startswith(t) for t in supported_mime_types):
                    continue
                
                if is_trashed:
                    if await self.db.check_document_exists(file_id):
                        trashed_files_to_cleanup.append(file)
                else:
                    files_to_process.append(file)
            
            print(f"📊 Found {len(files_to_process)} files to sync, {len(trashed_files_to_cleanup)} trashed files to cleanup")
            
            # Clean up trashed files first
            if trashed_files_to_cleanup:
                cleanup_stats = await self.cleanup_trashed_files()
                stats["cleaned"] = cleanup_stats["cleaned"]
                stats["errors"] += cleanup_stats["errors"]
            
            # Process active files
            for i, file in enumerate(files_to_process, 1):
                print(f"\n[{i}/{len(files_to_process)}] Processing: {file['name']}")
                
                file_id = file['id']
                
                # Skip if already in database and not modified
                if await self.db.check_document_exists(file_id):
                    print(f"⏭️ Already in database: {file['name']}")
                    self.known_files[file_id] = file.get('modifiedTime')
                    stats["skipped"] += 1
                    continue
                
                # Process the file
                success = await self.process_file(file)
                if success:
                    stats["processed"] += 1
                else:
                    stats["errors"] += 1
            
            print(f"\n✅ Initialization complete!")
            print(f"📊 Statistics: {stats['processed']} processed, {stats['skipped']} skipped, {stats['cleaned']} cleaned, {stats['errors']} errors")
            print(f"📁 Now tracking {len(self.known_files)} files")
            
            self.initialized = True
            return stats
            
        except Exception as e:
            print(f"❌ Error during initialization: {e}")
            stats["errors"] += 1
            return stats
    
    async def watch_for_changes(self, interval_seconds: int = 300) -> None:
        """
        Watch for changes in Google Drive at regular intervals.
        PRESERVES EXACT WATCHING LOGIC with service account authentication.
        
        Args:
            interval_seconds: The interval in seconds between checks (default 5 minutes)
        """
        folder_msg = f" in folder ID: {self.folder_id}" if self.folder_id else ""
        print(f"👀 Starting Google Drive watcher{folder_msg}. Checking every {interval_seconds} seconds...")
        
        try:
            # Initial sync if not done
            if not self.initialized:
                await self.initialize_and_sync_files()
            
            while True:
                print(f"\n🔍 Checking for changes...")
                
                # Get changes since last check
                changed_files = self.get_changes()
                
                # Periodic cleanup of trashed files (every 5 cycles)
                import random
                if random.random() < 0.2:  # ~20% chance each cycle
                    print("🧹 Periodic cleanup check...")
                    await self.cleanup_trashed_files()
                
                # Process changed files
                if changed_files:
                    print(f"📝 Found {len(changed_files)} changed files")
                    for file in changed_files:
                        await self.process_file(file)
                else:
                    print("✅ No changes detected")
                
                # Wait for next check
                print(f"⏳ Waiting {interval_seconds} seconds until next check...")
                await asyncio.sleep(interval_seconds)
        
        except KeyboardInterrupt:
            print("\n🛑 Watcher stopped by user")
        except Exception as e:
            print(f"❌ Error in watcher: {e}")
            raise

# Convenience functions for easy usage
def create_drive_watcher(service_account_path: str = None, folder_id: str = None, 
                        config: Dict[str, Any] = None) -> ServiceAccountDriveWatcher:
    """
    Create a Google Drive watcher with service account authentication.
    
    Args:
        service_account_path: Path to service account JSON
        folder_id: Google Drive folder ID to watch
        config: Configuration dictionary
        
    Returns:
        Configured ServiceAccountDriveWatcher instance
    """
    return ServiceAccountDriveWatcher(service_account_path, folder_id, config)

async def start_drive_monitoring(service_account_path: str = None, folder_id: str = None,
                                interval_seconds: int = 300) -> None:
    """
    Start monitoring Google Drive for changes.
    
    Args:
        service_account_path: Path to service account JSON
        folder_id: Google Drive folder ID to watch  
        interval_seconds: Check interval in seconds
    """
    watcher = create_drive_watcher(service_account_path, folder_id)
    await watcher.watch_for_changes(interval_seconds)