'use client'

import { useState, useEffect, useRef } from 'react'
import Editor, { OnMount } from '@monaco-editor/react'
import { useAppStore } from '@/lib/store'
import { getFileLanguage } from '@/lib/utils'
import { GitHubSyncService } from '@/lib/github-sync'
import { githubDB } from '@/lib/github-db'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { 
  Folder, 
  FolderOpen, 
  Save, 
  Download, 
  ChevronRight, 
  ChevronDown,
  FileText,
  Code,
  Image,
  Settings,
  RefreshCw,
  Database
} from 'lucide-react'
import { cn } from '@/lib/utils'

// File tree structure
interface FileNode {
  name: string
  path: string
  type: 'file' | 'dir'
  sha: string
  size?: number
  downloadUrl?: string
  children?: FileNode[]
  isExpanded?: boolean
}

// File icon component
const FileTypeIcon = ({ fileName }: { fileName: string }) => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  
  if (ext === 'tsx' || ext === 'ts' || ext === 'js' || ext === 'jsx') {
    return <Code className="w-4 h-4 text-blue-500" />
  }
  if (ext === 'css' || ext === 'scss' || ext === 'sass') {
    return <FileText className="w-4 h-4 text-purple-500" />
  }
  if (ext === 'json') {
    return <Settings className="w-4 h-4 text-yellow-500" />
  }
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'svg') {
    return <Image className="w-4 h-4 text-green-500" />
  }
  return <FileText className="w-4 h-4 text-gray-500" />
}

  // File tree item component
function FileTreeItem({ 
  node, 
  level = 0, 
  onFileSelect, 
  onToggleFolder,
  selectedFile 
}: { 
  node: FileNode
  level?: number
  onFileSelect: (filePath: string) => void
  onToggleFolder: (folderPath: string) => void
  selectedFile?: string
}) {
  const isSelected = selectedFile === node.path
  const paddingLeft = `${level * 16 + 8}px`
  
  return (
    <div className="dark:bg-slate-900">
      <div 
        className={cn(
          "flex items-center gap-2 py-1.5 px-3 text-sm cursor-pointer transition-colors",
          "hover:bg-muted/80 dark:hover:bg-muted/60",
          isSelected && "bg-muted dark:bg-muted text-foreground dark:text-foreground",
          "border-l-2 border-transparent",
          isSelected && "border-l-primary"
        )}
        style={{ paddingLeft }}
        onClick={() => {
          if (node.type === 'file') {
            onFileSelect(node.path)
          } else {
            onToggleFolder(node.path)
          }
        }}
      >
        {node.type === 'dir' ? (
          <>
            {node.isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
            {node.isExpanded ? (
              <FolderOpen className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            ) : (
              <Folder className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            )}
          </>
        ) : (
          <>
            <div className="w-4" /> {/* Spacer for alignment */}
            <FileTypeIcon fileName={node.name} />
          </>
        )}
        <span className={cn(
          "truncate text-foreground dark:text-foreground",
          isSelected && "font-medium"
        )}>
          {node.name}
        </span>
      </div>
      
      {node.type === 'dir' && node.isExpanded && node.children && (
        <div className="dark:bg-slate-900">
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              level={level + 1}
              onFileSelect={onFileSelect}
              onToggleFolder={onToggleFolder}
              selectedFile={selectedFile}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Define editor options with theme support
const editorOptions = {
  minimap: { enabled: false },
  fontSize: 14,
  fontFamily: 'var(--font-mono)',
  lineNumbers: 'on' as const,
  wordWrap: 'on' as const,
  automaticLayout: true,
  scrollBeyondLastLine: false,
  tabSize: 2,
  theme: 'vs-dark', // Default to dark theme
  padding: {
    top: 16,
    bottom: 16
  },
  // Ensure proper contrast in dark mode
  colors: {
    'editor.foreground': '#e2e8f0',
    'editor.background': '#0f172a',
    'editor.lineHighlightBackground': '#1e293b',
    'editor.lineHighlightBorder': '#1e293b',
    'editor.selectionBackground': '#334155',
    'editorCursor.foreground': '#60a5fa',
    'editorWhitespace.foreground': '#334155',
    'editorLineNumber.foreground': '#64748b',
    'editorLineNumber.activeForeground': '#e2e8f0',
    'editorSuggestWidget.background': '#1e293b',
    'editorSuggestWidget.foreground': '#e2e8f0',
    'editorSuggestWidget.highlightForeground': '#60a5fa',
    'editorSuggestWidget.selectedBackground': '#334155',
    'editorHoverWidget.background': '#1e293b',
    'editorHoverWidget.foreground': '#e2e8f0',
    'editorHoverWidget.highlightForeground': '#60a5fa',
    'editorBracketMatch.background': '#1e40af40',
    'editorBracketMatch.border': '#60a5fa',
    'editorIndentGuide.background': '#1e293b',
    'editorIndentGuide.activeBackground': '#334155'
  }
}

export function MonacoEditor() {
  const { 
    theme, 
    selectedRepo, 
    setSelectedRepo,
    updateFile
  } = useAppStore()
  
  const editorRef = useRef<any>(null)
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [currentFile, setCurrentFile] = useState<{
    path: string
    name: string
    content: string
    language: string
    repoId: string
    repoFullName: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [availableRepos, setAvailableRepos] = useState<Array<{id: string, name: string, fullName: string}>>([])
  
  // Set editor theme based on app theme
  const editorTheme = theme === 'dark' ? 'vs-dark' : 'vs-light'

  // Load available repositories on mount
  useEffect(() => {
    loadAvailableRepos()
  }, [])

  // Load file tree when repo is selected
  useEffect(() => {
    if (selectedRepo) {
      loadFileTree(selectedRepo)
    }
  }, [selectedRepo])

  const loadAvailableRepos = async () => {
    try {
      const repos = await githubDB.repos.toArray()
      setAvailableRepos(repos.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.fullName
      })))
      
      // Auto-select first repo if available
      if (repos.length > 0 && !selectedRepo) {
        setSelectedRepo(repos[0].id)
      }
    } catch (error) {
      console.error('Failed to load repositories:', error)
      toast.error('Failed to load repositories')
    }
  }

  const loadFileTree = async (repoId: string) => {
    try {
      setIsLoading(true)
      const tree = await githubDB.getFileTree(repoId)
      setFileTree(tree)
    } catch (error) {
      console.error('Failed to load file tree:', error)
      toast.error('Failed to load repository files')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle file selection - fetch content from GitHub API
  const handleFileSelect = async (filePath: string) => {
    if (!selectedRepo) {
      console.error('No repository selected')
      return
    }

    try {
      setIsLoading(true)
      const fileName = filePath.split('/').pop() || ''
      
      // Get repo info
      const repo = await githubDB.repos.get(selectedRepo)
      if (!repo) {
        console.error('Repository not found')
        return
      }

      // Try to get cached content first
      let content = await githubDB.getFileContent(selectedRepo, filePath)
      
      if (!content) {
        // Fetch from GitHub API if not cached
        const syncService = new GitHubSyncService('')
        const file = await githubDB.getFile(selectedRepo, filePath)
        
        if (file && file.sha) {
          content = await syncService.getFileContent(repo.fullName, filePath, file.sha)
          // Cache the content
          await githubDB.saveFileContent(selectedRepo, filePath, content)
        }
      }

      if (content) {
        setCurrentFile({
          path: filePath,
          name: fileName,
          content,
          language: getFileLanguage(fileName),
          repoId: selectedRepo,
          repoFullName: repo.fullName
        })
      }
    } catch (error) {
      console.error('Failed to load file content:', error)
      toast.error('Failed to load file content')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle folder toggle
  const toggleFolder = (path: string) => {
    const toggleNode = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.path === path && node.type === 'dir') {
          return { ...node, isExpanded: !node.isExpanded }
        }
        if (node.children) {
          return { ...node, children: toggleNode(node.children) }
        }
        return node
      })
    }
    
    setFileTree(toggleNode(fileTree))
  }

  // Handle editor change
  const handleEditorChange = (value: string | undefined) => {
    if (currentFile && value !== undefined) {
      setCurrentFile(prev => prev ? { ...prev, content: value } : null)
    }
  }
  
  // Handle save file
  const handleSaveFile = async () => {
    if (!currentFile) return
    
    try {
      setIsSaving(true)
      // TODO: Implement save to GitHub
      console.log('Saving file:', currentFile.path, currentFile.content)
      
      // Update in the open files
      updateFile(currentFile.path, currentFile.content)
      
      toast.success('File saved successfully')
    } catch (error) {
      console.error('Error saving file:', error)
      toast.error('Failed to save file')
    } finally {
      setIsSaving(false)
    }
  }
  
  // Handle download file
  const handleDownload = () => {
    if (!currentFile) return
    
    const element = document.createElement('a')
    const file = new Blob([currentFile.content], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = currentFile.name
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  // Configure Monaco editor when mounted
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    
    // Configure light theme
    monaco.editor.defineTheme('vs-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
        { token: 'keyword', foreground: '7c3aed' },
        { token: 'string', foreground: '0d9488' },
        { token: 'number', foreground: 'b45309' },
        { token: 'type', foreground: '2563eb' },
        { token: 'delimiter', foreground: '4b5563' },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#1f2937',
        'editorLineNumber.foreground': '#9ca3af',
        'editorLineNumber.activeForeground': '#1f2937',
        'editor.selectionBackground': '#dbeafe',
        'editor.lineHighlightBackground': '#f3f4f6',
        'editorCursor.foreground': '#2563eb',
        'editor.selectionHighlightBackground': '#dbeafe80',
        'editor.findMatchBackground': '#a5b4fc80',
        'editor.findMatchHighlightBackground': '#a5b4fc40',
        'editor.suggestWidget.background': '#ffffff',
        'editor.suggestWidget.border': '#e5e7eb',
        'editor.suggestWidget.foreground': '#1f2937',
        'editor.suggestWidget.highlightForeground': '#2563eb',
        'editor.suggestWidget.selectedBackground': '#f3f4f6',
      },
    })

    // Configure dark theme
    monaco.editor.defineTheme('vs-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
        { token: 'keyword', foreground: '818cf8' },
        { token: 'string', foreground: '34d399' },
        { token: 'number', foreground: 'f59e0b' },
        { token: 'type', foreground: '60a5fa' },
        { token: 'delimiter', foreground: '9ca3af' },
        { token: 'operator', foreground: '93c5fd' },
        { token: 'variable', foreground: 'e2e8f0' },
        { token: 'function', foreground: 'a78bfa' },
        { token: 'class', foreground: '67e8f9' },
      ],
      colors: {
        'editor.background': '#0f172a',
        'editor.foreground': '#e2e8f0',
        'editorLineNumber.foreground': '#64748b',
        'editorLineNumber.activeForeground': '#e2e8f0',
        'editor.selectionBackground': '#334155',
        'editor.lineHighlightBackground': '#1e293b',
        'editorCursor.foreground': '#60a5fa',
        'editor.selectionHighlightBackground': '#1e40af40',
        'editor.inactiveSelectionBackground': '#1e40af40',
        'editor.suggestWidget.selectedBackground': '#334155',
        'editorBracketMatch.background': '#1e40af40',
        'editorBracketMatch.border': '#60a5fa',
        'editorIndentGuide.background': '#1e293b',
        'editorIndentGuide.activeBackground': '#334155',
        'editorWhitespace.foreground': '#334155',
        'editorWidget.background': '#1e293b',
        'editorWidget.foreground': '#e2e8f0',
        'editorWidget.border': '#334155',
        'editorHoverWidget.background': '#1e293b',
        'editorHoverWidget.border': '#334155',
        'editorHoverWidget.highlightForeground': '#60a5fa',
        'editorLink.activeForeground': '#60a5fa',
        'editorError.foreground': '#f87171',
        'editorWarning.foreground': '#fbbf24',
        'editorInfo.foreground': '#60a5fa',
      },
    })
    
    // Set the theme
    monaco.editor.setTheme(editorTheme)
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 dark:border-border/30 bg-card/80 dark:bg-card/60 backdrop-blur-xl">
        <div className="flex items-center space-x-2">
          <select
            value={selectedRepo || ''}
            onChange={(e) => setSelectedRepo(e.target.value || null)}
            className="px-3 py-2 text-sm border border-border/40 dark:border-border/30 rounded-lg bg-background dark:bg-background text-foreground dark:text-foreground focus:border-primary/50 dark:focus:border-primary/60 focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 transition-all duration-200"
          >
            <option value="" className="bg-background dark:bg-background text-foreground dark:text-foreground">Select a repository</option>
            {availableRepos.map((repo) => (
              <option key={repo.id} value={repo.id} className="bg-background dark:bg-background text-foreground dark:text-foreground">
                {repo.name}
              </option>
            ))}
          </select>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => selectedRepo && loadFileTree(selectedRepo)}
            disabled={!selectedRepo || isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSaveFile}
            disabled={!currentFile || isSaving}
          >
            <Save className="w-4 h-4 mr-1" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            disabled={!currentFile}
          >
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* File explorer */}
        <div className="w-64 h-full overflow-y-auto border-r border-border/50 dark:border-border/30 bg-card/40 dark:bg-card/20">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : fileTree.length > 0 ? (
            fileTree.map((node) => (
              <FileTreeItem
                key={node.path}
                node={node}
                onFileSelect={handleFileSelect}
                onToggleFolder={toggleFolder}
                selectedFile={currentFile?.path}
              />
            ))
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              {selectedRepo ? 'No files found' : 'Select a repository'}
            </div>
          )}
        </div>
        
        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          {currentFile ? (
            <Editor
              height="100%"
              defaultLanguage={currentFile.language}
              language={currentFile.language}
              value={currentFile.content}
              onChange={handleEditorChange}
              onMount={handleEditorDidMount}
              theme={editorTheme}
              options={{
                ...editorOptions,
                readOnly: false,
                theme: editorTheme,
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <FileText className="w-12 h-12 mb-4 opacity-30" />
              <p className="text-sm">Select a file to edit</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MonacoEditor
