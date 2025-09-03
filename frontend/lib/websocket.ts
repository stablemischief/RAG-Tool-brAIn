import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { 
  WebSocketMessage, 
  ProcessingProgress, 
  StatusUpdate, 
  LogEntry,
  UseWebSocketReturn 
} from '@/types';

// WebSocket configuration
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 1000; // Start with 1 second

// Event types for type safety
export type WebSocketEventType = 
  | 'status_update'
  | 'processing_progress'
  | 'log_entry'
  | 'stats_update'
  | 'error'
  | 'connection_status';

// Custom WebSocket event interface extending the base message
export interface WebSocketEvent extends WebSocketMessage {
  id?: string;
  client_id?: string;
}

/**
 * WebSocket client class for managing real-time connections
 */
class WebSocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private eventHandlers = new Map<string, Set<(data: WebSocketEvent) => void>>();
  private connectionHandlers = new Set<(connected: boolean, state: string) => void>();

  constructor(private url: string) {}

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.socket = io(this.url, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true,
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.clearReconnectTimer();
        this.notifyConnectionHandlers(true, 'connected');
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        this.notifyConnectionHandlers(false, 'disconnected');
        
        // Attempt to reconnect unless disconnect was intentional
        if (reason !== 'io client disconnect') {
          this.scheduleReconnect();
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        this.notifyConnectionHandlers(false, 'error');
        
        if (this.reconnectAttempts === 0) {
          reject(error);
        } else {
          this.scheduleReconnect();
        }
      });

      // Handle all message types
      this.socket.on('message', (data: WebSocketEvent) => {
        this.handleMessage(data);
      });

      // Specific event handlers for type safety
      this.socket.on('status_update', (data: StatusUpdate) => {
        this.handleMessage({ type: 'status_update', timestamp: new Date().toISOString(), data });
      });

      this.socket.on('processing_progress', (data: ProcessingProgress) => {
        this.handleMessage({ type: 'processing_progress', timestamp: new Date().toISOString(), data });
      });

      this.socket.on('log_entry', (data: LogEntry) => {
        this.handleMessage({ type: 'log_entry', timestamp: new Date().toISOString(), data });
      });

      this.socket.on('stats_update', (data: unknown) => {
        this.handleMessage({ type: 'stats_update', timestamp: new Date().toISOString(), data });
      });

      this.socket.on('error', (data: { message: string; code?: string }) => {
        this.handleMessage({ type: 'error', timestamp: new Date().toISOString(), data });
      });
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.clearReconnectTimer();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.notifyConnectionHandlers(false, 'disconnected');
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Send message to server
   */
  send(event: string, data: unknown): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  }

  /**
   * Subscribe to specific event type
   */
  on(eventType: WebSocketEventType, handler: (data: WebSocketEvent) => void): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    
    this.eventHandlers.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(eventType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.eventHandlers.delete(eventType);
        }
      }
    };
  }

  /**
   * Subscribe to connection status changes
   */
  onConnection(handler: (connected: boolean, state: string) => void): () => void {
    this.connectionHandlers.add(handler);
    
    // Immediately notify of current state
    handler(this.isConnected(), this.isConnected() ? 'connected' : 'disconnected');

    return () => {
      this.connectionHandlers.delete(handler);
    };
  }

  private handleMessage(message: WebSocketEvent): void {
    const handlers = this.eventHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error('Error in WebSocket event handler:', error);
        }
      });
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= RECONNECT_ATTEMPTS) {
      console.error('Max reconnect attempts reached');
      this.notifyConnectionHandlers(false, 'error');
      return;
    }

    const delay = RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts);
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${RECONNECT_ATTEMPTS})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.notifyConnectionHandlers(false, 'reconnecting');
      this.connect().catch(() => {
        // Error is handled in connect method
      });
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private notifyConnectionHandlers(connected: boolean, state: string): void {
    this.connectionHandlers.forEach(handler => {
      try {
        handler(connected, state);
      } catch (error) {
        console.error('Error in connection handler:', error);
      }
    });
  }
}

// Global WebSocket client instance
let globalClient: WebSocketClient | null = null;

/**
 * Get or create global WebSocket client
 */
export function getWebSocketClient(): WebSocketClient {
  if (!globalClient) {
    globalClient = new WebSocketClient(WS_URL);
  }
  return globalClient;
}

/**
 * React hook for WebSocket connection
 */
export function useWebSocket(autoConnect = true): UseWebSocketReturn {
  const [connected, setConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketEvent | null>(null);
  
  const clientRef = useRef<WebSocketClient | null>(null);
  const messageHandlerRef = useRef<((data: WebSocketEvent) => void) | null>(null);
  const connectionHandlerRef = useRef<((connected: boolean, state: string) => void) | null>(null);

  // Initialize client
  useEffect(() => {
    clientRef.current = getWebSocketClient();
  }, []);

  // Connection management
  const connect = useCallback(async () => {
    if (!clientRef.current) return;

    try {
      setConnectionState('connecting');
      await clientRef.current.connect();
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setConnectionState('error');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (!clientRef.current) return;
    clientRef.current.disconnect();
  }, []);

  const sendMessage = useCallback((message: WebSocketEvent) => {
    if (!clientRef.current?.isConnected()) {
      console.warn('Cannot send message: WebSocket not connected');
      return;
    }
    clientRef.current.send('message', message);
  }, []);

  // Set up event listeners
  useEffect(() => {
    if (!clientRef.current) return;

    // Connection status handler
    connectionHandlerRef.current = (isConnected: boolean, state: string) => {
      setConnected(isConnected);
      setConnectionState(state as any);
    };

    const unsubscribeConnection = clientRef.current.onConnection(connectionHandlerRef.current);

    // Universal message handler
    messageHandlerRef.current = (data: WebSocketEvent) => {
      setLastMessage(data);
    };

    const unsubscribeMessages = clientRef.current.on('status_update', messageHandlerRef.current);
    const unsubscribeProgress = clientRef.current.on('processing_progress', messageHandlerRef.current);
    const unsubscribeLog = clientRef.current.on('log_entry', messageHandlerRef.current);
    const unsubscribeStats = clientRef.current.on('stats_update', messageHandlerRef.current);
    const unsubscribeError = clientRef.current.on('error', messageHandlerRef.current);

    return () => {
      unsubscribeConnection();
      unsubscribeMessages();
      unsubscribeProgress();
      unsubscribeLog();
      unsubscribeStats();
      unsubscribeError();
    };
  }, []);

  // Auto connect
  useEffect(() => {
    if (autoConnect && clientRef.current && !connected && connectionState === 'disconnected') {
      connect();
    }
  }, [autoConnect, connected, connectionState, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        disconnect();
      }
    };
  }, [disconnect]);

  return {
    connected,
    lastMessage,
    connectionState,
    connect,
    disconnect,
    sendMessage,
  };
}

/**
 * Hook for listening to specific WebSocket events
 */
export function useWebSocketEvent<T = unknown>(
  eventType: WebSocketEventType,
  handler: (data: T) => void,
  deps: React.DependencyList = []
): void {
  const clientRef = useRef<WebSocketClient | null>(null);

  useEffect(() => {
    clientRef.current = getWebSocketClient();
  }, []);

  useEffect(() => {
    if (!clientRef.current) return;

    const unsubscribe = clientRef.current.on(eventType, (message) => {
      handler(message.data as T);
    });

    return unsubscribe;
  }, [eventType, ...deps]);
}

/**
 * Hook for processing progress updates
 */
export function useProcessingProgress(): {
  activeProcessing: Map<string, ProcessingProgress>;
  totalProgress: number;
} {
  const [activeProcessing, setActiveProcessing] = useState<Map<string, ProcessingProgress>>(new Map());

  useWebSocketEvent<ProcessingProgress>('processing_progress', (data) => {
    setActiveProcessing(prev => {
      const next = new Map(prev);
      
      if (data.stage === 'completed' || data.stage === 'failed') {
        // Remove completed/failed processing
        next.delete(data.file_id);
      } else {
        // Update or add processing
        next.set(data.file_id, data);
      }
      
      return next;
    });
  });

  const totalProgress = useMemo(() => {
    if (activeProcessing.size === 0) return 100;
    
    const progressSum = Array.from(activeProcessing.values())
      .reduce((sum, progress) => sum + progress.progress_percent, 0);
    
    return Math.round(progressSum / activeProcessing.size);
  }, [activeProcessing]);

  return {
    activeProcessing,
    totalProgress,
  };
}

/**
 * Hook for real-time log streaming
 */
export function useLogStream(maxEntries = 100): LogEntry[] {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useWebSocketEvent<LogEntry>('log_entry', (data) => {
    setLogs(prev => {
      const next = [data, ...prev];
      return next.slice(0, maxEntries);
    });
  });

  return logs;
}

/**
 * Hook for system status updates
 */
export function useStatusUpdates(): Map<string, StatusUpdate> {
  const [statusMap, setStatusMap] = useState<Map<string, StatusUpdate>>(new Map());

  useWebSocketEvent<StatusUpdate>('status_update', (data) => {
    setStatusMap(prev => new Map(prev.set(data.component, data)));
  });

  return statusMap;
}

// Export client for direct use when needed
export { WebSocketClient };