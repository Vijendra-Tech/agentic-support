'use client'

import { Integration } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Clock, 
  Wifi, 
  WifiOff,
  Loader2,
  AlertTriangle,
  Activity
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface IntegrationStatusProps {
  integration: Integration
  showDetails?: boolean
}

export function IntegrationStatus({ integration, showDetails = false }: IntegrationStatusProps) {
  const { health, activity, lastSync } = integration
  
  // Handle cases where health data might be missing (for backward compatibility)
  if (!health) {
    return (
      <div className={`w-2 h-2 rounded-full ${
        integration.isActive ? 'bg-green-500 dark:bg-green-400' : 'bg-gray-400 dark:bg-gray-500'
      }`} />
    )
  }

  const getStatusIcon = () => {
    switch (health.status) {
      case 'connected':
        return <CheckCircle className="w-3 h-3 text-green-500" />
      case 'syncing':
        return <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
      case 'error':
        return <XCircle className="w-3 h-3 text-red-500" />
      case 'rate_limited':
        return <Clock className="w-3 h-3 text-yellow-500" />
      case 'disconnected':
        return <WifiOff className="w-3 h-3 text-gray-500" />
      case 'warning':
        return <AlertTriangle className="w-3 h-3 text-orange-500" />
      default:
        return <Wifi className="w-3 h-3 text-gray-400" />
    }
  }

  const getStatusColor = () => {
    switch (health.status) {
      case 'connected':
        return 'bg-green-500'
      case 'syncing':
        return 'bg-blue-500'
      case 'error':
        return 'bg-red-500'
      case 'rate_limited':
        return 'bg-yellow-500'
      case 'disconnected':
        return 'bg-gray-500'
      case 'warning':
        return 'bg-orange-500'
      default:
        return 'bg-gray-400'
    }
  }

  const getStatusText = () => {
    switch (health.status) {
      case 'connected':
        return 'Connected'
      case 'syncing':
        return 'Syncing...'
      case 'error':
        return 'Error'
      case 'rate_limited':
        return 'Rate Limited'
      case 'disconnected':
        return 'Disconnected'
      case 'warning':
        return 'Warning'
      default:
        return 'Unknown'
    }
  }

  const getTooltipContent = () => {
    const lastChecked = formatDistanceToNow(health.lastChecked, { addSuffix: true })
    const lastSyncText = lastSync ? formatDistanceToNow(lastSync, { addSuffix: true }) : 'Never'
    
    return (
      <div className="space-y-1 text-xs">
        <div className="font-medium">{getStatusText()}</div>
        <div>Last checked: {lastChecked}</div>
        <div>Last sync: {lastSyncText}</div>
        {health.responseTime && (
          <div>Response time: {health.responseTime}ms</div>
        )}
        {health.errorMessage && (
          <div className="text-red-400">Error: {health.errorMessage}</div>
        )}
        {health.apiUsage && (
          <div>
            API Usage: {health.apiUsage.used}/{health.apiUsage.limit}
            {health.apiUsage.resetTime && (
              <span className="block">
                Resets: {formatDistanceToNow(health.apiUsage.resetTime, { addSuffix: true })}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }

  if (!showDetails) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              {getStatusIcon()}
              {activity?.newItems && activity.newItems > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-xs">
                  {activity.newItems}
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            {getTooltipContent()}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className="space-y-2">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm font-medium">{getStatusText()}</span>
        </div>
        {activity?.newItems && activity.newItems > 0 && (
          <Badge variant="secondary" className="h-5 px-2 text-xs">
            {activity.newItems} new
          </Badge>
        )}
      </div>

      {/* Detailed Status Info */}
      <div className="space-y-1 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>Last checked:</span>
          <span>{formatDistanceToNow(health.lastChecked, { addSuffix: true })}</span>
        </div>
        
        {lastSync && (
          <div className="flex justify-between">
            <span>Last sync:</span>
            <span>{formatDistanceToNow(lastSync, { addSuffix: true })}</span>
          </div>
        )}
        
        {health.responseTime && (
          <div className="flex justify-between">
            <span>Response time:</span>
            <span>{health.responseTime}ms</span>
          </div>
        )}
        
        {activity?.lastActivity && (
          <div className="flex justify-between">
            <span>Last activity:</span>
            <span>{formatDistanceToNow(activity.lastActivity, { addSuffix: true })}</span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {health.errorMessage && (
        <div className="p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-400">
          {health.errorMessage}
        </div>
      )}

      {/* API Usage */}
      {health.apiUsage && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>API Usage</span>
            <span>{health.apiUsage.used}/{health.apiUsage.limit}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
            <div 
              className={`h-1 rounded-full transition-all duration-300 ${
                (health.apiUsage.used / health.apiUsage.limit) > 0.8 
                  ? 'bg-red-500' 
                  : (health.apiUsage.used / health.apiUsage.limit) > 0.6 
                    ? 'bg-yellow-500' 
                    : 'bg-green-500'
              }`}
              style={{ width: `${(health.apiUsage.used / health.apiUsage.limit) * 100}%` }}
            />
          </div>
          {health.apiUsage.resetTime && (
            <div className="text-xs text-muted-foreground">
              Resets {formatDistanceToNow(health.apiUsage.resetTime, { addSuffix: true })}
            </div>
          )}
        </div>
      )}

      {/* Recent Activity */}
      {activity?.recentActions && activity.recentActions.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs font-medium">
            <Activity className="w-3 h-3" />
            Recent Activity
          </div>
          <div className="space-y-1">
            {activity.recentActions.slice(0, 3).map((action, index) => (
              <div key={index} className="text-xs text-muted-foreground pl-4 border-l-2 border-muted">
                {action}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
