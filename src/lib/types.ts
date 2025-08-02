import { z } from 'zod'

// Message types
export const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.date(),
  metadata: z.object({
    source: z.enum(['github', 'jira', 'ado', 'manual']).optional(),
    ticketId: z.string().optional(),
    repositoryUrl: z.string().optional(),
    fileReferences: z.array(z.string()).optional(),
    generativeUI: z.any().optional(),
  }).optional(),
})

export type Message = z.infer<typeof MessageSchema>

// Integration types
export const IntegrationSchema = z.object({
  id: z.string(),
  type: z.enum(['github', 'jira', 'ado']),
  name: z.string(),
  config: z.object({
    apiKey: z.string().optional(),
    baseUrl: z.string().optional(),
    username: z.string().optional(),
    token: z.string().optional(),
  }),
  isActive: z.boolean(),
  lastSync: z.date().optional(),
})

export type Integration = z.infer<typeof IntegrationSchema>

// Chat session types
export const ChatSessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  messages: z.array(MessageSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
  metadata: z.object({
    ticketType: z.enum(['L2', 'L3']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    status: z.enum(['open', 'in-progress', 'resolved', 'closed']).optional(),
    assignee: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
})

export type ChatSession = z.infer<typeof ChatSessionSchema>

// File types for Monaco Editor
export const FileSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  content: z.string(),
  language: z.string(),
  lastModified: z.date(),
  isReadOnly: z.boolean().optional(),
})

export type File = z.infer<typeof FileSchema>

// GitHub specific types
export interface GitHubRepository {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  clone_url: string
  default_branch: string
}

export interface GitHubIssue {
  id: number
  number: number
  title: string
  body: string | null
  state: 'open' | 'closed'
  html_url: string
  created_at: string
  updated_at: string
  labels: Array<{
    name: string
    color: string
  }>
}

export interface GitHubPullRequest {
  id: number
  number: number
  title: string
  body: string | null
  state: 'open' | 'closed' | 'merged'
  html_url: string
  created_at: string
  updated_at: string
  head: {
    ref: string
    sha: string
  }
  base: {
    ref: string
    sha: string
  }
}

export interface GitHubTreeItem {
  path: string
  mode: string
  type: 'blob' | 'tree'
  sha: string
  size?: number
  url: string
}

// JIRA types
export interface JiraIssue {
  id: string
  key: string
  summary: string
  description: string
  status: string
  priority: string
  assignee?: {
    displayName: string
    emailAddress: string
  }
  created: string
  updated: string
}

// Azure DevOps types
export interface AdoWorkItem {
  id: number
  title: string
  description: string
  state: string
  workItemType: string
  assignedTo?: {
    displayName: string
    uniqueName: string
  }
  createdDate: string
  changedDate: string
}

// UI Component types
export interface GenerativeUIComponent {
  type: 'code-block' | 'file-tree' | 'issue-card' | 'pr-card' | 'chart' | 'table'
  props: Record<string, any>
  data?: any
}

// Store types
export interface AppState {
  // Chat state
  currentSession: ChatSession | null
  sessions: ChatSession[]
  isLoading: boolean
  
  // Integration state
  integrations: Integration[]
  activeIntegration: Integration | null
  selectedRepo: string | null
  
  // File state
  openFiles: File[]
  activeFile: File | null
  
  // UI state
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  
  // Actions
  createSession: (title: string) => void
  updateSession: (sessionId: string, updates: Partial<ChatSession>) => void
  deleteSession: (sessionId: string) => void
  addMessage: (sessionId: string, message: Omit<Message, 'id' | 'timestamp'>) => void
  
  setActiveIntegration: (integration: Integration | null) => void
  addIntegration: (integration: Omit<Integration, 'id'>) => void
  updateIntegration: (id: string, updates: Partial<Integration>) => void
  removeIntegration: (id: string) => void
  
  setSelectedRepo: (repoId: string | null) => void
  
  openFile: (file: File) => void
  closeFile: (fileId: string) => void
  updateFile: (fileId: string, content: string) => void
  setActiveFile: (fileId: string) => void
  
  setSidebarOpen: (open: boolean) => void
  setTheme: (theme: 'light' | 'dark') => void
}
