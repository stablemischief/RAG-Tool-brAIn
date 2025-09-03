import * as React from 'react';
import { cn, getStatusColor } from '@/lib/utils';
import type { StatusIndicatorProps } from '@/types';

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  description,
  showDot = true,
  className,
  children,
}) => {
  const statusColor = getStatusColor(status);
  
  const getDotClasses = () => {
    switch (status) {
      case 'success':
        return 'status-dot-success';
      case 'warning':
        return 'status-dot-warning';
      case 'error':
        return 'status-dot-error';
      case 'info':
        return 'status-dot-info';
      case 'pending':
        return 'status-dot-pending';
      default:
        return 'status-dot';
    }
  };

  const getTextClasses = () => {
    switch (status) {
      case 'success':
        return 'text-success';
      case 'warning':
        return 'text-warning';
      case 'error':
        return 'text-error';
      case 'info':
        return 'text-info';
      case 'pending':
        return 'text-gray-500';
      default:
        return 'text-foreground';
    }
  };

  const getBgClasses = () => {
    switch (status) {
      case 'success':
        return 'bg-success-light border-success';
      case 'warning':
        return 'bg-warning-light border-warning';
      case 'error':
        return 'bg-error-light border-error';
      case 'info':
        return 'bg-info-light border-info';
      case 'pending':
        return 'bg-gray-50 border-gray-300';
      default:
        return 'bg-background border-border';
    }
  };

  return (
    <div className={cn('flex items-start space-x-3', className)}>
      {showDot && (
        <div className="flex items-center justify-center mt-0.5">
          <div className={getDotClasses()} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className={cn('text-sm font-medium', getTextClasses())}>
          {label}
        </div>
        {description && (
          <div className="text-sm text-muted-foreground mt-1">
            {description}
          </div>
        )}
        {children && (
          <div className="mt-2">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

// Badge-style status indicator
const StatusBadge: React.FC<{
  status: StatusIndicatorProps['status'];
  label: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ status, label, size = 'md', className }) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs';
      case 'lg':
        return 'px-4 py-2 text-sm';
      default:
        return 'px-3 py-1 text-sm';
    }
  };

  const getStatusClasses = () => {
    switch (status) {
      case 'success':
        return 'bg-success-light text-success-dark border-success';
      case 'warning':
        return 'bg-warning-light text-warning-dark border-warning';
      case 'error':
        return 'bg-error-light text-error-dark border-error';
      case 'info':
        return 'bg-info-light text-info-dark border-info';
      case 'pending':
        return 'bg-gray-100 text-gray-600 border-gray-300';
      default:
        return 'bg-background text-foreground border-border';
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        getSizeClasses(),
        getStatusClasses(),
        className
      )}
    >
      {label}
    </span>
  );
};

// Connection status component with reconnect functionality
interface ConnectionStatusProps {
  connected: boolean;
  lastSync?: string;
  onReconnect?: () => void;
  className?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  connected,
  lastSync,
  onReconnect,
  className,
}) => {
  const getStatus = (): StatusIndicatorProps['status'] => {
    if (!connected) return 'error';
    if (!lastSync) return 'warning';
    
    const lastSyncDate = new Date(lastSync);
    const hoursSinceSync = (Date.now() - lastSyncDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceSync < 1) return 'success';
    if (hoursSinceSync < 24) return 'warning';
    return 'error';
  };

  const getLabel = () => {
    if (!connected) return 'Disconnected';
    if (!lastSync) return 'Connected (No sync data)';
    return 'Connected';
  };

  const getDescription = () => {
    if (!connected) return 'Connection failed';
    if (!lastSync) return 'Waiting for initial sync';
    return `Last sync: ${new Date(lastSync).toLocaleString()}`;
  };

  return (
    <div className={cn('flex items-center justify-between', className)}>
      <StatusIndicator
        status={getStatus()}
        label={getLabel()}
        description={getDescription()}
      />
      {!connected && onReconnect && (
        <button
          onClick={onReconnect}
          className="ml-3 text-sm text-primary hover:text-primary/80 font-medium"
        >
          Reconnect
        </button>
      )}
    </div>
  );
};

// Processing status with progress
interface ProcessingStatusProps {
  stage: string;
  progress?: number;
  error?: string;
  className?: string;
}

const ProcessingStatus: React.FC<ProcessingStatusProps> = ({
  stage,
  progress,
  error,
  className,
}) => {
  const getStatus = (): StatusIndicatorProps['status'] => {
    if (error) return 'error';
    if (stage === 'completed') return 'success';
    return 'info';
  };

  const getLabel = () => {
    if (error) return 'Processing failed';
    if (stage === 'completed') return 'Completed';
    return `Processing: ${stage}`;
  };

  return (
    <div className={cn('space-y-2', className)}>
      <StatusIndicator
        status={getStatus()}
        label={getLabel()}
        description={error || undefined}
      />
      {progress !== undefined && !error && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export { StatusIndicator, StatusBadge, ConnectionStatus, ProcessingStatus };