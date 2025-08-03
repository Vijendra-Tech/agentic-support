'use client'

import { useState, useEffect } from 'react'
import { GitHubIssueDB, githubDB } from '@/lib/github-db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Search, 
  ExternalLink, 
  Calendar, 
  User, 
  MessageSquare, 
  AlertCircle, 
  CheckCircle2, 
  Filter,
  Bug,
  RefreshCw,
  Eye,
  X
} from 'lucide-react'

interface GitHubIssuesViewerProps {
  onClose: () => void
}

export function GitHubIssuesViewer({ onClose }: GitHubIssuesViewerProps) {
  const [issues, setIssues] = useState<GitHubIssueDB[]>([])
  const [filteredIssues, setFilteredIssues] = useState<GitHubIssueDB[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [stateFilter, setStateFilter] = useState<'all' | 'open' | 'closed'>('all')
  const [repoFilter, setRepoFilter] = useState<string>('all')
  const [repositories, setRepositories] = useState<Array<{ id: string; name: string; fullName: string }>>([])

  useEffect(() => {
    loadAllIssues()
  }, [])

  useEffect(() => {
    filterIssues()
  }, [issues, searchQuery, stateFilter, repoFilter])

  const loadAllIssues = async () => {
    setLoading(true)
    try {
      // Get all repositories from database
      const repos = await githubDB.repos.toArray()
      setRepositories(repos.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.fullName
      })))

      // Get all issues from all repositories
      const allIssues: GitHubIssueDB[] = []
      for (const repo of repos) {
        const repoIssues = await githubDB.getIssues(repo.id)
        allIssues.push(...repoIssues)
      }

      // Sort by updated date (newest first)
      allIssues.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      
      setIssues(allIssues)
    } catch (error) {
      console.error('Failed to load issues:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterIssues = () => {
    let filtered = issues

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(issue =>
        issue.title.toLowerCase().includes(query) ||
        (issue.body && issue.body.toLowerCase().includes(query)) ||
        issue.authorLogin.toLowerCase().includes(query) ||
        issue.labels.some(label => label.name.toLowerCase().includes(query))
      )
    }

    // Filter by state
    if (stateFilter !== 'all') {
      filtered = filtered.filter(issue => issue.state === stateFilter)
    }

    // Filter by repository
    if (repoFilter !== 'all') {
      filtered = filtered.filter(issue => issue.repoId === repoFilter)
    }

    setFilteredIssues(filtered)
  }

  const getRepoName = (repoId: string) => {
    const repo = repositories.find(r => r.id === repoId)
    return repo ? repo.name : repoId
  }

  const getRepoFullName = (repoId: string) => {
    const repo = repositories.find(r => r.id === repoId)
    return repo ? repo.fullName : repoId
  }

  const formatDate = (date: Date | string) => {
    const d = new Date(date)
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getStateIcon = (state: string) => {
    return state === 'open' ? (
      <AlertCircle className="w-4 h-4 text-green-600" />
    ) : (
      <CheckCircle2 className="w-4 h-4 text-purple-600" />
    )
  }

  const getStateBadgeColor = (state: string) => {
    return state === 'open' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-purple-100 text-purple-800 border-purple-200'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg shadow-xl w-[95vw] h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Bug className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">GitHub Issues Viewer</h2>
              <p className="text-sm text-muted-foreground">
                View and search all issues from synced repositories
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {filteredIssues.length} of {issues.length} issues
            </Badge>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 border-b space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search issues by title, body, author, or labels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={loadAllIssues} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={stateFilter} onValueChange={(value: 'all' | 'open' | 'closed') => setStateFilter(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Select value={repoFilter} onValueChange={setRepoFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Repositories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Repositories</SelectItem>
                {repositories.map(repo => (
                  <SelectItem key={repo.id} value={repo.id}>
                    {repo.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Issues List */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading issues...</span>
                </div>
              ) : filteredIssues.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bug className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No issues found</h3>
                  <p className="text-muted-foreground max-w-md">
                    {issues.length === 0 
                      ? "No issues have been synced yet. Try syncing some repositories first."
                      : "No issues match your current filters. Try adjusting your search or filters."
                    }
                  </p>
                </div>
              ) : (
                filteredIssues.map((issue) => (
                  <Card key={`${issue.repoId}-${issue.number}`} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {getStateIcon(issue.state)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-sm truncate">
                                {issue.title}
                              </h3>
                              <Badge variant="outline" className={getStateBadgeColor(issue.state)}>
                                {issue.state}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="font-mono">
                                {getRepoName(issue.repoId)}#{issue.number}
                              </span>
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {issue.authorLogin}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(issue.createdAt)}
                              </div>
                              {issue.comments > 0 && (
                                <div className="flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3" />
                                  {issue.comments}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Badge variant="secondary" className="text-xs">
                            {getRepoFullName(issue.repoId)}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => window.open(issue.htmlUrl, '_blank')}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    {(issue.body || issue.labels.length > 0) && (
                      <CardContent className="pt-0">
                        {issue.body && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                            {issue.body}
                          </p>
                        )}
                        
                        {issue.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {issue.labels.map((label, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-xs"
                                style={{
                                  backgroundColor: `#${label.color}20`,
                                  borderColor: `#${label.color}60`,
                                  color: `#${label.color}`
                                }}
                              >
                                {label.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
