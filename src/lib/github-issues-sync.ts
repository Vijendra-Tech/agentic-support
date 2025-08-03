import { GitHubService } from './integrations'
import { githubDB, GitHubIssueDB } from './github-db'
import { GitHubRepository, GitHubIssue } from './types'

export interface IssuesSyncProgress {
  repoId: string
  repoName: string
  currentPage: number
  totalPages: number
  issuesProcessed: number
  totalIssues: number
  currentState: 'open' | 'closed'
  status: 'starting' | 'syncing' | 'completed' | 'error'
  error?: string
}

export class GitHubIssuesSyncService {
  private githubService: GitHubService
  private progressCallback?: (progress: IssuesSyncProgress) => void

  constructor(token: string, progressCallback?: (progress: IssuesSyncProgress) => void) {
    this.githubService = new GitHubService(token)
    this.progressCallback = progressCallback
  }

  async syncRepositoryIssues(
    repo: GitHubRepository, 
    options: {
      syncOpen?: boolean
      syncClosed?: boolean
      maxIssues?: number
    } = {}
  ): Promise<void> {
    const { syncOpen = true, syncClosed = false, maxIssues = 100 } = options
    const repoId = repo.id.toString()
    
    let progress: IssuesSyncProgress = {
      repoId,
      repoName: repo.name,
      currentPage: 1,
      totalPages: 1,
      issuesProcessed: 0,
      totalIssues: 0,
      currentState: 'open',
      status: 'starting'
    }

    try {
      this.updateProgress(progress)
      
      const [owner, repoName] = repo.full_name.split('/')
      const allIssues: GitHubIssueDB[] = []

      // Sync open issues
      if (syncOpen) {
        progress.currentState = 'open'
        progress.status = 'syncing'
        this.updateProgress(progress)
        
        const openIssues = await this.fetchIssuesWithPagination(
          owner, 
          repoName, 
          'open', 
          maxIssues / (syncClosed ? 2 : 1),
          progress
        )
        
        allIssues.push(...openIssues.map(issue => this.convertToDBIssue(issue, repoId)))
      }

      // Sync closed issues
      if (syncClosed) {
        progress.currentState = 'closed'
        progress.status = 'syncing'
        this.updateProgress(progress)
        
        const closedIssues = await this.fetchIssuesWithPagination(
          owner, 
          repoName, 
          'closed', 
          maxIssues / 2,
          progress
        )
        
        allIssues.push(...closedIssues.map(issue => this.convertToDBIssue(issue, repoId)))
      }

      // Save to database
      await githubDB.saveIssues(repoId, allIssues)
      
      progress.status = 'completed'
      progress.totalIssues = allIssues.length
      progress.issuesProcessed = allIssues.length
      this.updateProgress(progress)

    } catch (error) {
      progress.status = 'error'
      progress.error = error instanceof Error ? error.message : 'Unknown error'
      this.updateProgress(progress)
      throw error
    }
  }

  private async fetchIssuesWithPagination(
    owner: string,
    repo: string,
    state: 'open' | 'closed',
    maxIssues: number,
    progress: IssuesSyncProgress
  ): Promise<GitHubIssue[]> {
    const issues: GitHubIssue[] = []
    let page = 1
    const perPage = Math.min(100, maxIssues) // GitHub API max is 100 per page
    
    while (issues.length < maxIssues) {
      try {
        const pageIssues = await this.githubService.getIssues(owner, repo, state)
        
        if (pageIssues.length === 0) {
          break // No more issues
        }
        
        issues.push(...pageIssues.slice(0, maxIssues - issues.length))
        
        progress.currentPage = page
        progress.issuesProcessed = issues.length
        this.updateProgress(progress)
        
        if (pageIssues.length < perPage) {
          break // Last page
        }
        
        page++
      } catch (error) {
        console.error(`Error fetching ${state} issues page ${page}:`, error)
        break
      }
    }
    
    return issues
  }

  private convertToDBIssue(issue: GitHubIssue, repoId: string): GitHubIssueDB {
    return {
      issueId: issue.id,
      repoId,
      number: issue.number,
      title: issue.title,
      body: issue.body,
      state: issue.state,
      htmlUrl: issue.html_url,
      createdAt: new Date(issue.created_at),
      updatedAt: new Date(issue.updated_at),
      closedAt: null, // Would need to fetch from GitHub API if needed
      authorLogin: '', // Would need to fetch from GitHub API
      authorAvatarUrl: '', // Would need to fetch from GitHub API
      assignees: [], // Would need to fetch from GitHub API
      labels: issue.labels.map(label => ({
        name: label.name,
        color: label.color,
        description: null
      })),
      milestone: null, // Would need to fetch from GitHub API
      comments: 0, // Would need to fetch from GitHub API
      lastSynced: new Date()
    }
  }

  private updateProgress(progress: IssuesSyncProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress)
    }
  }

  // Sync issues for multiple repositories
  async syncMultipleRepositories(
    repositories: GitHubRepository[],
    options: {
      syncOpen?: boolean
      syncClosed?: boolean
      maxIssuesPerRepo?: number
    } = {}
  ): Promise<void> {
    for (const repo of repositories) {
      try {
        await this.syncRepositoryIssues(repo, options)
      } catch (error) {
        console.error(`Failed to sync issues for repository ${repo.name}:`, error)
        // Continue with next repository
      }
    }
  }

  // Get sync statistics
  async getSyncStats(repoId: string): Promise<{
    totalIssues: number
    openIssues: number
    closedIssues: number
    lastSynced: Date | null
  }> {
    const counts = await githubDB.getIssuesCount(repoId)
    const issues = await githubDB.getIssues(repoId, { limit: 1 })
    
    return {
      totalIssues: counts.total,
      openIssues: counts.open,
      closedIssues: counts.closed,
      lastSynced: issues.length > 0 ? issues[0].lastSynced : null
    }
  }
}
