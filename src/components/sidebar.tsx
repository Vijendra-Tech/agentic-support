'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { IntegrationSetupDialog } from '@/components/integration-setup-dialog'
import { GithubRepoDrawer } from '@/components/github-repo-drawer'
import { formatDate } from '@/lib/utils'
import { 
  Plus, 
  Search, 
  MessageSquare, 
  Settings, 
  Github, 
  ExternalLink,
  Trash2,
  Filter,
  Clock,
  Tag
} from 'lucide-react'

export function Sidebar() {
  const { 
    sessions, 
    currentSession, 
    createSession, 
    deleteSession, 
    updateSession,
    integrations,
    activeIntegration,
    setActiveIntegration
  } = useAppStore()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [setupDialogOpen, setSetupDialogOpen] = useState(false)
  const [githubDrawerOpen, setGithubDrawerOpen] = useState(false)

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.messages.some(msg => msg.content.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesFilter = filterStatus === 'all' || session.metadata?.status === filterStatus
    
    return matchesSearch && matchesFilter
  })

  const handleCreateSession = () => {
    const title = `L2/L3 Support - ${new Date().toLocaleDateString()}`
    createSession(title)
  }

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this session?')) {
      deleteSession(sessionId)
    }
  }

  const handleSessionClick = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId)
    if (session) {
      updateSession(sessionId, { ...session })
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500'
      case 'in-progress': return 'bg-yellow-500'
      case 'resolved': return 'bg-green-500'
      case 'closed': return 'bg-gray-500'
      default: return 'bg-gray-400'
    }
  }

  const getPriorityVariant = (priority?: string) => {
    switch (priority) {
      case 'critical': return 'destructive'
      case 'high': return 'warning'
      case 'medium': return 'info'
      case 'low': return 'secondary'
      default: return 'outline'
    }
  }

  return (
    <div className="w-80 h-full flex flex-col bg-background border-r">
      {/* Header */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-3">
          <Button size="sm" onClick={handleCreateSession} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            New Session
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('all')}
            className="h-7 text-xs"
          >
            All
          </Button>
          <Button
            size="sm"
            variant={filterStatus === 'open' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('open')}
            className="h-7 text-xs"
          >
            Open
          </Button>
          <Button
            size="sm"
            variant={filterStatus === 'in-progress' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('in-progress')}
            className="h-7 text-xs"
          >
            Active
          </Button>
        </div>
      </div>

      {/* Sessions List */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-2 space-y-2">
            {filteredSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">No sessions found</p>
              </div>
            ) : (
              filteredSessions.map((session) => (
                <Card
                  key={session.id}
                  className={`cursor-pointer transition-colors hover:bg-accent ${
                    currentSession?.id === session.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleSessionClick(session.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-sm truncate flex-1">
                        {session.title}
                      </h3>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                        onClick={(e) => handleDeleteSession(session.id, e)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      {session.metadata?.status && (
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(session.metadata.status)}`} />
                          <span className="text-xs text-muted-foreground capitalize">
                            {session.metadata.status}
                          </span>
                        </div>
                      )}
                      {session.metadata?.priority && (
                        <Badge variant={getPriorityVariant(session.metadata.priority)} className="text-xs">
                          {session.metadata.priority}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(session.updatedAt)}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {session.messages.length}
                      </div>
                    </div>

                    {session.metadata?.tags && session.metadata.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {session.metadata.tags.slice(0, 2).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            <Tag className="w-2 h-2 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                        {session.metadata.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{session.metadata.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Integrations Section */}
      <div className="border-t p-4">
        <h3 className="font-medium text-sm mb-3">Active Integrations</h3>
        <div className="space-y-2">
          {integrations.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <ExternalLink className="w-6 h-6 mx-auto mb-2" />
              <p className="text-xs">No integrations configured</p>
              <Button 
                size="sm" 
                variant="outline" 
                className="mt-2 h-7 text-xs"
                onClick={() => setSetupDialogOpen(true)}
              >
                <Settings className="w-3 h-3 mr-1" />
                Setup
              </Button>
            </div>
          ) : (
            integrations.map((integration) => (
              <div
                key={integration.id}
                className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                  activeIntegration?.id === integration.id 
                    ? 'bg-primary/10 border border-primary/20' 
                    : 'hover:bg-accent'
                }`}
                onClick={() => {
                  setActiveIntegration(integration)
                  if (integration.type === 'github') {
                    setGithubDrawerOpen(true)
                  }
                }}
              >
                {integration.type === 'github' && <Github className="w-4 h-4" />}
                {integration.type === 'jira' && <ExternalLink className="w-4 h-4" />}
                {integration.type === 'ado' && <ExternalLink className="w-4 h-4" />}
                
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{integration.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {integration.type}
                  </div>
                </div>
                
                <div className={`w-2 h-2 rounded-full ${
                  integration.isActive ? 'bg-green-500' : 'bg-gray-400'
                }`} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Integration Setup Dialog */}
      <IntegrationSetupDialog 
        open={setupDialogOpen} 
        onOpenChange={setSetupDialogOpen} 
      />
      
      {/* GitHub Repository Drawer */}
      <GithubRepoDrawer 
        open={githubDrawerOpen} 
        onOpenChange={setGithubDrawerOpen} 
      />
    </div>
  )
}
