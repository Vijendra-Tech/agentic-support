'use client'

import { useState } from 'react'
import { Integration } from '@/lib/types'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { IntegrationStatus } from '@/components/integration-status'
import { IntegrationSetupDialog } from '@/components/integration-setup-dialog'
import { GitHubIntegrationConfig } from '@/components/github-integration-config'
import { 
  Search, 
  Plus, 
  Filter, 
  Github, 
  ExternalLink, 
  Settings, 
  Play, 
  Pause, 
  Trash2, 
  TestTube,
  BarChart3,
  Activity,
  Users,
  Code,
  MessageSquare
} from 'lucide-react'

interface IntegrationsManagementProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function IntegrationsManagement({ open, onOpenChange }: IntegrationsManagementProps) {
  const { integrations, setActiveIntegration } = useAppStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [setupDialogOpen, setSetupDialogOpen] = useState(false)
  const [configIntegration, setConfigIntegration] = useState<Integration | null>(null)

  // Filter integrations based on search and filters
  const filteredIntegrations = integrations.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.type.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesType = filterType === 'all' || integration.type === filterType
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && integration.isActive) ||
      (filterStatus === 'inactive' && !integration.isActive) ||
      (integration.health && integration.health.status === filterStatus)
    
    return matchesSearch && matchesType && matchesStatus
  })

  // Group integrations by type
  const groupedIntegrations = filteredIntegrations.reduce((acc, integration) => {
    const type = integration.type
    if (!acc[type]) acc[type] = []
    acc[type].push(integration)
    return acc
  }, {} as Record<string, Integration[]>)

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'github':
        return <Github className="w-4 h-4" />
      case 'jira':
        return <ExternalLink className="w-4 h-4" />
      case 'ado':
        return <ExternalLink className="w-4 h-4" />
      default:
        return <ExternalLink className="w-4 h-4" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'github':
        return 'Code Repository'
      case 'jira':
        return 'Project Management'
      case 'ado':
        return 'Azure DevOps'
      default:
        return type.charAt(0).toUpperCase() + type.slice(1)
    }
  }

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'github':
        return <Code className="w-5 h-5" />
      case 'jira':
      case 'ado':
        return <Users className="w-5 h-5" />
      default:
        return <MessageSquare className="w-5 h-5" />
    }
  }

  const activeCount = integrations.filter(i => i.isActive).length
  const totalCount = integrations.length

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-y-0 right-0 w-full max-w-4xl bg-background border-l shadow-lg">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Settings className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Integration Management</h2>
                <p className="text-sm text-muted-foreground">
                  {activeCount} of {totalCount} integrations active
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setSetupDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Integration
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="p-6 border-b bg-muted/20">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search integrations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Type Filter */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={filterType === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilterType('all')}
                >
                  All Types
                </Button>
                <Button
                  size="sm"
                  variant={filterType === 'github' ? 'default' : 'outline'}
                  onClick={() => setFilterType('github')}
                >
                  <Github className="w-3 h-3 mr-1" />
                  GitHub
                </Button>
                <Button
                  size="sm"
                  variant={filterType === 'jira' ? 'default' : 'outline'}
                  onClick={() => setFilterType('jira')}
                >
                  Jira
                </Button>
                <Button
                  size="sm"
                  variant={filterType === 'ado' ? 'default' : 'outline'}
                  onClick={() => setFilterType('ado')}
                >
                  Azure
                </Button>
              </div>

              {/* Status Filter */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={filterStatus === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('all')}
                >
                  All Status
                </Button>
                <Button
                  size="sm"
                  variant={filterStatus === 'active' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('active')}
                >
                  Active
                </Button>
                <Button
                  size="sm"
                  variant={filterStatus === 'error' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('error')}
                >
                  Errors
                </Button>
              </div>
            </div>
          </div>

          {/* Integrations Content */}
          <ScrollArea className="flex-1">
            <div className="p-6">
              {filteredIntegrations.length === 0 ? (
                <div className="text-center py-12">
                  <Settings className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium mb-2">No integrations found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || filterType !== 'all' || filterStatus !== 'all'
                      ? 'Try adjusting your search or filters'
                      : 'Get started by adding your first integration'
                    }
                  </p>
                  {!searchQuery && filterType === 'all' && filterStatus === 'all' && (
                    <Button onClick={() => setSetupDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Integration
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedIntegrations).map(([type, typeIntegrations]) => (
                    <div key={type} className="space-y-3">
                      {/* Category Header */}
                      <div className="flex items-center gap-2 pb-2 border-b">
                        {getCategoryIcon(type)}
                        <h3 className="font-medium text-lg">{getTypeLabel(type)}</h3>
                        <Badge variant="secondary" className="ml-auto">
                          {typeIntegrations.length}
                        </Badge>
                      </div>

                      {/* Integration Cards */}
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {typeIntegrations.map((integration) => (
                          <Card key={integration.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  {getTypeIcon(integration.type)}
                                  <CardTitle className="text-base">{integration.name}</CardTitle>
                                </div>
                                <IntegrationStatus integration={integration} />
                              </div>
                              <p className="text-sm text-muted-foreground capitalize">
                                {integration.type}
                              </p>
                            </CardHeader>
                            <CardContent className="pt-0">
                              {/* Detailed Status */}
                              <div className="space-y-3">
                                <IntegrationStatus integration={integration} showDetails={true} />
                                
                                {/* Action Buttons */}
                                <div className="flex gap-2 pt-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => {
                                      setActiveIntegration(integration)
                                      setConfigIntegration(integration)
                                    }}
                                  >
                                    <Settings className="w-3 h-3 mr-1" />
                                    Configure
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      // Toggle integration active state
                                    }}
                                  >
                                    {integration.isActive ? (
                                      <Pause className="w-3 h-3" />
                                    ) : (
                                      <Play className="w-3 h-3" />
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      // Test connection
                                    }}
                                  >
                                    <TestTube className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Integration Setup Dialog */}
      <IntegrationSetupDialog 
        open={setupDialogOpen} 
        onOpenChange={setSetupDialogOpen} 
      />
      
      {/* GitHub Integration Configuration */}
      {configIntegration?.type === 'github' && (
        <div className="fixed inset-0 z-60 bg-background/80 backdrop-blur-sm">
          <div className="fixed inset-y-0 right-0 w-full max-w-5xl bg-background border-l shadow-lg">
            <div className="h-full overflow-auto p-6">
              <GitHubIntegrationConfig
                integration={configIntegration}
                onSave={(config) => {
                  // Update integration configuration
                  console.log('Saving GitHub config:', config)
                  setConfigIntegration(null)
                }}
                onClose={() => setConfigIntegration(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
