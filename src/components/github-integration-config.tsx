'use client'

import { useState, useEffect } from 'react'
import { Integration, GitHubRepository } from '@/lib/types'
import { useAppStore } from '@/lib/store'
import { GitHubService } from '@/lib/integrations'
import { GitHubSyncService, SyncProgress } from '@/lib/github-sync'
import { GitHubIssuesSyncService } from '@/lib/github-issues-sync'
import { githubDB } from '@/lib/github-db'
import { GitHubIssuesViewer } from '@/components/github-issues-viewer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Github, 
  Star, 
  GitFork, 
  Search, 
  Settings, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Plus,
  Minus,
  Calendar,
  Database,
  Code,
  GitBranch,
  Users,
  FileText,
  Activity,
  Download,
  Loader2,
  Bug
} from 'lucide-react'

interface GitHubIntegrationConfigProps {
  integration: Integration
  onSave: (config: any) => void
  onClose: () => void
}

interface RepoSyncConfig {
  repoId: string
  enabled: boolean
  syncBranches: string[]
  syncIssues: boolean
  syncPRs: boolean
  syncCommits: boolean
  syncReleases: boolean
  syncInterval: 'realtime' | '5min' | '15min' | '1hour' | '6hour' | '24hour'
  lastSync?: Date
}

interface GitHubConfig {
  selectedRepos: string[]
  repoConfigs: Record<string, RepoSyncConfig>
  globalSettings: {
    autoSync: boolean
    defaultSyncInterval: string
    maxRepos: number
    webhookEnabled: boolean
  }
}



export function GitHubIntegrationConfig({ integration, onSave, onClose }: GitHubIntegrationConfigProps) {
  const [repositories, setRepositories] = useState<GitHubRepository[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [syncingRepos, setSyncingRepos] = useState<Set<string>>(new Set())
  const [syncProgress, setSyncProgress] = useState<Record<string, SyncProgress>>({})
  const [repoSyncStatus, setRepoSyncStatus] = useState<Record<string, 'synced' | 'not_synced' | 'error' | 'syncing'>>({})
  const [syncingIssues, setSyncingIssues] = useState<Set<string>>(new Set())
  const [issuesSyncProgress, setIssuesSyncProgress] = useState<Record<string, import('../lib/github-issues-sync').IssuesSyncProgress>>({})
  const [issuesSyncStats, setIssuesSyncStats] = useState<Record<string, { totalIssues: number; openIssues: number; closedIssues: number; lastSynced: Date | null }>>({})
  const [config, setConfig] = useState<GitHubConfig>({
    selectedRepos: [],
    repoConfigs: {},
    globalSettings: {
      autoSync: true,
      defaultSyncInterval: '15min',
      maxRepos: 10,
      webhookEnabled: false
    }
  })
  const [bulkSyncMode, setBulkSyncMode] = useState(false)
  const [repoUrl, setRepoUrl] = useState('')
  const [urlProcessing, setUrlProcessing] = useState(false)
  const [showIssuesViewer, setShowIssuesViewer] = useState(false)

  const filteredRepositories = repositories.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedRepositories = repositories.filter(repo => 
    config.selectedRepos.includes(repo.id.toString())
  )

  useEffect(() => {
    loadPreviouslySyncedRepos()
  }, [])

  useEffect(() => {
    if (repositories.length > 0) {
      loadSyncStatus(repositories)
      loadIssuesSyncStats()
    }
  }, [repositories])

  const { setSelectedRepo } = useAppStore()

  const loadPreviouslySyncedRepos = async () => {
    try {
      // Get all previously synced repositories from database
      const syncedRepos = await githubDB.repos.toArray()
      
      if (syncedRepos.length > 0) {
        // Convert database repos to GitHubRepository format
        const dbRepos: GitHubRepository[] = syncedRepos.map(repo => ({
          id: parseInt(repo.id),
          name: repo.name,
          full_name: repo.fullName,
          description: `Previously synced repository (${repo.totalFiles} files)`,
          html_url: `https://github.com/${repo.fullName}`,
          clone_url: `https://github.com/${repo.fullName}.git`,
          default_branch: repo.defaultBranch,
          private: false, // We'll assume public for now since we don't store this
          stargazers_count: 0,
          forks_count: 0
        }))
        
        // Add to repositories list (avoid duplicates)
        setRepositories(prev => {
          const existingIds = new Set(prev.map(r => r.id))
          const newRepos = dbRepos.filter(repo => !existingIds.has(repo.id))
          return [...prev, ...newRepos]
        })
        
        // Auto-select previously synced repos and configure them
        const repoConfigs: Record<string, RepoSyncConfig> = {}
        const selectedIds: string[] = []
        
        syncedRepos.forEach(repo => {
          const repoId = repo.id
          selectedIds.push(repoId)
          repoConfigs[repoId] = {
            repoId,
            enabled: true,
            syncBranches: [repo.defaultBranch],
            syncIssues: true,
            syncPRs: true,
            syncCommits: true,
            syncReleases: true,
            syncInterval: config.globalSettings.defaultSyncInterval as any,
            lastSync: repo.lastSynced
          }
        })
        
        setConfig(prev => ({
          ...prev,
          selectedRepos: [...prev.selectedRepos, ...selectedIds],
          repoConfigs: {
            ...prev.repoConfigs,
            ...repoConfigs
          }
        }))
      }
    } catch (error) {
      console.error('Failed to load previously synced repositories:', error)
    }
  }

  const fetchRepositories = async () => {
    if (!integration.config.token) return

    setLoading(true)
    try {
      const githubService = new GitHubService(integration.config.token)
      const apiRepos = await githubService.getRepositories()
      
      // Merge with existing repositories (from database), avoiding duplicates
      setRepositories(prev => {
        const existingIds = new Set(prev.map(r => r.id))
        const newRepos = apiRepos.filter(repo => !existingIds.has(repo.id))
        return [...prev, ...newRepos]
      })
      
      // Load sync status for all repositories
      const allRepos = repositories.concat(apiRepos.filter(repo => !repositories.some(r => r.id === repo.id)))
      await loadSyncStatus(allRepos)
    } catch (error) {
      console.error('Error fetching repositories:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSyncStatus = async (repos: GitHubRepository[]) => {
    const statusRecord: Record<string, 'synced' | 'not_synced' | 'error' | 'syncing'> = {}
    
    for (const repo of repos) {
      try {
        const syncStatus = await githubDB.getRepoSyncStatus(repo.id.toString())
        if (syncStatus) {
          switch (syncStatus.syncStatus) {
            case 'completed':
              statusRecord[repo.id.toString()] = 'synced'
              break
            case 'error':
              statusRecord[repo.id.toString()] = 'error'
              break
            default:
              statusRecord[repo.id.toString()] = 'not_synced'
          }
        } else {
          statusRecord[repo.id.toString()] = 'not_synced'
        }
      } catch (error) {
        console.warn(`Failed to load sync status for repo ${repo.id}:`, error)
        statusRecord[repo.id.toString()] = 'error'
      }
    }
    
    setRepoSyncStatus(statusRecord)
  }

  const syncRepository = async (repo: GitHubRepository) => {
    if (!integration.config?.token) {
      console.error('GitHub token not found')
      return
    }
    
    // Set this repo as selected when syncing
    setSelectedRepo(repo.id.toString())

    const repoId = repo.id.toString()
    setSyncingRepos(prev => new Set([...prev, repoId]))
    
    try {
      const syncService = new GitHubSyncService(
        integration.config.token,
        (progress: SyncProgress) => {
          setSyncProgress(prev => ({ ...prev, [repoId]: progress }))
        }
      )

      await syncService.syncRepository(repo)
      
      // Update sync status to completed
      setRepoSyncStatus(prev => ({ ...prev, [repoId]: 'synced' }))
      
    } catch (error) {
      console.error('Sync failed:', error)
      setRepoSyncStatus(prev => ({ ...prev, [repoId]: 'error' }))
    } finally {
      setSyncingRepos(prev => {
        const newSet = new Set(prev)
        newSet.delete(repoId)
        return newSet
      })
      setSyncProgress(prev => {
        const { [repoId]: removed, ...rest } = prev
        return rest
      })
    }
  }

  // Load issues sync stats for repositories
  const loadIssuesSyncStats = async () => {
    const statsRecord: Record<string, { totalIssues: number; openIssues: number; closedIssues: number; lastSynced: Date | null }> = {}
    
    for (const repo of repositories) {
      try {
        const issuesSyncService = new GitHubIssuesSyncService(integration.config.token || '')
        const stats = await issuesSyncService.getSyncStats(repo.id.toString())
        statsRecord[repo.id.toString()] = stats
      } catch (error) {
        console.warn(`Failed to load issues sync stats for repo ${repo.id}:`, error)
        statsRecord[repo.id.toString()] = {
          totalIssues: 0,
          openIssues: 0,
          closedIssues: 0,
          lastSynced: null
        }
      }
    }
    
    setIssuesSyncStats(statsRecord)
  }

  // Sync issues for a repository
  const syncRepositoryIssues = async (repo: GitHubRepository) => {
    const repoId = repo.id.toString()
    setSyncingIssues(prev => new Set([...prev, repoId]))
    
    try {
      const issuesSyncService = new GitHubIssuesSyncService(
        integration.config.token || '',
        (progress: import('../lib/github-issues-sync').IssuesSyncProgress) => {
          setIssuesSyncProgress(prev => ({ ...prev, [repoId]: progress }))
        }
      )

      const repoConfig = config.repoConfigs[repoId] || {
        syncEnabled: true,
        syncInterval: '15min',
        branches: ['main']
      }

      await issuesSyncService.syncRepositoryIssues(repo, {
        syncOpen: true, // Default to syncing open issues
        syncClosed: false, // Can be made configurable
        maxIssues: 100 // Can be made configurable
      })
      
      // Reload stats after sync
      await loadIssuesSyncStats()
      
    } catch (error) {
      console.error('Issues sync failed:', error)
    } finally {
      setSyncingIssues(prev => {
        const newSet = new Set(prev)
        newSet.delete(repoId)
        return newSet
      })
      setIssuesSyncProgress(prev => {
        const { [repoId]: removed, ...rest } = prev
        return rest
      })
    }
  }

  const getSyncStatusIcon = (repoId: string) => {
    const isCurrentlySyncing = syncingRepos.has(repoId)
    const status = repoSyncStatus[repoId]
    
    if (isCurrentlySyncing) {
      return <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
    }
    
    switch (status) {
      case 'synced':
        return <CheckCircle className="w-3 h-3 text-green-500" />
      case 'error':
        return <AlertCircle className="w-3 h-3 text-red-500" />
      default:
        return <Clock className="w-3 h-3 text-gray-400" />
    }
  }

  const getSyncStatusText = (repoId: string) => {
    const isCurrentlySyncing = syncingRepos.has(repoId)
    const status = repoSyncStatus[repoId]
    
    if (isCurrentlySyncing) {
      return 'Syncing...'
    }
    
    switch (status) {
      case 'synced':
        return 'Synced'
      case 'error':
        return 'Error'
      default:
        return 'Not synced'
    }
  }

  const toggleRepository = (repoId: string, repo: GitHubRepository) => {
    const isCurrentlySelected = config.selectedRepos.includes(repoId)
    
    if (isCurrentlySelected) {
      // Remove repository
      setConfig(prev => {
        const newRepoConfigs = { ...prev.repoConfigs }
        delete newRepoConfigs[repoId]
        
        return {
          ...prev,
          selectedRepos: prev.selectedRepos.filter(id => id !== repoId),
          repoConfigs: newRepoConfigs
        }
      })
    } else {
      // Add repository with default config
      const defaultConfig: RepoSyncConfig = {
        repoId,
        enabled: true,
        syncBranches: [repo.default_branch],
        syncIssues: true,
        syncPRs: true,
        syncCommits: true,
        syncReleases: true,
        syncInterval: config.globalSettings.defaultSyncInterval as any
      }
      
      setConfig(prev => ({
        ...prev,
        selectedRepos: [...prev.selectedRepos, repoId],
        repoConfigs: {
          ...prev.repoConfigs,
          [repoId]: defaultConfig
        }
      }))
    }
  }

  const selectAllPublicRepos = () => {
    const publicRepos = repositories.filter(repo => !repo.private)
    const repoIds = publicRepos.map(repo => repo.id.toString())
    const newConfigs: Record<string, RepoSyncConfig> = {}
    
    publicRepos.forEach(repo => {
      const repoId = repo.id.toString()
      newConfigs[repoId] = {
        repoId,
        enabled: true,
        syncBranches: [repo.default_branch],
        syncIssues: true,
        syncPRs: true,
        syncCommits: true,
        syncReleases: true,
        syncInterval: config.globalSettings.defaultSyncInterval as any
      }
    })
    
    setConfig(prev => ({
      ...prev,
      selectedRepos: repoIds,
      repoConfigs: {
        ...prev.repoConfigs,
        ...newConfigs
      }
    }))
  }

  const syncAllSelectedRepos = async () => {
    if (!integration.config.token) return
    
    const selectedRepos = repositories.filter(repo => 
      config.selectedRepos.includes(repo.id.toString())
    )
    
    setBulkSyncMode(true)
    
    for (const repo of selectedRepos) {
      try {
        await syncRepository(repo)
        if (config.repoConfigs[repo.id.toString()]?.syncIssues) {
          await syncRepositoryIssues(repo)
        }
      } catch (error) {
        console.error(`Failed to sync ${repo.name}:`, error)
      }
    }
    
    setBulkSyncMode(false)
  }

  const parseGitHubUrl = (url: string): { owner: string; repo: string } | null => {
    try {
      // Handle various GitHub URL formats
      const patterns = [
        /github\.com\/([^/]+)\/([^/]+)(?:\/.*)?$/,  // https://github.com/owner/repo or https://github.com/owner/repo/...
        /^([^/]+)\/([^/]+)$/  // owner/repo format
      ]
      
      let cleanUrl = url.trim()
      if (cleanUrl.startsWith('http')) {
        cleanUrl = cleanUrl.replace(/^https?:\/\//, '')
      }
      
      for (const pattern of patterns) {
        const match = cleanUrl.match(pattern)
        if (match) {
          return { owner: match[1], repo: match[2].replace(/\.git$/, '') }
        }
      }
      
      return null
    } catch {
      return null
    }
  }

  const addRepositoryFromUrl = async () => {
    if (!repoUrl.trim() || !integration.config.token) return
    
    const parsed = parseGitHubUrl(repoUrl)
    if (!parsed) {
      alert('Invalid GitHub URL. Please use format: https://github.com/owner/repo or owner/repo')
      return
    }
    
    setUrlProcessing(true)
    
    try {
      const githubService = new GitHubService(integration.config.token)
      const repo = await githubService.getRepository(parsed.owner, parsed.repo)
      
      if (!repo) {
        alert('Repository not found or not accessible')
        return
      }
      
      // Check if repo already exists in our list
      const existingRepo = repositories.find(r => r.id === repo.id)
      if (existingRepo) {
        alert('Repository is already in your list')
        return
      }
      
      // Add to repositories list
      setRepositories(prev => [...prev, repo])
      
      // Auto-select and configure for issues sync
      const repoId = repo.id.toString()
      const defaultConfig: RepoSyncConfig = {
        repoId,
        enabled: true,
        syncBranches: [repo.default_branch],
        syncIssues: true,
        syncPRs: true,
        syncCommits: true,
        syncReleases: true,
        syncInterval: config.globalSettings.defaultSyncInterval as any
      }
      
      setConfig(prev => ({
        ...prev,
        selectedRepos: [...prev.selectedRepos, repoId],
        repoConfigs: {
          ...prev.repoConfigs,
          [repoId]: defaultConfig
        }
      }))
      
      // Auto-sync issues if requested
      await syncRepositoryIssues(repo)
      
      setRepoUrl('')
      
    } catch (error) {
      console.error('Failed to add repository:', error)
      alert('Failed to add repository. Please check the URL and try again.')
    } finally {
      setUrlProcessing(false)
    }
  }

  const updateRepoConfig = (repoId: string, updates: Partial<RepoSyncConfig>) => {
    setConfig(prev => ({
      ...prev,
      repoConfigs: {
        ...prev.repoConfigs,
        [repoId]: {
          ...prev.repoConfigs[repoId],
          ...updates
        }
      }
    }))
  }

  const updateGlobalSettings = (updates: Partial<GitHubConfig['globalSettings']>) => {
    setConfig(prev => ({
      ...prev,
      globalSettings: {
        ...prev.globalSettings,
        ...updates
      }
    }))
  }

  const getSyncIntervalLabel = (interval: string) => {
    const labels = {
      'realtime': 'Real-time',
      '5min': 'Every 5 minutes',
      '15min': 'Every 15 minutes',
      '1hour': 'Every hour',
      '6hour': 'Every 6 hours',
      '24hour': 'Daily'
    }
    return labels[interval as keyof typeof labels] || interval
  }

  const handleSave = () => {
    onSave({
      ...integration.config,
      githubConfig: config
    })
    onClose()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Github className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">GitHub Integration</h3>
            <p className="text-sm text-muted-foreground">Configure repository sync and monitoring</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowIssuesViewer(true)}
            className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
          >
            <Bug className="w-4 h-4 mr-2" />
            View All Issues
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Configuration</Button>
        </div>
      </div>

      <Tabs defaultValue="repositories" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="repositories">Repository Selection</TabsTrigger>
          <TabsTrigger value="sync-settings">Sync Settings</TabsTrigger>
          <TabsTrigger value="global-settings">Global Settings</TabsTrigger>
        </TabsList>

        {/* Repository Selection Tab */}
        <TabsContent value="repositories" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Select Repositories</CardTitle>
                <Badge variant="secondary">
                  {config.selectedRepos.length} selected
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search repositories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={fetchRepositories} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              
              {/* Add Repository by URL */}
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">
                      Add Repository by URL
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      Enter a GitHub URL to add and sync all issues from any repository
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="https://github.com/owner/repo or owner/repo"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="w-64"
                    onKeyDown={(e) => e.key === 'Enter' && addRepositoryFromUrl()}
                  />
                  <Button 
                    size="sm" 
                    onClick={addRepositoryFromUrl}
                    disabled={!repoUrl.trim() || urlProcessing}
                  >
                    {urlProcessing ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-1" />
                    )}
                    Add & Sync
                  </Button>
                </div>
              </div>
              
              {/* Bulk Actions for Public Repos */}
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Quick Setup for Public Repositories
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Select all public repos and sync all issues & code at once
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={selectAllPublicRepos}
                    disabled={repositories.filter(r => !r.private).length === 0}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Select All Public
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={syncAllSelectedRepos}
                    disabled={config.selectedRepos.length === 0 || bulkSyncMode}
                  >
                    {bulkSyncMode ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-1" />
                    )}
                    Sync All Selected
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {filteredRepositories.map((repo) => {
                    const repoId = repo.id.toString()
                    const isSelected = config.selectedRepos.includes(repoId)
                    const isCurrentlySyncing = syncingRepos.has(repoId)
                    const progress = syncProgress[repoId]
                    const syncStatus = repoSyncStatus[repoId]
                    const isPreviouslySynced = syncStatus === 'synced'
                    const isFromDatabase = repo.description?.includes('Previously synced repository')
                    
                    return (
                      <div
                        key={repo.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          isSelected 
                            ? 'bg-primary/5 border-primary/20' 
                            : isPreviouslySynced 
                            ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-950/30'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleRepository(repoId, repo)}
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm truncate">{repo.name}</h4>
                            {!repo.private && (
                              <Badge variant="secondary" className="text-xs">
                                Public
                              </Badge>
                            )}
                            {repo.private && (
                              <Badge variant="outline" className="text-xs">
                                Private
                              </Badge>
                            )}
                            {isPreviouslySynced && (
                              <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-700">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Synced
                              </Badge>
                            )}
                            {isFromDatabase && (
                              <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                                <Database className="w-3 h-3 mr-1" />
                                Cached
                              </Badge>
                            )}
                            <div className="flex items-center gap-1">
                              {getSyncStatusIcon(repoId)}
                              <span className="text-xs text-muted-foreground">
                                {getSyncStatusText(repoId)}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {isFromDatabase ? 
                              `Previously synced repository with cached data` :
                              repo.description || 'No description available'
                            }
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            {!isFromDatabase && (
                              <>
                                <div className="flex items-center gap-1">
                                  <Star className="w-3 h-3" />
                                  {repo.stargazers_count || 0}
                                </div>
                                <div className="flex items-center gap-1">
                                  <GitFork className="w-3 h-3" />
                                  {repo.forks_count || 0}
                                </div>
                              </>
                            )}
                            <span>{repo.default_branch}</span>
                            {isPreviouslySynced && config.repoConfigs[repoId]?.lastSync && (
                              <span className="text-green-600">
                                Last synced: {new Date(config.repoConfigs[repoId].lastSync!).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          
                          {/* Sync Progress */}
                          {isCurrentlySyncing && progress && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-muted-foreground">
                                  {progress.currentFile}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {progress.completed}/{progress.total}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                                <div 
                                  className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                                  style={{ width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` }}
                                />
                              </div>
                            </div>
                          )}
                          
                          {/* Issues Sync Progress */}
                          {syncingIssues.has(repoId) && issuesSyncProgress[repoId] && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-muted-foreground">
                                  Syncing {issuesSyncProgress[repoId].currentState} issues
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {issuesSyncProgress[repoId].issuesProcessed}/{issuesSyncProgress[repoId].totalIssues || '?'}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                                <div 
                                  className="bg-green-500 h-1 rounded-full transition-all duration-300"
                                  style={{ 
                                    width: `${issuesSyncProgress[repoId].totalIssues > 0 
                                      ? (issuesSyncProgress[repoId].issuesProcessed / issuesSyncProgress[repoId].totalIssues) * 100 
                                      : 0}%` 
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2"
                            onClick={() => syncRepository(repo)}
                            disabled={isCurrentlySyncing || isPreviouslySynced}
                          >
                            {isCurrentlySyncing ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : isPreviouslySynced ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <Download className="w-3 h-3" />
                            )}
                            <span className="ml-1 text-xs">
                              {isCurrentlySyncing ? 'Syncing' : isPreviouslySynced ? 'Synced' : 'Sync'}
                            </span>
                          </Button>
                          
                          {/* Issues Sync Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2"
                            onClick={() => syncRepositoryIssues(repo)}
                            disabled={syncingIssues.has(repoId)}
                          >
                            {syncingIssues.has(repoId) ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Bug className="w-3 h-3" />
                            )}
                            <span className="ml-1 text-xs">
                              {syncingIssues.has(repoId) ? 'Syncing' : 'Issues'}
                            </span>
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sync Settings Tab */}
        <TabsContent value="sync-settings" className="space-y-4">
          <div className="grid gap-4">
            {selectedRepositories.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Github className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium mb-2">No repositories selected</h3>
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    Select repositories from the Repository Selection tab to configure sync settings
                  </p>
                </CardContent>
              </Card>
            ) : (
              selectedRepositories.map((repo) => {
                const repoId = repo.id.toString()
                const repoConfig = config.repoConfigs[repoId]
                
                return (
                  <Card key={repo.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Github className="w-4 h-4" />
                          <CardTitle className="text-base">{repo.name}</CardTitle>
                        </div>
                        <Switch
                          checked={repoConfig?.enabled}
                          onCheckedChange={(enabled) => updateRepoConfig(repoId, { enabled })}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Sync Options */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            <Label className="text-sm">Issues</Label>
                          </div>
                          <Switch
                            checked={repoConfig?.syncIssues}
                            onCheckedChange={(syncIssues) => updateRepoConfig(repoId, { syncIssues })}
                            disabled={!repoConfig?.enabled}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <GitBranch className="w-4 h-4" />
                            <Label className="text-sm">Pull Requests</Label>
                          </div>
                          <Switch
                            checked={repoConfig?.syncPRs}
                            onCheckedChange={(syncPRs) => updateRepoConfig(repoId, { syncPRs })}
                            disabled={!repoConfig?.enabled}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Code className="w-4 h-4" />
                            <Label className="text-sm">Commits</Label>
                          </div>
                          <Switch
                            checked={repoConfig?.syncCommits}
                            onCheckedChange={(syncCommits) => updateRepoConfig(repoId, { syncCommits })}
                            disabled={!repoConfig?.enabled}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            <Label className="text-sm">Releases</Label>
                          </div>
                          <Switch
                            checked={repoConfig?.syncReleases}
                            onCheckedChange={(syncReleases) => updateRepoConfig(repoId, { syncReleases })}
                            disabled={!repoConfig?.enabled}
                          />
                        </div>
                      </div>
                      
                      {/* Sync Interval */}
                      <div className="space-y-2">
                        <Label className="text-sm">Sync Interval</Label>
                        <Select
                          value={repoConfig?.syncInterval}
                          onValueChange={(syncInterval) => updateRepoConfig(repoId, { syncInterval: syncInterval as any })}
                          disabled={!repoConfig?.enabled}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="realtime">Real-time</SelectItem>
                            <SelectItem value="5min">Every 5 minutes</SelectItem>
                            <SelectItem value="15min">Every 15 minutes</SelectItem>
                            <SelectItem value="1hour">Every hour</SelectItem>
                            <SelectItem value="6hour">Every 6 hours</SelectItem>
                            <SelectItem value="24hour">Daily</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Branches */}
                      <div className="space-y-2">
                        <Label className="text-sm">Branches to Sync</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="main, develop, feature/*"
                            value={repoConfig?.syncBranches?.join(', ') || ''}
                            onChange={(e) => updateRepoConfig(repoId, { 
                              syncBranches: e.target.value.split(',').map(b => b.trim()).filter(Boolean)
                            })}
                            disabled={!repoConfig?.enabled}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Comma-separated list of branches. Use * for wildcards.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </TabsContent>

        {/* Global Settings Tab */}
        <TabsContent value="global-settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Global Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Auto Sync */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Auto Sync</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically sync repositories based on their individual schedules
                  </p>
                </div>
                <Switch
                  checked={config.globalSettings.autoSync}
                  onCheckedChange={(autoSync) => updateGlobalSettings({ autoSync })}
                />
              </div>
              
              {/* Default Sync Interval */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Default Sync Interval</Label>
                <Select
                  value={config.globalSettings.defaultSyncInterval}
                  onValueChange={(defaultSyncInterval) => updateGlobalSettings({ defaultSyncInterval })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5min">Every 5 minutes</SelectItem>
                    <SelectItem value="15min">Every 15 minutes</SelectItem>
                    <SelectItem value="1hour">Every hour</SelectItem>
                    <SelectItem value="6hour">Every 6 hours</SelectItem>
                    <SelectItem value="24hour">Daily</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Default sync interval for newly added repositories
                </p>
              </div>
              
              {/* Max Repositories */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Maximum Repositories</Label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={config.globalSettings.maxRepos}
                  onChange={(e) => updateGlobalSettings({ maxRepos: parseInt(e.target.value) || 10 })}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum number of repositories that can be synced simultaneously
                </p>
              </div>
              
              {/* Webhook Support */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Webhook Support</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable real-time updates via GitHub webhooks (requires server setup)
                  </p>
                </div>
                <Switch
                  checked={config.globalSettings.webhookEnabled}
                  onCheckedChange={(webhookEnabled) => updateGlobalSettings({ webhookEnabled })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Issues Viewer Modal */}
      {showIssuesViewer && (
        <GitHubIssuesViewer onClose={() => setShowIssuesViewer(false)} />
      )}
    </div>
  )
}
