import {
  SystemStatus,
  ProcessingStats,
  DocumentMetadata,
  DatabaseSetupRequest,
  DatabaseSetupResponse,
  DatabaseStatus,
  ServiceAccountUpload,
  ServiceAccountValidation,
  ServiceAccountConfig,
  LogEntry,
  LogFilter,
  LogExportRequest,
  AppConfiguration,
  ConfigurationUpdate,
  SearchQuery,
  SearchResponse,
  ApiResponse,
  PaginatedResponse,
  GoogleDriveFolder,
  GoogleDriveFile,
} from '@/types';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_TIMEOUT = 30000; // 30 seconds

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Request configuration interface
interface RequestConfig {
  timeout?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/**
 * Base API client with error handling and request/response interceptors
 */
class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  /**
   * Generic request method with error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit & RequestConfig = {}
  ): Promise<T> {
    const { timeout = API_TIMEOUT, headers = {}, signal, ...fetchOptions } = options;
    
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          ...this.defaultHeaders,
          ...headers,
        },
        signal: signal || controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorCode = response.status.toString();
        let errorDetails: unknown = null;

        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          errorCode = errorData.error_code || errorCode;
          errorDetails = errorData.details || errorData;
        } catch {
          // Ignore JSON parsing errors for error responses
        }

        throw new ApiError(response.status, errorMessage, errorCode, errorDetails);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError(408, 'Request timeout', 'TIMEOUT');
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new ApiError(0, 'Network error - check if backend is running', 'NETWORK_ERROR');
      }

      throw new ApiError(500, 'Unexpected error occurred', 'UNKNOWN_ERROR', error);
    }
  }

  // HTTP method shortcuts
  async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  /**
   * Upload file with proper form data handling
   */
  async uploadFile<T>(endpoint: string, formData: FormData, config?: RequestConfig): Promise<T> {
    const { timeout = API_TIMEOUT, headers = {}, signal } = config || {};
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          // Don't set Content-Type for FormData - browser will set it with boundary
          'Accept': 'application/json',
          ...headers,
        },
        body: formData,
        signal: signal || controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new ApiError(response.status, errorText || response.statusText);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}

// Create singleton instance
const apiClient = new ApiClient();

/**
 * System Health and Status API
 */
export const systemApi = {
  /**
   * Get current system health status
   */
  getHealth: (): Promise<ApiResponse<{ status: string; timestamp: string }>> =>
    apiClient.get('/api/health'),

  /**
   * Get comprehensive system status
   */
  getStatus: (): Promise<ApiResponse<SystemStatus>> =>
    apiClient.get('/api/status'),

  /**
   * Get processing statistics
   */
  getStats: (): Promise<ApiResponse<ProcessingStats>> =>
    apiClient.get('/api/stats'),

  /**
   * Start monitoring service
   */
  startMonitoring: (): Promise<ApiResponse<{ message: string }>> =>
    apiClient.post('/api/control/start'),

  /**
   * Stop monitoring service  
   */
  stopMonitoring: (): Promise<ApiResponse<{ message: string }>> =>
    apiClient.post('/api/control/stop'),

  /**
   * Restart monitoring service
   */
  restartMonitoring: (): Promise<ApiResponse<{ message: string }>> =>
    apiClient.post('/api/control/restart'),
};

/**
 * Database Setup API
 */
export const databaseApi = {
  /**
   * Check database configuration status
   */
  getStatus: (): Promise<ApiResponse<DatabaseStatus>> =>
    apiClient.get('/api/setup/database/status'),

  /**
   * Create database schema
   */
  createSchema: (config: DatabaseSetupRequest): Promise<ApiResponse<DatabaseSetupResponse>> =>
    apiClient.post('/api/setup/database/create', config),

  /**
   * Verify database schema
   */
  verifySchema: (): Promise<ApiResponse<DatabaseStatus>> =>
    apiClient.get('/api/setup/database/verify'),

  /**
   * Test database connection
   */
  testConnection: (config: DatabaseSetupRequest): Promise<ApiResponse<{ valid: boolean; message: string }>> =>
    apiClient.post('/api/setup/database/test', config),
};

/**
 * Service Account Configuration API
 */
export const serviceAccountApi = {
  /**
   * Get service account status
   */
  getStatus: (): Promise<ApiResponse<ServiceAccountConfig>> =>
    apiClient.get('/api/setup/service-account/status'),

  /**
   * Upload and configure service account
   */
  upload: (file: File, folderIds: string[]): Promise<ApiResponse<ServiceAccountValidation>> => {
    const formData = new FormData();
    formData.append('service_account_file', file);
    formData.append('drive_folder_ids', JSON.stringify(folderIds));
    formData.append('validate_permissions', 'true');
    
    return apiClient.uploadFile('/api/setup/service-account/upload', formData);
  },

  /**
   * Validate service account permissions
   */
  validate: (): Promise<ApiResponse<ServiceAccountValidation>> =>
    apiClient.post('/api/setup/service-account/validate'),

  /**
   * Remove service account configuration
   */
  remove: (): Promise<ApiResponse<{ message: string }>> =>
    apiClient.delete('/api/setup/service-account'),
};

/**
 * Google Drive Integration API
 */
export const googleDriveApi = {
  /**
   * List accessible Google Drive folders
   */
  listFolders: (): Promise<ApiResponse<GoogleDriveFolder[]>> =>
    apiClient.get('/api/google-drive/folders'),

  /**
   * List files in specific folder
   */
  listFiles: (folderId: string): Promise<ApiResponse<GoogleDriveFile[]>> =>
    apiClient.get(`/api/google-drive/folders/${folderId}/files`),

  /**
   * Get folder monitoring status
   */
  getFolderStatus: (folderId: string): Promise<ApiResponse<{ monitoring: boolean; file_count: number }>> =>
    apiClient.get(`/api/google-drive/folders/${folderId}/status`),

  /**
   * Enable monitoring for folder
   */
  enableMonitoring: (folderId: string): Promise<ApiResponse<{ message: string }>> =>
    apiClient.post(`/api/google-drive/folders/${folderId}/monitor`),

  /**
   * Disable monitoring for folder
   */
  disableMonitoring: (folderId: string): Promise<ApiResponse<{ message: string }>> =>
    apiClient.delete(`/api/google-drive/folders/${folderId}/monitor`),

  /**
   * Force sync specific folder
   */
  syncFolder: (folderId: string): Promise<ApiResponse<{ message: string; files_processed: number }>> =>
    apiClient.post(`/api/google-drive/folders/${folderId}/sync`),
};

/**
 * Document Management API
 */
export const documentsApi = {
  /**
   * List processed documents with pagination
   */
  list: (page = 1, perPage = 50, filter?: Partial<DocumentMetadata>): Promise<ApiResponse<PaginatedResponse<DocumentMetadata>>> =>
    apiClient.get(`/api/documents?page=${page}&per_page=${perPage}${filter ? `&${new URLSearchParams(filter as Record<string, string>).toString()}` : ''}`),

  /**
   * Get document details
   */
  get: (documentId: string): Promise<ApiResponse<DocumentMetadata>> =>
    apiClient.get(`/api/documents/${documentId}`),

  /**
   * Delete document
   */
  delete: (documentId: string): Promise<ApiResponse<{ message: string }>> =>
    apiClient.delete(`/api/documents/${documentId}`),

  /**
   * Reprocess document
   */
  reprocess: (documentId: string): Promise<ApiResponse<{ message: string }>> =>
    apiClient.post(`/api/documents/${documentId}/reprocess`),

  /**
   * Get document content
   */
  getContent: (documentId: string): Promise<ApiResponse<{ content: string; chunks: Array<{ content: string; index: number }> }>> =>
    apiClient.get(`/api/documents/${documentId}/content`),
};

/**
 * Search API
 */
export const searchApi = {
  /**
   * Perform semantic search
   */
  search: (query: SearchQuery): Promise<ApiResponse<SearchResponse>> =>
    apiClient.post('/api/search', query),

  /**
   * Get search suggestions
   */
  getSuggestions: (partial: string): Promise<ApiResponse<string[]>> =>
    apiClient.get(`/api/search/suggestions?q=${encodeURIComponent(partial)}`),

  /**
   * Get search history
   */
  getHistory: (): Promise<ApiResponse<Array<{ query: string; timestamp: string; result_count: number }>>> =>
    apiClient.get('/api/search/history'),
};

/**
 * Logging API
 */
export const logsApi = {
  /**
   * Get recent logs with filtering
   */
  getLogs: (filter: LogFilter = {}, page = 1, perPage = 100): Promise<ApiResponse<PaginatedResponse<LogEntry>>> =>
    apiClient.post(`/api/logs?page=${page}&per_page=${perPage}`, filter),

  /**
   * Export logs
   */
  exportLogs: (request: LogExportRequest): Promise<Blob> => {
    return fetch(`${API_BASE_URL}/api/logs/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }).then(response => {
      if (!response.ok) {
        throw new ApiError(response.status, 'Failed to export logs');
      }
      return response.blob();
    });
  },

  /**
   * Clear old logs
   */
  clearLogs: (olderThanDays: number): Promise<ApiResponse<{ deleted_count: number }>> =>
    apiClient.delete(`/api/logs?older_than_days=${olderThanDays}`),
};

/**
 * Configuration API
 */
export const configApi = {
  /**
   * Get current configuration
   */
  get: (): Promise<ApiResponse<AppConfiguration>> =>
    apiClient.get('/api/config'),

  /**
   * Update configuration
   */
  update: (updates: ConfigurationUpdate[]): Promise<ApiResponse<AppConfiguration>> =>
    apiClient.patch('/api/config', { updates }),

  /**
   * Reset configuration to defaults
   */
  reset: (): Promise<ApiResponse<AppConfiguration>> =>
    apiClient.post('/api/config/reset'),

  /**
   * Validate configuration
   */
  validate: (config: Partial<AppConfiguration>): Promise<ApiResponse<{ valid: boolean; errors?: string[] }>> =>
    apiClient.post('/api/config/validate', config),
};

/**
 * File Upload API for manual document uploads
 */
export const uploadApi = {
  /**
   * Upload document files for processing
   */
  uploadFiles: (files: FileList, options?: { source_type?: string }): Promise<ApiResponse<{ uploaded: number; failed: number; details: Array<{ filename: string; status: 'success' | 'failed'; error?: string }> }>> => {
    const formData = new FormData();
    
    Array.from(files).forEach((file, index) => {
      formData.append(`files`, file);
    });
    
    if (options?.source_type) {
      formData.append('source_type', options.source_type);
    }
    
    return apiClient.uploadFile('/api/upload', formData);
  },

  /**
   * Upload from URL
   */
  uploadFromUrl: (url: string): Promise<ApiResponse<{ message: string; document_id: string }>> =>
    apiClient.post('/api/upload/url', { url }),
};

// Export everything for easy importing
export {
  ApiError,
  apiClient,
};

// Default export with all APIs grouped
export default {
  system: systemApi,
  database: databaseApi,
  serviceAccount: serviceAccountApi,
  googleDrive: googleDriveApi,
  documents: documentsApi,
  search: searchApi,
  logs: logsApi,
  config: configApi,
  upload: uploadApi,
};