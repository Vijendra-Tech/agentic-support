'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { GitHubService } from '@/lib/integrations'
import { GitHubSyncService, SyncProgress } from '@/lib/github-sync'
import { githubDB } from '@/lib/github-db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { 
  Github, 
  Star, 
  GitFork, 
  ExternalLink, 
  Search,
  RefreshCw,
  AlertCircle,
  Loader2,
  Download,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react'
import { GitHubRepository } from '@/lib/types'

interface RepositoryListProps {
  className?: string
}

export function RepositoryList({ className }: RepositoryListProps) {
  const { activeIntegration, setSelectedRepo } = useAppStore()
  const [repositories, setRepositories] = useState<GitHubRepository[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [syncingRepos, setSyncingRepos] = useState<Set<string>>(new Set())
  const [syncProgress, setSyncProgress] = useState<Map<string, SyncProgress>>(new Map())
  const [repoSyncStatus, setRepoSyncStatus] = useState<Map<string, 'synced' | 'pending' | 'error'>>(new Map())

  const isGitHubActive = activeIntegration?.type === 'github' && activeIntegration?.isActive

  const filteredRepositories = repositories.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const fetchRepositories = async () => {
    if (!isGitHubActive || !activeIntegration?.config.token) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const githubService = new GitHubService(activeIntegration.config.token)
      const repos = await githubService.getRepositories()
      setRepositories(repos)
      
      // Load sync status for each repository
      await loadSyncStatus(repos)
    } catch (err) {
      console.error('Error fetching repositories:', err)
      setError('Failed to fetch repositories. Please check your GitHub token.')
    } finally {
      setLoading(false)
    }
  }

  const loadSyncStatus = async (repos: GitHubRepository[]) => {
    const statusMap = new Map<string, 'synced' | 'pending' | 'error'>()
    
    for (const repo of repos) {
      try {
        const syncStatus = await githubDB.getRepoSyncStatus(repo.id.toString())
        if (syncStatus) {
          switch (syncStatus.syncStatus) {
            case 'completed':
              statusMap.set(repo.id.toString(), 'synced')
              break
            case 'error':
              statusMap.set(repo.id.toString(), 'error')
              break
            default:
              statusMap.set(repo.id.toString(), 'pending')
          }
        } else {
          statusMap.set(repo.id.toString(), 'pending')
        }
      } catch (error) {
        console.warn(`Failed to load sync status for repo ${repo.id}:`, error)
        statusMap.set(repo.id.toString(), 'pending')
      }
    }
    
    setRepoSyncStatus(statusMap)
  }

  const syncRepository = async (repo: GitHubRepository) => {
    if (!activeIntegration?.config?.token) {
      setError('GitHub token not found')
      return
    }
    
    // Set this repo as selected when syncing
    setSelectedRepo(repo.id.toString())

    const repoId = repo.id.toString()
    setSyncingRepos(prev => new Set([...prev, repoId]))
    
    try {
      const syncService = new GitHubSyncService(
        activeIntegration.config.token,
        (progress: SyncProgress) => {
          setSyncProgress(prev => new Map([...prev, [repoId, progress]]))
        }
      )

      await syncService.syncRepository(repo)
      
      // Update sync status
      setRepoSyncStatus(prev => new Map([...prev, [repoId, 'synced']]))
      
    } catch (error) {
      console.error('Sync failed:', error)
      setRepoSyncStatus(prev => new Map([...prev, [repoId, 'error']]))
      setError(`Failed to sync ${repo.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSyncingRepos(prev => {
        const newSet = new Set(prev)
        newSet.delete(repoId)
        return newSet
      })
      setSyncProgress(prev => {
        const newMap = new Map(prev)
        newMap.delete(repoId)
        return newMap
      })
    }
  }

  const getSyncStatusIcon = (repoId: string) => {
    const status = repoSyncStatus.get(repoId)
    const isCurrentlySyncing = syncingRepos.has(repoId)
    
    if (isCurrentlySyncing) {
      return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
    }
    
    switch (status) {
      case 'synced':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getSyncStatusText = (repoId: string) => {
    const status = repoSyncStatus.get(repoId)
    const isCurrentlySyncing = syncingRepos.has(repoId)
    
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

  useEffect(() => {
    if (isGitHubActive) {
      fetchRepositories()
    } else {
      setRepositories([])
      setError(null)
    }
  }, [isGitHubActive, activeIntegration])

  if (!isGitHubActive) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="w-5 h-5" />
            GitHub Repositories
          </CardTitle>
          <CardDescription>
            No GitHub integration active. Set up GitHub integration to view repositories.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Github className="w-5 h-5" />
              GitHub Repositories
              <Badge variant="secondary" className="ml-2">
                {activeIntegration.name}
              </Badge>
            </CardTitle>
            <CardDescription>
              Browse and manage your GitHub repositories
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRepositories}
              disabled={loading}
              className="h-8"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span className="ml-1">Refresh</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                // Open GitHub to add repositories
                window.open('https://github.com/new', '_blank')
              }}
              className="h-8"
            >
              <Github className="w-4 h-4" />
              <span className="ml-1">Add Repo</span>
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search repositories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 text-red-700 rounded-md">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {loading && repositories.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Loading repositories...</span>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {filteredRepositories.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Github className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {searchQuery ? 'No repositories match your search' : 'No repositories found'}
                  </p>
                </div>
              ) : (
                filteredRepositories.map((repo) => {
                  const repoId = repo.id.toString()
                  const isCurrentlySyncing = syncingRepos.has(repoId)
                  const progress = syncProgress.get(repoId)
                  
                  return (
                    <Card key={repo.id} className="p-4 hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-sm truncate">
                              {repo.name}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {repo.default_branch}
                            </Badge>
                            <div className="flex items-center gap-1">
                              {getSyncStatusIcon(repoId)}
                              <span className="text-xs text-muted-foreground">
                                {getSyncStatusText(repoId)}
                              </span>
                            </div>
                          </div>
                          
                          <p className="text-xs text-muted-foreground mb-2">
                            {repo.full_name}
                          </p>
                          
                          {repo.description && (
                            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                              {repo.description}
                            </p>
                          )}
                          
                          {/* Sync Progress */}
                          {isCurrentlySyncing && progress && (
                            <div className="mb-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-muted-foreground">
                                  {progress.currentFile}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {progress.completed}/{progress.total}
                                </span>
                              </div>
                              <Progress 
                                value={progress.total > 0 ? (progress.completed / progress.total) * 100 : 0} 
                                className="h-1"
                              />
                            </div>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              <span>Stars</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <GitFork className="w-3 h-3" />
                              <span>Forks</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => syncRepository(repo)}
                            disabled={isCurrentlySyncing}
                          >
                            {isCurrentlySyncing ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Download className="w-3 h-3" />
                            )}
                            <span className="ml-1 text-xs">
                              {isCurrentlySyncing ? 'Syncing' : 'Sync'}
                            </span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => window.open(repo.html_url, '_blank')}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )
                })
              )}
            </div>
          </ScrollArea>
        )}

        {!loading && filteredRepositories.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Showing {filteredRepositories.length} of {repositories.length} repositories
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
