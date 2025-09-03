'use client'

/**
 * RAG Tool Standalone - Main Dashboard Page
 * IMPLEMENTS: 4-column status grid, real-time WebSocket updates, activity feed
 * DESIGN: As specified in PRP - blue primary, green success, red error colors
 */

import React, { useState, useEffect } from 'react'
import { 
  Database, 
  HardDrive, 
  Activity, 
  BarChart3, 
  Play, 
  Square, 
  Trash2, 
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  Loader2
} from 'lucide-react'

// Types for real-time data
interface SystemStatus {
  database: boolean
  google_drive: boolean
  processing: boolean
  last_sync: string | null
  monitoring: boolean
}

interface SystemStats {
  total_documents: number
  total_chunks: number
  files_processed: number
  files_cleaned: number
  last_activity: string | null
}

interface ActivityItem {
  id: string
  timestamp: string
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
  icon?: React.ReactNode
}

interface LogEntry {
  timestamp: string
  level: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG'
  message: string
}

// Status Card Component (as specified in PRP)
interface StatusCardProps {
  title: string
  status: 'connected' | 'disconnected' | 'processing' | 'unknown'
  details: string
  icon: React.ReactNode
  onClick?: () => void
}

function StatusCard({ title, status, details, icon, onClick }: StatusCardProps) {
  const statusColors = {
    connected: 'bg-green-500 text-white',
    disconnected: 'bg-red-500 text-white', 
    processing: 'bg-blue-500 text-white',
    unknown: 'bg-gray-500 text-white'
  }

  const cardBorders = {
    connected: 'border-green-200',
    disconnected: 'border-red-200',
    processing: 'border-blue-200', 
    unknown: 'border-gray-200'
  }

  return (
    <div 
      className={`bg-white rounded-lg border-2 ${cardBorders[status]} shadow-sm hover:shadow-md transition-shadow p-6 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        <div className="text-gray-400">
          {icon}
        </div>
      </div>
      
      <div className="space-y-2">
        <span 
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status]}`}
        >
          {status === 'connected' && <CheckCircle className="w-3 h-3 mr-1" />}
          {status === 'disconnected' && <XCircle className="w-3 h-3 mr-1" />}
          {status === 'processing' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
          {status === 'unknown' && <Clock className="w-3 h-3 mr-1" />}
          {status}
        </span>
        <p className="text-xs text-gray-600">{details}</p>
      </div>
    </div>
  )
}

// Quick Actions Component
function QuickActions({ 
  onStart, 
  onStop, 
  onCleanup, 
  onTest, 
  isMonitoring,
  isLoading 
}: {
  onStart: () => void
  onStop: () => void
  onCleanup: () => void
  onTest: () => void
  isMonitoring: boolean
  isLoading: boolean
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={onStart}
          disabled={isMonitoring || isLoading}
          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md ${
            isMonitoring 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          } transition-colors`}
        >
          <Play className="w-4 h-4 mr-2" />
          {isLoading ? 'Starting...' : 'Start Monitoring'}
        </button>
        
        <button
          onClick={onStop}
          disabled={!isMonitoring || isLoading}
          className={`inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
            !isMonitoring
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          } transition-colors`}
        >
          <Square className="w-4 h-4 mr-2" />
          {isLoading ? 'Stopping...' : 'Stop Monitoring'}
        </button>
        
        <button
          onClick={onCleanup}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-orange-300 text-sm font-medium rounded-md bg-white text-orange-700 hover:bg-orange-50 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {isLoading ? 'Cleaning...' : 'Manual Cleanup'}
        </button>
        
        <button
          onClick={onTest}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md bg-white text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          <Upload className="w-4 h-4 mr-2" />
          Test Connection
        </button>
      </div>
    </div>
  )
}

// Activity Feed Component (Real-time updates)
function ActivityFeed({ activities }: { activities: ActivityItem[] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Live Activity Feed</h2>
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {activities.length === 0 ? (
          <p className="text-gray-500 text-sm">No recent activity</p>
        ) : (
          activities.slice(-10).reverse().map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className={`flex-shrink-0 w-2 h-2 mt-2 rounded-full ${
                activity.type === 'success' ? 'bg-green-500' :
                activity.type === 'error' ? 'bg-red-500' :
                activity.type === 'warning' ? 'bg-yellow-500' : 
                'bg-blue-500'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">{activity.message}</p>
                <p className="text-xs text-gray-500">
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// Log Viewer Component
function LogViewer({ logs, onRefresh }: { logs: LogEntry[], onRefresh: () => void }) {
  const [filter, setFilter] = useState<string>('all')
  
  const filteredLogs = logs.filter(log => 
    filter === 'all' || log.level.toLowerCase() === filter.toLowerCase()
  )

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">System Logs</h2>
        <div className="flex items-center space-x-2">
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Levels</option>
            <option value="error">Errors</option>
            <option value="warning">Warnings</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
          <button 
            onClick={onRefresh}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Refresh
          </button>
        </div>
      </div>
      
      <div className="space-y-1 max-h-64 overflow-y-auto font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <p className="text-gray-500">No logs available</p>
        ) : (
          filteredLogs.slice(-50).reverse().map((log, index) => (
            <div key={index} className={`p-2 rounded ${
              log.level === 'ERROR' ? 'bg-red-50 text-red-800' :
              log.level === 'WARNING' ? 'bg-yellow-50 text-yellow-800' :
              log.level === 'INFO' ? 'bg-blue-50 text-blue-800' :
              'bg-gray-50 text-gray-800'
            }`}>
              <span className="text-gray-500">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              {' '}
              <span className="font-semibold">[{log.level}]</span>
              {' '}
              {log.message}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// Main Dashboard Component
export default function Dashboard() {
  // State management
  const [status, setStatus] = useState<SystemStatus>({
    database: false,
    google_drive: false,
    processing: false,
    last_sync: null,
    monitoring: false
  })
  
  const [stats, setStats] = useState<SystemStats>({
    total_documents: 0,
    total_chunks: 0,
    files_processed: 0,
    files_cleaned: 0,
    last_activity: null
  })
  
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // WebSocket connection for real-time updates
  useEffect(() => {
    let ws: WebSocket | null = null
    let reconnectTimer: NodeJS.Timeout
    
    const connect = () => {
      try {
        ws = new WebSocket('ws://localhost:8000/ws')
        
        ws.onopen = () => {
          console.log('✅ WebSocket connected')
          setIsConnected(true)
          addActivity('Connected to server', 'success')
        }
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            
            switch (data.type) {
              case 'initial_status':
                setStatus(data.data)
                break
                
              case 'status_update':
                setStatus(prev => ({ ...prev, ...data.data }))
                addActivity(data.data.message || 'Status updated', 'info')
                break
                
              case 'cleanup_complete':
                addActivity(`Cleaned up ${data.data.cleaned} files`, 'success')
                break
                
              case 'monitoring_started':
                addActivity('File monitoring started', 'success')
                break
                
              case 'monitoring_stopped':
                addActivity('File monitoring stopped', 'info')
                break
                
              case 'heartbeat':
                // Keep connection alive
                break
                
              default:
                console.log('Unknown message type:', data.type)
            }
          } catch (e) {
            console.error('Error parsing WebSocket message:', e)
          }
        }
        
        ws.onclose = () => {
          console.log('WebSocket disconnected')
          setIsConnected(false)
          addActivity('Disconnected from server', 'warning')
          
          // Attempt to reconnect after 5 seconds
          reconnectTimer = setTimeout(connect, 5000)
        }
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          addActivity('Connection error', 'error')
        }
        
      } catch (error) {
        console.error('Failed to create WebSocket:', error)
        addActivity('Failed to connect to server', 'error')
        
        // Retry connection
        reconnectTimer = setTimeout(connect, 5000)
      }
    }
    
    connect()
    
    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (ws) {
        ws.close()
      }
    }
  }, [])

  // Helper function to add activities
  const addActivity = (message: string, type: ActivityItem['type']) => {
    const activity: ActivityItem = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type,
      message
    }
    setActivities(prev => [...prev, activity])
  }

  // API call helper
  const apiCall = async (endpoint: string, method: string = 'GET') => {
    try {
      setIsLoading(true)
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error(`API call failed: ${endpoint}`, error)
      addActivity(`API call failed: ${endpoint}`, 'error')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Action handlers
  const handleStart = async () => {
    try {
      await apiCall('/api/start', 'POST')
      addActivity('Monitoring start requested', 'info')
    } catch (error) {
      addActivity('Failed to start monitoring', 'error')
    }
  }

  const handleStop = async () => {
    try {
      await apiCall('/api/stop', 'POST')
      addActivity('Monitoring stop requested', 'info')
    } catch (error) {
      addActivity('Failed to stop monitoring', 'error')
    }
  }

  const handleCleanup = async () => {
    try {
      const result = await apiCall('/api/cleanup', 'POST')
      addActivity(`Cleanup completed: ${result.cleaned} files cleaned`, 'success')
    } catch (error) {
      addActivity('Manual cleanup failed', 'error')
    }
  }

  const handleTest = async () => {
    try {
      await apiCall('/api/status')
      addActivity('Connection test successful', 'success')
    } catch (error) {
      addActivity('Connection test failed', 'error')
    }
  }

  const refreshLogs = async () => {
    try {
      const result = await apiCall('/api/logs')
      setLogs(result.logs || [])
      addActivity('Logs refreshed', 'info')
    } catch (error) {
      addActivity('Failed to refresh logs', 'error')
    }
  }

  // Determine status for each service
  const getDatabaseStatus = () => {
    if (!isConnected) return 'unknown'
    return status.database ? 'connected' : 'disconnected'
  }

  const getGoogleDriveStatus = () => {
    if (!isConnected) return 'unknown'
    return status.google_drive ? 'connected' : 'disconnected'
  }

  const getProcessingStatus = () => {
    if (!isConnected) return 'unknown'
    return status.processing ? 'processing' : 'connected'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">RAG Pipeline Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                Real-time monitoring and control for your document processing pipeline
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Quick Actions */}
          <QuickActions
            onStart={handleStart}
            onStop={handleStop}
            onCleanup={handleCleanup}
            onTest={handleTest}
            isMonitoring={status.monitoring}
            isLoading={isLoading}
          />

          {/* Status Cards Grid (4-column as specified in PRP) */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatusCard
              title="Database"
              status={getDatabaseStatus()}
              details="Supabase PostgreSQL + pgvector"
              icon={<Database className="h-6 w-6" />}
            />
            
            <StatusCard
              title="Google Drive"
              status={getGoogleDriveStatus()}
              details="Service Account Authentication"
              icon={<HardDrive className="h-6 w-6" />}
            />
            
            <StatusCard
              title="Processing"
              status={getProcessingStatus()}
              details={`${stats.files_processed} files processed`}
              icon={<Activity className="h-6 w-6" />}
            />
            
            <StatusCard
              title="Statistics"
              status={isConnected ? 'connected' : 'unknown'}
              details={`${stats.total_documents} documents, ${stats.total_chunks} chunks`}
              icon={<BarChart3 className="h-6 w-6" />}
            />
          </div>

          {/* Activity Feed and Log Viewer */}
          <div className="grid gap-8 lg:grid-cols-2">
            <ActivityFeed activities={activities} />
            <LogViewer logs={logs} onRefresh={refreshLogs} />
          </div>
        </div>
      </div>
    </div>
  )
}