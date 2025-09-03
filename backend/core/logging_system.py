"""
RAG Tool Standalone - Logging System
Simple file-based logging with rotation and export capabilities.
"""

import os
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional
from logging.handlers import RotatingFileHandler
import asyncio
from enum import Enum

class LogLevel(str, Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"

class LogEntry:
    def __init__(self, timestamp: str, level: str, message: str, component: str = "system"):
        self.timestamp = timestamp
        self.level = level
        self.message = message
        self.component = component
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp,
            "level": self.level,
            "message": self.message,
            "component": self.component
        }

class ActivityLogger:
    """
    Simple logging system for RAG Tool activities with:
    - File-based logging with rotation
    - Activity log and error log separation
    - Export functionality
    - User-friendly messages
    """
    
    def __init__(self, log_dir: str = "logs"):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(exist_ok=True)
        
        # Create separate loggers for different purposes
        self.activity_logger = self._create_logger(
            "activity", 
            self.log_dir / "activity.log",
            max_bytes=10*1024*1024,  # 10MB
            backup_count=5
        )
        
        self.error_logger = self._create_logger(
            "error",
            self.log_dir / "error.log", 
            max_bytes=5*1024*1024,   # 5MB
            backup_count=3
        )
        
        # JSON log for structured data (for dashboard)
        self.json_log_file = self.log_dir / "activities.jsonl"
        
        # Ensure JSON log exists
        if not self.json_log_file.exists():
            self.json_log_file.touch()
    
    def _create_logger(self, name: str, log_file: Path, max_bytes: int, backup_count: int) -> logging.Logger:
        """Create a rotating file logger"""
        logger = logging.getLogger(f"rag_tool_{name}")
        logger.setLevel(logging.DEBUG)
        
        # Remove existing handlers to avoid duplicates
        for handler in logger.handlers[:]:
            logger.removeHandler(handler)
        
        # Rotating file handler
        handler = RotatingFileHandler(
            log_file,
            maxBytes=max_bytes,
            backupCount=backup_count,
            encoding='utf-8'
        )
        
        # Formatter for human-readable logs
        formatter = logging.Formatter(
            '%(asctime)s | %(levelname)-8s | %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        handler.setFormatter(formatter)
        
        logger.addHandler(handler)
        return logger
    
    def _write_json_log(self, entry: LogEntry):
        """Write structured log entry for dashboard consumption"""
        try:
            with open(self.json_log_file, 'a', encoding='utf-8') as f:
                f.write(json.dumps(entry.to_dict()) + '\n')
        except Exception as e:
            # Fallback logging if JSON write fails
            self.error_logger.error(f"Failed to write JSON log: {e}")
    
    def log_activity(self, message: str, level: LogLevel = LogLevel.INFO, component: str = "system"):
        """Log general activity"""
        entry = LogEntry(
            timestamp=datetime.now().isoformat(),
            level=level.value,
            message=message,
            component=component
        )
        
        # Log to appropriate file
        if level in [LogLevel.ERROR, LogLevel.CRITICAL]:
            self.error_logger.log(getattr(logging, level.value), message)
        else:
            self.activity_logger.log(getattr(logging, level.value), message)
        
        # Always write to JSON for dashboard
        self._write_json_log(entry)
    
    def log_file_processing(self, file_name: str, action: str, status: str = "success"):
        """Log file processing activities"""
        if status == "success":
            self.log_activity(f"File processed: {file_name} - {action}", LogLevel.INFO, "file_processor")
        elif status == "error":
            self.log_activity(f"File processing failed: {file_name} - {action}", LogLevel.ERROR, "file_processor")
        else:
            self.log_activity(f"File processing: {file_name} - {action}", LogLevel.INFO, "file_processor")
    
    def log_cleanup(self, files_cleaned: int, errors: List[str] = None):
        """Log cleanup operations"""
        if files_cleaned > 0:
            self.log_activity(f"Cleanup completed: {files_cleaned} files removed", LogLevel.INFO, "cleanup")
        
        if errors:
            for error in errors:
                self.log_activity(f"Cleanup error: {error}", LogLevel.WARNING, "cleanup")
    
    def log_system_event(self, event: str, details: str = ""):
        """Log system events (startup, shutdown, etc.)"""
        message = f"System event: {event}"
        if details:
            message += f" - {details}"
        self.log_activity(message, LogLevel.INFO, "system")
    
    def log_connection_status(self, service: str, status: str, details: str = ""):
        """Log service connection status"""
        level = LogLevel.INFO if status == "connected" else LogLevel.WARNING
        message = f"Service {service}: {status}"
        if details:
            message += f" - {details}"
        self.log_activity(message, level, "connection")
    
    def log_error(self, error: str, component: str = "system", exception: Exception = None):
        """Log errors with optional exception details"""
        message = f"Error in {component}: {error}"
        if exception:
            message += f" - {str(exception)}"
        self.log_activity(message, LogLevel.ERROR, component)
    
    def get_recent_logs(self, limit: int = 100, level_filter: str = None) -> List[Dict[str, Any]]:
        """Get recent log entries for dashboard"""
        logs = []
        
        try:
            if self.json_log_file.exists():
                with open(self.json_log_file, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    
                    # Get last N lines
                    recent_lines = lines[-limit:] if len(lines) > limit else lines
                    
                    for line in recent_lines:
                        try:
                            entry = json.loads(line.strip())
                            
                            # Apply level filter if specified
                            if level_filter and entry.get('level', '').lower() != level_filter.lower():
                                continue
                                
                            logs.append(entry)
                        except json.JSONDecodeError:
                            continue
        except Exception as e:
            self.log_error(f"Failed to read recent logs: {e}", "logging_system")
        
        # Return in reverse chronological order (newest first)
        return list(reversed(logs))
    
    def export_logs(self, start_date: datetime = None, end_date: datetime = None, 
                   level_filter: str = None) -> str:
        """Export logs as text file for specified date range"""
        try:
            if not start_date:
                start_date = datetime.now() - timedelta(days=7)  # Default: last 7 days
            if not end_date:
                end_date = datetime.now()
            
            export_lines = []
            export_lines.append(f"RAG Tool Logs Export")
            export_lines.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            export_lines.append(f"Date Range: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
            if level_filter:
                export_lines.append(f"Level Filter: {level_filter}")
            export_lines.append("=" * 80)
            export_lines.append("")
            
            # Read and filter logs
            if self.json_log_file.exists():
                with open(self.json_log_file, 'r', encoding='utf-8') as f:
                    for line in f:
                        try:
                            entry = json.loads(line.strip())
                            entry_time = datetime.fromisoformat(entry['timestamp'].replace('Z', '+00:00'))
                            
                            # Date range filter
                            if entry_time < start_date or entry_time > end_date:
                                continue
                            
                            # Level filter
                            if level_filter and entry.get('level', '').lower() != level_filter.lower():
                                continue
                            
                            # Format entry
                            formatted_entry = f"{entry['timestamp']} | {entry['level']:<8} | {entry['component']:<15} | {entry['message']}"
                            export_lines.append(formatted_entry)
                            
                        except (json.JSONDecodeError, KeyError, ValueError):
                            continue
            
            return '\n'.join(export_lines)
            
        except Exception as e:
            self.log_error(f"Failed to export logs: {e}", "logging_system")
            return f"Error exporting logs: {e}"
    
    def get_log_stats(self) -> Dict[str, Any]:
        """Get logging statistics for dashboard"""
        try:
            stats = {
                "total_entries": 0,
                "levels": {"DEBUG": 0, "INFO": 0, "WARNING": 0, "ERROR": 0, "CRITICAL": 0},
                "components": {},
                "last_24h": 0,
                "log_files": []
            }
            
            # Analyze JSON log file
            if self.json_log_file.exists():
                with open(self.json_log_file, 'r', encoding='utf-8') as f:
                    last_24h = datetime.now() - timedelta(hours=24)
                    
                    for line in f:
                        try:
                            entry = json.loads(line.strip())
                            stats["total_entries"] += 1
                            
                            # Level count
                            level = entry.get('level', 'INFO')
                            if level in stats["levels"]:
                                stats["levels"][level] += 1
                            
                            # Component count
                            component = entry.get('component', 'system')
                            stats["components"][component] = stats["components"].get(component, 0) + 1
                            
                            # Last 24h count
                            try:
                                entry_time = datetime.fromisoformat(entry['timestamp'].replace('Z', '+00:00'))
                                if entry_time >= last_24h:
                                    stats["last_24h"] += 1
                            except ValueError:
                                pass
                                
                        except json.JSONDecodeError:
                            continue
            
            # Log file sizes
            for log_file in self.log_dir.glob("*.log*"):
                try:
                    size_mb = log_file.stat().st_size / (1024 * 1024)
                    stats["log_files"].append({
                        "name": log_file.name,
                        "size_mb": round(size_mb, 2)
                    })
                except:
                    pass
            
            return stats
            
        except Exception as e:
            self.log_error(f"Failed to get log stats: {e}", "logging_system")
            return {"error": str(e)}

# Global logger instance
activity_logger = None

def get_logger() -> ActivityLogger:
    """Get the global activity logger instance"""
    global activity_logger
    if activity_logger is None:
        log_dir = os.getenv("LOG_DIR", "logs")
        activity_logger = ActivityLogger(log_dir)
    return activity_logger

def log_activity(message: str, level: LogLevel = LogLevel.INFO, component: str = "system"):
    """Convenience function for logging activities"""
    get_logger().log_activity(message, level, component)

def log_error(error: str, component: str = "system", exception: Exception = None):
    """Convenience function for logging errors"""
    get_logger().log_error(error, component, exception)

def log_system_startup():
    """Log system startup"""
    get_logger().log_system_event("System startup", "RAG Tool backend started")

def log_system_shutdown():
    """Log system shutdown"""
    get_logger().log_system_event("System shutdown", "RAG Tool backend stopped")