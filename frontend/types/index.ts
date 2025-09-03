// Core System Types
export interface SystemStatus {
  database_configured: boolean;
  google_drive_connected: boolean;
  supabase_connected: boolean;
  openai_connected: boolean;
  monitoring_active: boolean;
  last_sync: string | null;
  service_account_configured: boolean;
  oauth_configured: boolean;
  uptime_seconds: number;
  version: string;
}

export interface ProcessingStats {
  total_files_processed: number;
  total_vectors_created: number;
  total_errors: number;
  files_pending: number;
  last_processing_time: string | null;
  processing_rate_per_hour: number;
  storage_used_mb: number;
  documents_today: number;
  errors_today: number;
}

export interface DocumentMetadata {
  file_id: string;
  title: string;
  source_type: 'google_drive' | 'local' | 'url' | 'api';
  created_at: string;
  updated_at: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  file_size_bytes: number;
  chunk_count: number;
  mime_type: string;
  source_url?: string;
}

// Database Setup Types
export interface DatabaseSetupStep {
  step_number: number;
  step_name: string;
  description: string;
  sql_script: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  error_message?: string;
  execution_time_ms?: number;
}

export interface DatabaseSetupRequest {
  supabase_url: string;
  supabase_service_key: string;
  validate_connection?: boolean;
}

export interface DatabaseSetupResponse {
  overall_status: 'success' | 'partial' | 'failed';
  steps: DatabaseSetupStep[];
  tables_created: string[];
  functions_created: string[];
  message: string;
  total_execution_time_ms: number;
}

export interface DatabaseStatus {
  configured: boolean;
  connection_valid: boolean;
  required_tables: {
    documents: boolean;
    document_metadata: boolean;
    document_rows: boolean;
  };
  required_functions: {
    match_documents: boolean;
    execute_sql_rpc: boolean;
  };
  pgvector_enabled: boolean;
  supabase_url?: string;
  last_checked: string;
}

// Service Account Setup Types
export interface ServiceAccountConfig {
  configured: boolean;
  email?: string;
  project_id?: string;
  client_id?: string;
  drive_folders_shared: number;
  permissions_valid: boolean;
  last_validated: string;
}

export interface ServiceAccountUpload {
  file: File;
  drive_folder_ids: string[];
  validate_permissions: boolean;
}

export interface ServiceAccountValidation {
  valid: boolean;
  email: string;
  project_id: string;
  permissions: {
    drive_readonly: boolean;
    can_list_files: boolean;
    can_download_files: boolean;
  };
  accessible_folders: Array<{
    id: string;
    name: string;
    file_count: number;
  }>;
  error_message?: string;
}

// Google Drive Integration Types
export interface GoogleDriveFolder {
  id: string;
  name: string;
  parent_id?: string;
  file_count: number;
  last_modified: string;
  shared_with_service_account: boolean;
  monitoring_enabled: boolean;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mime_type: string;
  size_bytes: number;
  modified_time: string;
  created_time: string;
  parents: string[];
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  web_view_link?: string;
}

// Monitoring and Logs Types
export interface LogEntry {
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  module: string;
  function_name?: string;
  file_id?: string;
  duration_ms?: number;
  metadata?: Record<string, unknown>;
}

export interface LogFilter {
  level?: LogEntry['level'];
  module?: string;
  start_time?: string;
  end_time?: string;
  search_text?: string;
  file_id?: string;
}

export interface LogExportRequest {
  format: 'json' | 'csv' | 'txt';
  filter: LogFilter;
  include_metadata: boolean;
}

// Real-time WebSocket Types
export interface WebSocketMessage {
  type: 'status_update' | 'processing_progress' | 'log_entry' | 'error' | 'stats_update';
  timestamp: string;
  data: unknown;
}

export interface ProcessingProgress {
  file_id: string;
  filename: string;
  stage: 'downloading' | 'extracting' | 'chunking' | 'embedding' | 'storing' | 'completed' | 'failed';
  progress_percent: number;
  chunks_processed: number;
  total_chunks: number;
  current_operation?: string;
  error_message?: string;
  estimated_completion?: string;
}

export interface StatusUpdate {
  component: 'database' | 'google_drive' | 'openai' | 'monitoring';
  status: 'connected' | 'disconnected' | 'error' | 'reconnecting';
  message?: string;
  timestamp: string;
}

// Configuration Types
export interface AppConfiguration {
  monitoring_interval_minutes: number;
  chunk_size: number;
  chunk_overlap: number;
  max_file_size_mb: number;
  supported_file_types: string[];
  embedding_model: string;
  batch_size: number;
  rate_limit_per_minute: number;
  log_level: LogEntry['level'];
  auto_start_monitoring: boolean;
  backup_enabled: boolean;
  cleanup_old_logs_days: number;
}

export interface ConfigurationUpdate {
  field: keyof AppConfiguration;
  value: unknown;
  validate?: boolean;
}

// Search and Query Types
export interface SearchQuery {
  query: string;
  limit: number;
  threshold: number;
  include_metadata: boolean;
  filters?: {
    source_type?: DocumentMetadata['source_type'];
    file_types?: string[];
    date_range?: {
      start: string;
      end: string;
    };
  };
}

export interface SearchResult {
  id: string;
  content: string;
  similarity_score: number;
  metadata: {
    file_id: string;
    title: string;
    chunk_index: number;
    source_type: string;
    created_at: string;
    file_url?: string;
  };
  highlighted_content?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total_results: number;
  query_time_ms: number;
  query: string;
  filters_applied: SearchQuery['filters'];
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  error_code?: string;
  timestamp: string;
  request_id?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// Error Types
export interface ErrorDetail {
  code: string;
  message: string;
  field?: string;
  context?: Record<string, unknown>;
}

export interface ValidationError {
  errors: ErrorDetail[];
  message: string;
}

// Form Types for UI Components
export interface DatabaseSetupFormData {
  supabase_url: string;
  supabase_service_key: string;
  validate_connection: boolean;
}

export interface ServiceAccountFormData {
  service_account_file?: File;
  drive_folder_urls: string[];
  validate_permissions: boolean;
}

export interface ConfigurationFormData extends Partial<AppConfiguration> {
  // Extends configuration with UI-specific fields
  save_immediately?: boolean;
  restart_monitoring?: boolean;
}

// Component Props Types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface StatusIndicatorProps extends BaseComponentProps {
  status: 'success' | 'warning' | 'error' | 'pending' | 'info';
  label: string;
  description?: string;
  showDot?: boolean;
}

export interface ProgressBarProps extends BaseComponentProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'error';
  animated?: boolean;
}

export interface CardProps extends BaseComponentProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  loading?: boolean;
  error?: string;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type StatusColor = 'green' | 'yellow' | 'red' | 'blue' | 'gray';

export type FileType = 
  | 'pdf' 
  | 'docx' 
  | 'txt' 
  | 'html' 
  | 'csv' 
  | 'xlsx' 
  | 'xls' 
  | 'pptx' 
  | 'md' 
  | 'json';

// Hook Return Types
export interface UseWebSocketReturn {
  connected: boolean;
  lastMessage: WebSocketMessage | null;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
  connect: () => void;
  disconnect: () => void;
  sendMessage: (message: WebSocketMessage) => void;
}

export interface UseApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  mutate: (newData: T) => void;
}

export interface UsePollingReturn<T> extends UseApiReturn<T> {
  startPolling: (intervalMs: number) => void;
  stopPolling: () => void;
  isPolling: boolean;
}

// Constants
export const FILE_TYPE_ICONS: Record<FileType, string> = {
  pdf: '📄',
  docx: '📝',
  txt: '📄',
  html: '🌐',
  csv: '📊',
  xlsx: '📊',
  xls: '📊',
  pptx: '📋',
  md: '📄',
  json: '📋',
};

export const STATUS_COLORS: Record<StatusIndicatorProps['status'], StatusColor> = {
  success: 'green',
  warning: 'yellow',
  error: 'red',
  info: 'blue',
  pending: 'gray',
};

export const LOG_LEVELS: Record<LogEntry['level'], number> = {
  DEBUG: 10,
  INFO: 20,
  WARNING: 30,
  ERROR: 40,
  CRITICAL: 50,
};