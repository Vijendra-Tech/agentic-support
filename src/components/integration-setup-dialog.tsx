'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Github, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Integration } from '@/lib/types'

interface IntegrationSetupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function IntegrationSetupDialog({ open, onOpenChange }: IntegrationSetupDialogProps) {
  const { addIntegration, integrations } = useAppStore()
  const [activeTab, setActiveTab] = useState('github')
  const [isLoading, setIsLoading] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')

  // GitHub form state
  const [githubForm, setGithubForm] = useState({
    name: '',
    token: '',
  })

  // JIRA form state
  const [jiraForm, setJiraForm] = useState({
    name: '',
    baseUrl: '',
    username: '',
    apiKey: '',
  })

  // Azure DevOps form state
  const [adoForm, setAdoForm] = useState({
    name: '',
    baseUrl: '',
    token: '',
  })

  const resetForms = () => {
    setGithubForm({ name: '', token: '' })
    setJiraForm({ name: '', baseUrl: '', username: '', apiKey: '' })
    setAdoForm({ name: '', baseUrl: '', token: '' })
    setTestStatus('idle')
    setTestMessage('')
  }

  const testConnection = async (type: 'github' | 'jira' | 'ado') => {
    setIsLoading(true)
    setTestStatus('testing')
    setTestMessage('Testing connection...')

    try {
      // Simulate connection test - in a real app, you'd make actual API calls
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // For now, we'll just validate that required fields are filled
      let isValid = false
      
      switch (type) {
        case 'github':
          isValid = githubForm.name.trim() !== '' && githubForm.token.trim() !== ''
          break
        case 'jira':
          isValid = jiraForm.name.trim() !== '' && 
                   jiraForm.baseUrl.trim() !== '' && 
                   jiraForm.username.trim() !== '' && 
                   jiraForm.apiKey.trim() !== ''
          break
        case 'ado':
          isValid = adoForm.name.trim() !== '' && 
                   adoForm.baseUrl.trim() !== '' && 
                   adoForm.token.trim() !== ''
          break
      }

      if (isValid) {
        setTestStatus('success')
        setTestMessage('Connection successful!')
      } else {
        setTestStatus('error')
        setTestMessage('Please fill in all required fields')
      }
    } catch (error) {
      setTestStatus('error')
      setTestMessage('Connection failed. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (type: 'github' | 'jira' | 'ado') => {
    setIsLoading(true)

    try {
      let integration: Omit<Integration, 'id'>

      switch (type) {
        case 'github':
          integration = {
            name: githubForm.name,
            type: 'github',
            config: {
              token: githubForm.token,
            },
            isActive: true,
          }
          break
        case 'jira':
          integration = {
            name: jiraForm.name,
            type: 'jira',
            config: {
              baseUrl: jiraForm.baseUrl,
              username: jiraForm.username,
              apiKey: jiraForm.apiKey,
            },
            isActive: true,
          }
          break
        case 'ado':
          integration = {
            name: adoForm.name,
            type: 'ado',
            config: {
              baseUrl: adoForm.baseUrl,
              token: adoForm.token,
            },
            isActive: true,
          }
          break
        default:
          throw new Error('Invalid integration type')
      }

      addIntegration(integration)
      resetForms()
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving integration:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getExistingIntegration = (type: string) => {
    return integrations.find(int => int.type === type)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Setup Integrations</DialogTitle>
          <DialogDescription>
            Connect your external services to enhance your L2/L3 support workflow
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="github" className="flex items-center gap-2">
              <Github className="w-4 h-4" />
              GitHub
              {getExistingIntegration('github') && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  Configured
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="jira" className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              JIRA
              {getExistingIntegration('jira') && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  Configured
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="ado" className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Azure DevOps
              {getExistingIntegration('ado') && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  Configured
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* GitHub Tab */}
          <TabsContent value="github" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Github className="w-5 h-5" />
                  GitHub Integration
                </CardTitle>
                <CardDescription>
                  Connect to GitHub for issue management, pull requests, and repository access
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="github-name">Integration Name</Label>
                  <Input
                    id="github-name"
                    placeholder="e.g., My GitHub Account"
                    value={githubForm.name}
                    onChange={(e) => setGithubForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="github-token">Personal Access Token</Label>
                  <Input
                    id="github-token"
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={githubForm.token}
                    onChange={(e) => setGithubForm(prev => ({ ...prev, token: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Generate a token at GitHub Settings → Developer settings → Personal access tokens
                  </p>
                </div>

                {testStatus !== 'idle' && (
                  <div className={`flex items-center gap-2 p-3 rounded-md ${
                    testStatus === 'success' ? 'bg-green-50 text-green-700' :
                    testStatus === 'error' ? 'bg-red-50 text-red-700' :
                    'bg-blue-50 text-blue-700'
                  }`}>
                    {testStatus === 'success' && <CheckCircle2 className="w-4 h-4" />}
                    {testStatus === 'error' && <AlertCircle className="w-4 h-4" />}
                    <span className="text-sm">{testMessage}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => testConnection('github')}
                    disabled={isLoading}
                  >
                    Test Connection
                  </Button>
                  <Button
                    onClick={() => handleSave('github')}
                    disabled={isLoading || testStatus !== 'success'}
                  >
                    Save Integration
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* JIRA Tab */}
          <TabsContent value="jira" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="w-5 h-5" />
                  JIRA Integration
                </CardTitle>
                <CardDescription>
                  Connect to JIRA for ticket management and workflow automation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="jira-name">Integration Name</Label>
                  <Input
                    id="jira-name"
                    placeholder="e.g., Company JIRA"
                    value={jiraForm.name}
                    onChange={(e) => setJiraForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jira-url">JIRA Base URL</Label>
                  <Input
                    id="jira-url"
                    placeholder="https://your-domain.atlassian.net"
                    value={jiraForm.baseUrl}
                    onChange={(e) => setJiraForm(prev => ({ ...prev, baseUrl: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jira-username">Email/Username</Label>
                  <Input
                    id="jira-username"
                    placeholder="your-email@company.com"
                    value={jiraForm.username}
                    onChange={(e) => setJiraForm(prev => ({ ...prev, username: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jira-token">API Token</Label>
                  <Input
                    id="jira-token"
                    type="password"
                    placeholder="Your JIRA API token"
                    value={jiraForm.apiKey}
                    onChange={(e) => setJiraForm(prev => ({ ...prev, apiKey: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Generate a token at JIRA Account Settings → Security → API tokens
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => testConnection('jira')}
                    disabled={isLoading}
                  >
                    Test Connection
                  </Button>
                  <Button
                    onClick={() => handleSave('jira')}
                    disabled={isLoading || testStatus !== 'success'}
                  >
                    Save Integration
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Azure DevOps Tab */}
          <TabsContent value="ado" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="w-5 h-5" />
                  Azure DevOps Integration
                </CardTitle>
                <CardDescription>
                  Connect to Azure DevOps for work items, builds, and release management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ado-name">Integration Name</Label>
                  <Input
                    id="ado-name"
                    placeholder="e.g., Company Azure DevOps"
                    value={adoForm.name}
                    onChange={(e) => setAdoForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ado-url">Organization URL</Label>
                  <Input
                    id="ado-url"
                    placeholder="https://dev.azure.com/your-organization"
                    value={adoForm.baseUrl}
                    onChange={(e) => setAdoForm(prev => ({ ...prev, baseUrl: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ado-token">Personal Access Token</Label>
                  <Input
                    id="ado-token"
                    type="password"
                    placeholder="Your Azure DevOps PAT"
                    value={adoForm.token}
                    onChange={(e) => setAdoForm(prev => ({ ...prev, token: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Generate a token at Azure DevOps → User Settings → Personal access tokens
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => testConnection('ado')}
                    disabled={isLoading}
                  >
                    Test Connection
                  </Button>
                  <Button
                    onClick={() => handleSave('ado')}
                    disabled={isLoading || testStatus !== 'success'}
                  >
                    Save Integration
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>


      </DialogContent>
    </Dialog>
  )
}



