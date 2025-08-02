import { GitHubService } from './integrations'
import { githubDB, GitHubFile, GitHubRepo, FileTreeNode } from './github-db'
import { GitHubRepository } from './types'

export interface SyncProgress {
  total: number
  completed: number
  currentFile: string
  status: 'syncing' | 'completed' | 'error'
  error?: string
}

export class GitHubSyncService {
  private githubService: GitHubService
  private onProgress?: (progress: SyncProgress) => void

  constructor(token: string, onProgress?: (progress: SyncProgress) => void) {
    this.githubService = new GitHubService(token)
    this.onProgress = onProgress
  }

  // Sync entire repository to IndexedDB
  async syncRepository(repo: GitHubRepository): Promise<void> {
    const repoId = repo.id.toString()
    
    try {
      // Update repo status to syncing
      await githubDB.saveRepo({
        id: repoId,
        name: repo.name,
        fullName: repo.full_name,
        defaultBranch: repo.default_branch,
        lastSynced: new Date(),
        totalFiles: 0,
        syncStatus: 'syncing'
      })

      // Get repository tree
      const tree = await this.githubService.getRepositoryTree(repo.full_name, repo.default_branch)
      
      if (!tree) {
        throw new Error('Failed to fetch repository tree')
      }

      const files: GitHubFile[] = []
      let completed = 0
      const total = tree.length

      this.onProgress?.({
        total,
        completed,
        currentFile: 'Starting sync...',
        status: 'syncing'
      })

      // Process each file/directory in the tree
      for (const item of tree) {
        try {
          const file: GitHubFile = {
            repoId,
            path: item.path,
            name: this.getFileName(item.path),
            type: item.type === 'tree' ? 'dir' : 'file',
            sha: item.sha,
            size: item.size,
            downloadUrl: item.type === 'blob' ? item.url : undefined,
            parentPath: this.getParentPath(item.path),
            lastSynced: new Date()
          }

          files.push(file)
          completed++

          this.onProgress?.({
            total,
            completed,
            currentFile: item.path,
            status: 'syncing'
          })

        } catch (error) {
          console.warn(`Failed to process file ${item.path}:`, error)
          // Continue with other files
        }
      }

      // Save all files to database
      await githubDB.saveFiles(repoId, files)
      
      // Update repo status to completed
      await githubDB.updateRepoSyncStatus(repoId, 'completed', files.length)

      this.onProgress?.({
        total,
        completed: total,
        currentFile: 'Sync completed!',
        status: 'completed'
      })

    } catch (error) {
      console.error('Sync failed:', error)
      
      // Update repo status to error
      await githubDB.updateRepoSyncStatus(repoId, 'error')
      
      this.onProgress?.({
        total: 0,
        completed: 0,
        currentFile: '',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      throw error
    }
  }

  // Get file content from GitHub API
  async getFileContent(repoFullName: string, filePath: string, sha: string): Promise<string> {
    try {
      const content = await this.githubService.getFileContent(repoFullName, filePath, sha)
      return content
    } catch (error) {
      console.error(`Failed to fetch file content for ${filePath}:`, error)
      throw error
    }
  }

  // Get cached file tree from IndexedDB
  async getCachedFileTree(repoId: string): Promise<FileTreeNode[]> {
    return await githubDB.getFileTree(repoId)
  }

  // Get repository sync status
  async getRepoSyncStatus(repoId: string): Promise<GitHubRepo | undefined> {
    return await githubDB.getRepoSyncStatus(repoId)
  }

  // Check if repository is synced
  async isRepositorySynced(repoId: string): Promise<boolean> {
    const repo = await githubDB.getRepoSyncStatus(repoId)
    return repo?.syncStatus === 'completed'
  }

  // Clear repository cache
  async clearRepositoryCache(repoId: string): Promise<void> {
    await githubDB.clearRepo(repoId)
  }

  // Get cached file content
  async getCachedFileContent(repoId: string, filePath: string): Promise<string | undefined> {
    return await githubDB.getFileContent(repoId, filePath)
  }

  // Cache file content after fetching from API
  async cacheFileContent(repoId: string, filePath: string, content: string): Promise<void> {
    await githubDB.saveFileContent(repoId, filePath, content)
  }

  // Helper methods
  private getFileName(path: string): string {
    const parts = path.split('/')
    return parts[parts.length - 1]
  }

  private getParentPath(path: string): string {
    const parts = path.split('/')
    if (parts.length <= 1) return ''
    return parts.slice(0, -1).join('/')
  }
}

// Utility function to format file size
export function formatFileSize(bytes?: number): string {
  if (!bytes) return ''
  
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

// Utility function to get file extension
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}
