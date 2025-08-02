import Dexie, { Table } from 'dexie'

// Database schema interfaces
export interface GitHubFile {
  id?: number
  repoId: string
  path: string
  name: string
  type: 'file' | 'dir'
  sha: string
  size?: number
  downloadUrl?: string
  content?: string
  parentPath: string
  lastSynced: Date
}

export interface GitHubRepo {
  id: string
  name: string
  fullName: string
  defaultBranch: string
  lastSynced: Date
  totalFiles: number
  syncStatus: 'pending' | 'syncing' | 'completed' | 'error'
}

// Dexie database class
export class GitHubDatabase extends Dexie {
  repos!: Table<GitHubRepo>
  files!: Table<GitHubFile>

  constructor() {
    super('GitHubDatabase')
    
    this.version(1).stores({
      repos: 'id, name, fullName, defaultBranch, lastSynced, syncStatus',
      files: '++id, repoId, path, name, type, sha, parentPath, lastSynced, [repoId+path]'
    })
  }

  // Get all files for a repository in tree structure
  async getFileTree(repoId: string): Promise<FileTreeNode[]> {
    const files = await this.files.where('repoId').equals(repoId).toArray()
    return this.buildFileTree(files)
  }

  // Build hierarchical file tree from flat file list
  private buildFileTree(files: GitHubFile[]): FileTreeNode[] {
    const tree: FileTreeNode[] = []
    const pathMap = new Map<string, FileTreeNode>()

    // Sort files by path to ensure proper hierarchy
    files.sort((a, b) => a.path.localeCompare(b.path))

    for (const file of files) {
      const node: FileTreeNode = {
        name: file.name,
        path: file.path,
        type: file.type,
        sha: file.sha,
        size: file.size,
        downloadUrl: file.downloadUrl,
        children: file.type === 'dir' ? [] : undefined,
        isExpanded: false
      }

      pathMap.set(file.path, node)

      if (file.parentPath === '' || file.parentPath === '/') {
        // Root level file/directory
        tree.push(node)
      } else {
        // Find parent and add as child
        const parent = pathMap.get(file.parentPath)
        if (parent && parent.children) {
          parent.children.push(node)
        }
      }
    }

    return tree
  }

  // Save repository metadata
  async saveRepo(repo: GitHubRepo): Promise<void> {
    await this.repos.put(repo)
  }

  // Save files for a repository
  async saveFiles(repoId: string, files: GitHubFile[]): Promise<void> {
    // Clear existing files for this repo
    await this.files.where('repoId').equals(repoId).delete()
    
    // Add new files
    await this.files.bulkAdd(files)
  }

  // Get repository sync status
  async getRepoSyncStatus(repoId: string): Promise<GitHubRepo | undefined> {
    return await this.repos.get(repoId)
  }

  // Update repository sync status
  async updateRepoSyncStatus(repoId: string, status: GitHubRepo['syncStatus'], totalFiles?: number): Promise<void> {
    const updates: Partial<GitHubRepo> = {
      syncStatus: status,
      lastSynced: new Date()
    }
    
    if (totalFiles !== undefined) {
      updates.totalFiles = totalFiles
    }
    
    await this.repos.update(repoId, updates)
  }

  // Get file content by path
  async getFileContent(repoId: string, filePath: string): Promise<string | undefined> {
    const file = await this.files.where('[repoId+path]').equals([repoId, filePath]).first()
    return file?.content
  }

  // Save file content
  async saveFileContent(repoId: string, filePath: string, content: string): Promise<void> {
    await this.files.where('[repoId+path]').equals([repoId, filePath]).modify({
      content: content
    })
  }

  // Get file by path (returns full file object)
  async getFile(repoId: string, filePath: string): Promise<GitHubFile | undefined> {
    return await this.files.where('[repoId+path]').equals([repoId, filePath]).first()
  }

  // Clear all data for a repository
  async clearRepo(repoId: string): Promise<void> {
    await this.files.where('repoId').equals(repoId).delete()
    await this.repos.delete(repoId)
  }
}

// File tree node interface for UI
export interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'dir'
  sha: string
  size?: number
  downloadUrl?: string
  children?: FileTreeNode[]
  isExpanded?: boolean
}

// Create database instance
export const githubDB = new GitHubDatabase()
