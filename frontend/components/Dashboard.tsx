'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusIndicator, ConnectionStatus } from '@/components/ui/status-indicator';
import { Progress, IndeterminateProgress } from '@/components/ui/progress';
import { systemApi, documentsApi } from '@/lib/api';
import { 
  useWebSocket, 
  useProcessingProgress, 
  useStatusUpdates, 
  useLogStream 
} from '@/lib/websocket';
import { 
  formatBytes, 
  formatNumber, 
  formatDate, 
  formatUptime, 
  cn 
} from '@/lib/utils';
import toast from 'react-hot-toast';
import { 
  PlayIcon, 
  StopIcon, 
  ArrowPathIcon,
  DocumentTextIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ServerIcon
} from '@heroicons/react/24/outline';
import type { 
  SystemStatus, 
  ProcessingStats, 
  DocumentMetadata,
  LogEntry 
} from '@/types';

interface DashboardProps {
  onSetupRequired?: () => void;
  className?: string;
}

const Dashboard: React.FC<DashboardProps> = ({
  onSetupRequired,
  className,
}) => {
  // State management
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [processingStats, setProcessingStats] = useState<ProcessingStats | null>(null);
  const [recentDocuments, setRecentDocuments] = useState<DocumentMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // WebSocket connections
  const { connected: wsConnected, connectionState } = useWebSocket(true);
  const { activeProcessing, totalProgress } = useProcessingProgress();
  const statusUpdates = useStatusUpdates();
  const recentLogs = useLogStream(50);

  // Control functions
  const startMonitoring = useCallback(async () => {
    try {
      const response = await systemApi.startMonitoring();
      if (response.success) {
        toast.success('Monitoring started');
        await loadSystemStatus();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to start monitoring');
    }
  }, []);

  const stopMonitoring = useCallback(async () => {
    try {
      const response = await systemApi.stopMonitoring();
      if (response.success) {
        toast.success('Monitoring stopped');
        await loadSystemStatus();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to stop monitoring');
    }
  }, []);

  const restartMonitoring = useCallback(async () => {
    try {
      const response = await systemApi.restartMonitoring();
      if (response.success) {
        toast.success('Monitoring restarted');
        await loadSystemStatus();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to restart monitoring');
    }
  }, []);

  // Data loading functions
  const loadSystemStatus = useCallback(async () => {
    try {
      const [statusResponse, statsResponse] = await Promise.all([
        systemApi.getStatus(),
        systemApi.getStats(),
      ]);

      if (statusResponse.success && statusResponse.data) {
        setSystemStatus(statusResponse.data);
        
        // Check if setup is required
        if (!statusResponse.data.database_configured) {
          onSetupRequired?.();
          return;
        }
      }

      if (statsResponse.success && statsResponse.data) {
        setProcessingStats(statsResponse.data);
      }

      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load system status');
    }
  }, [onSetupRequired]);

  const loadRecentDocuments = useCallback(async () => {
    try {
      const response = await documentsApi.list(1, 10);
      if (response.success && response.data) {
        setRecentDocuments(response.data.items);
      }
    } catch (err: any) {
      console.error('Failed to load recent documents:', err);
    }
  }, []);

  // Initialize dashboard
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      await Promise.all([
        loadSystemStatus(),
        loadRecentDocuments(),
      ]);
      setIsLoading(false);
    };

    initialize();
  }, [loadSystemStatus, loadRecentDocuments]);

  // Periodic refresh
  useEffect(() => {
    const interval = setInterval(() => {
      loadSystemStatus();
      loadRecentDocuments();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [loadSystemStatus, loadRecentDocuments]);

  // Render system overview
  const renderSystemOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Database</p>
              <div className="flex items-center mt-2">
                <StatusIndicator
                  status={systemStatus?.database_configured && systemStatus?.supabase_connected ? 'success' : 'error'}
                  label={systemStatus?.database_configured && systemStatus?.supabase_connected ? 'Connected' : 'Disconnected'}
                  showDot
                />
              </div>
            </div>
            <ServerIcon className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Google Drive</p>
              <div className="flex items-center mt-2">
                <StatusIndicator
                  status={systemStatus?.google_drive_connected ? 'success' : 'error'}
                  label={systemStatus?.google_drive_connected ? 'Connected' : 'Disconnected'}
                  showDot
                />
              </div>
            </div>
            <CloudArrowUpIcon className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">OpenAI</p>
              <div className="flex items-center mt-2">
                <StatusIndicator
                  status={systemStatus?.openai_connected ? 'success' : 'error'}
                  label={systemStatus?.openai_connected ? 'Connected' : 'Disconnected'}
                  showDot
                />
              </div>
            </div>
            <DocumentTextIcon className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Monitoring</p>
              <div className="flex items-center mt-2">
                <StatusIndicator
                  status={systemStatus?.monitoring_active ? 'success' : 'pending'}
                  label={systemStatus?.monitoring_active ? 'Active' : 'Stopped'}
                  showDot
                />
              </div>
            </div>
            <ClockIcon className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render processing statistics
  const renderProcessingStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Document Processing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Processed</span>
              <span className="font-semibold">{formatNumber(processingStats?.total_files_processed || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pending Files</span>
              <span className="font-semibold">{formatNumber(processingStats?.files_pending || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Vectors</span>
              <span className="font-semibold">{formatNumber(processingStats?.total_vectors_created || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Errors</span>
              <span className="font-semibold text-error">{formatNumber(processingStats?.total_errors || 0)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Rate/Hour</span>
              <span className="font-semibold">{processingStats?.processing_rate_per_hour.toFixed(1) || '0'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Storage Used</span>
              <span className="font-semibold">{formatBytes(processingStats?.storage_used_mb ? processingStats.storage_used_mb * 1024 * 1024 : 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Uptime</span>
              <span className="font-semibold">{formatUptime(systemStatus?.uptime_seconds || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Last Sync</span>
              <span className="font-semibold text-xs">
                {systemStatus?.last_sync ? formatDate(systemStatus.last_sync, { relative: true }) : 'Never'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Today's Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Documents</span>
              <span className="font-semibold">{formatNumber(processingStats?.documents_today || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Errors</span>
              <span className="font-semibold text-error">{formatNumber(processingStats?.errors_today || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">WebSocket</span>
              <StatusIndicator
                status={wsConnected ? 'success' : 'error'}
                label={connectionState}
                showDot
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render active processing
  const renderActiveProcessing = () => {
    if (activeProcessing.size === 0) {
      return null;
    }

    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Active Processing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress
              value={totalProgress}
              label={`Overall Progress (${activeProcessing.size} files)`}
              showPercentage
              animated
            />
            
            <div className="space-y-3">
              {Array.from(activeProcessing.values()).map((progress) => (
                <div key={progress.file_id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-sm">{progress.filename}</h4>
                      <p className="text-xs text-muted-foreground">
                        Stage: {progress.stage} • {progress.chunks_processed}/{progress.total_chunks} chunks
                      </p>
                    </div>
                    <span className="text-xs font-medium">
                      {progress.progress_percent}%
                    </span>
                  </div>
                  
                  <Progress
                    value={progress.progress_percent}
                    variant={progress.stage === 'failed' ? 'error' : 'default'}
                  />
                  
                  {progress.current_operation && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {progress.current_operation}
                    </p>
                  )}
                  
                  {progress.error_message && (
                    <p className="text-xs text-error mt-1">
                      Error: {progress.error_message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render control panel
  const renderControlPanel = () => (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-lg">System Control</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {!systemStatus?.monitoring_active ? (
            <Button
              onClick={startMonitoring}
              leftIcon={<PlayIcon className="h-4 w-4" />}
              variant="success"
            >
              Start Monitoring
            </Button>
          ) : (
            <Button
              onClick={stopMonitoring}
              leftIcon={<StopIcon className="h-4 w-4" />}
              variant="warning"
            >
              Stop Monitoring
            </Button>
          )}
          
          <Button
            onClick={restartMonitoring}
            leftIcon={<ArrowPathIcon className="h-4 w-4" />}
            variant="outline"
          >
            Restart
          </Button>

          <Button
            onClick={() => {
              loadSystemStatus();
              loadRecentDocuments();
            }}
            variant="outline"
          >
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Render recent documents
  const renderRecentDocuments = () => (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-lg">Recent Documents</CardTitle>
      </CardHeader>
      <CardContent>
        {recentDocuments.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No documents processed yet
          </p>
        ) : (
          <div className="space-y-3">
            {recentDocuments.map((doc) => (
              <div key={doc.file_id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{doc.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(doc.created_at)} • {formatBytes(doc.file_size_bytes)} • {doc.chunk_count} chunks
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <StatusIndicator
                    status={
                      doc.processing_status === 'completed' ? 'success' :
                      doc.processing_status === 'failed' ? 'error' :
                      doc.processing_status === 'processing' ? 'info' : 'pending'
                    }
                    label={doc.processing_status}
                    showDot
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Render recent logs
  const renderRecentLogs = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Logs</CardTitle>
      </CardHeader>
      <CardContent>
        {recentLogs.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No recent log entries
          </p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {recentLogs.map((log, index) => (
              <div key={index} className="flex items-start space-x-3 text-sm border-b pb-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(log.timestamp, { includeTime: true, format: 'HH:mm:ss' })}
                </span>
                <span
                  className={cn(
                    'text-xs font-medium px-2 py-1 rounded',
                    log.level === 'ERROR' && 'bg-error-light text-error-dark',
                    log.level === 'WARNING' && 'bg-warning-light text-warning-dark',
                    log.level === 'INFO' && 'bg-info-light text-info-dark',
                    log.level === 'DEBUG' && 'bg-gray-100 text-gray-600'
                  )}
                >
                  {log.level}
                </span>
                <span className="flex-1 text-foreground">{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className={cn('text-center py-12', className)}>
        <div className="spinner h-8 w-8 mx-auto mb-4" />
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('text-center py-12', className)}>
        <ExclamationTriangleIcon className="h-12 w-12 text-error mx-auto mb-4" />
        <p className="text-error mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {renderSystemOverview()}
      {renderProcessingStats()}
      {renderActiveProcessing()}
      {renderControlPanel()}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderRecentDocuments()}
        {renderRecentLogs()}
      </div>
    </div>
  );
};

export default Dashboard;