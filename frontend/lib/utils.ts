import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwindcss-merge';
import { format, formatDistance, isValid, parseISO } from 'date-fns';
import type { 
  StatusIndicatorProps, 
  StatusColor, 
  FileType, 
  LogEntry,
  ProcessingProgress 
} from '@/types';

/**
 * Merge Tailwind CSS classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format number with commas for thousands separator
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format duration in milliseconds to human readable string
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  if (seconds > 0) return `${seconds}s`;
  return `${ms}ms`;
}

/**
 * Format date with relative time fallback
 */
export function formatDate(date: string | Date, options?: {
  relative?: boolean;
  includeTime?: boolean;
  format?: string;
}): string {
  const { relative = false, includeTime = true, format: customFormat } = options || {};

  let dateObj: Date;
  
  if (typeof date === 'string') {
    dateObj = parseISO(date);
  } else {
    dateObj = date;
  }

  if (!isValid(dateObj)) {
    return 'Invalid date';
  }

  if (relative) {
    return formatDistance(dateObj, new Date(), { addSuffix: true });
  }

  if (customFormat) {
    return format(dateObj, customFormat);
  }

  const formatString = includeTime ? 'MMM dd, yyyy HH:mm:ss' : 'MMM dd, yyyy';
  return format(dateObj, formatString);
}

/**
 * Get status color based on status type
 */
export function getStatusColor(status: StatusIndicatorProps['status']): StatusColor {
  const colorMap: Record<StatusIndicatorProps['status'], StatusColor> = {
    success: 'green',
    warning: 'yellow',
    error: 'red',
    info: 'blue',
    pending: 'gray',
  };
  return colorMap[status];
}

/**
 * Get file type from filename or MIME type
 */
export function getFileType(filename: string, mimeType?: string): FileType {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  // Check by extension first
  switch (ext) {
    case 'pdf': return 'pdf';
    case 'doc':
    case 'docx': return 'docx';
    case 'txt': return 'txt';
    case 'html':
    case 'htm': return 'html';
    case 'csv': return 'csv';
    case 'xls':
    case 'xlsx': return 'xlsx';
    case 'ppt':
    case 'pptx': return 'pptx';
    case 'md':
    case 'markdown': return 'md';
    case 'json': return 'json';
    default:
      // Fallback to MIME type
      if (mimeType) {
        if (mimeType.includes('pdf')) return 'pdf';
        if (mimeType.includes('word') || mimeType.includes('document')) return 'docx';
        if (mimeType.includes('text')) return 'txt';
        if (mimeType.includes('html')) return 'html';
        if (mimeType.includes('csv')) return 'csv';
        if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'xlsx';
        if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'pptx';
        if (mimeType.includes('json')) return 'json';
      }
      return 'txt'; // Default fallback
  }
}

/**
 * Get file type icon
 */
export function getFileIcon(fileType: FileType): string {
  const iconMap: Record<FileType, string> = {
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
  return iconMap[fileType] || '📄';
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Extract Google Drive folder ID from URL
 */
export function extractGoogleDriveFolderId(url: string): string | null {
  const patterns = [
    /\/folders\/([a-zA-Z0-9-_]+)/,
    /id=([a-zA-Z0-9-_]+)/,
    /^([a-zA-Z0-9-_]+)$/, // Direct ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Sanitize filename for safe display
 */
export function sanitizeFilename(filename: string): string {
  return filename.replace(/[<>:"/\\|?*]/g, '_').trim();
}

/**
 * Generate random ID
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (err) {
    console.error('Failed to copy text: ', err);
    return false;
  }
}

/**
 * Download file from blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Calculate processing progress percentage
 */
export function calculateProgress(progress: ProcessingProgress): number {
  const stageWeights = {
    downloading: 0.1,
    extracting: 0.2,
    chunking: 0.3,
    embedding: 0.8,
    storing: 0.95,
    completed: 1.0,
    failed: 0.0,
  };

  const stageWeight = stageWeights[progress.stage] || 0;
  const chunkProgress = progress.total_chunks > 0 
    ? (progress.chunks_processed / progress.total_chunks) * 0.1 
    : 0;

  return Math.min(100, (stageWeight + chunkProgress) * 100);
}

/**
 * Format log level with color
 */
export function getLogLevelColor(level: LogEntry['level']): string {
  const colorMap: Record<LogEntry['level'], string> = {
    DEBUG: 'text-gray-500',
    INFO: 'text-blue-600',
    WARNING: 'text-yellow-600',
    ERROR: 'text-red-600',
    CRITICAL: 'text-red-800 font-bold',
  };
  return colorMap[level] || 'text-gray-600';
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength) + '...';
}

/**
 * Parse error message from API response
 */
export function parseErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  
  if (error && typeof error === 'object') {
    if ('message' in error) return String(error.message);
    if ('error' in error) return String(error.error);
    if ('details' in error) return String(error.details);
  }
  
  return 'An unexpected error occurred';
}

/**
 * Format uptime in human readable format
 */
export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  const parts: string[] = [];
  
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}s`);

  return parts.join(' ');
}

/**
 * Calculate rate per hour
 */
export function calculateRatePerHour(count: number, timeWindowHours: number): number {
  if (timeWindowHours <= 0) return 0;
  return Math.round((count / timeWindowHours) * 100) / 100;
}

/**
 * Validate JSON string
 */
export function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safe JSON parse with fallback
 */
export function safeJSONParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/**
 * Format connection status
 */
export function formatConnectionStatus(connected: boolean, lastSync?: string): {
  status: StatusIndicatorProps['status'];
  label: string;
  description?: string;
} {
  if (!connected) {
    return {
      status: 'error',
      label: 'Disconnected',
      description: 'Connection failed',
    };
  }

  if (!lastSync) {
    return {
      status: 'warning',
      label: 'Connected',
      description: 'No sync data available',
    };
  }

  const lastSyncDate = parseISO(lastSync);
  const hoursSinceSync = (Date.now() - lastSyncDate.getTime()) / (1000 * 60 * 60);

  if (hoursSinceSync < 1) {
    return {
      status: 'success',
      label: 'Connected',
      description: `Last sync: ${formatDistance(lastSyncDate, new Date(), { addSuffix: true })}`,
    };
  }

  if (hoursSinceSync < 24) {
    return {
      status: 'warning',
      label: 'Connected',
      description: `Last sync: ${formatDistance(lastSyncDate, new Date(), { addSuffix: true })}`,
    };
  }

  return {
    status: 'error',
    label: 'Stale',
    description: `Last sync: ${formatDistance(lastSyncDate, new Date(), { addSuffix: true })}`,
  };
}

/**
 * Create array of sequential numbers
 */
export function range(start: number, end: number, step: number = 1): number[] {
  const result: number[] = [];
  for (let i = start; i < end; i += step) {
    result.push(i);
  }
  return result;
}

/**
 * Group array items by key
 */
export function groupBy<T, K extends keyof T>(array: T[], key: K): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key]);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

/**
 * Sort array by multiple criteria
 */
export function sortBy<T>(array: T[], ...criteria: Array<(item: T) => any>): T[] {
  return array.slice().sort((a, b) => {
    for (const criterion of criteria) {
      const aVal = criterion(a);
      const bVal = criterion(b);
      
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
    }
    return 0;
  });
}

/**
 * Get storage quota information
 */
export async function getStorageQuota(): Promise<{
  used: number;
  total: number;
  available: number;
  usagePercent: number;
} | null> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const total = estimate.quota || 0;
      const available = total - used;
      const usagePercent = total > 0 ? (used / total) * 100 : 0;
      
      return { used, total, available, usagePercent };
    } catch (error) {
      console.warn('Failed to get storage estimate:', error);
    }
  }
  return null;
}