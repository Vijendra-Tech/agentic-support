'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Send, Bot, User } from 'lucide-react'

interface SplitChatInterfaceProps {
  onSendMessage?: (message: string, metadata?: any) => Promise<void>
}

export function SplitChatInterface({ onSendMessage }: SplitChatInterfaceProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Use the AI SDK 5.0 useChat hook with DefaultChatTransport
  const { messages, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat'
    })
  })

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    
    const message = input.trim()
    setInput('')
    
    // Send message using AI SDK 5.0 pattern
    sendMessage({ text: message })
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI Support Assistant
        </h2>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <Card className="p-6 text-center">
              <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Welcome to AI Support</h3>
              <p className="text-muted-foreground">
                Ask me anything about your code, debugging, or technical issues.
              </p>
            </Card>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                </div>
              )}
              
              <div className={`max-w-[80%] ${
                message.role === 'user' ? 'order-1' : 'order-2'
              }`}>
                <Card className={`p-3 ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground ml-auto' 
                    : 'bg-muted'
                }`}>
                  <div className="whitespace-pre-wrap text-sm">
                    {message.content}
                  </div>
                </Card>
              </div>
              
              {message.role === 'user' && (
                <div className="flex-shrink-0 order-2">
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
              </div>
              <Card className="p-3 bg-muted">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-pulse">●</div>
                  <div className="animate-pulse delay-100">●</div>
                  <div className="animate-pulse delay-200">●</div>
                  <span className="ml-2">AI is thinking...</span>
                </div>
              </Card>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about your code or technical issues..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
            Get intelligent help with GitHub issues, JIRA tickets, Azure DevOps workflows, and code debugging.
          </p>
          <Button 
            onClick={() => createSession('New L2/L3 Support Session')}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-6 py-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Start New Session
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex bg-background">
      {/* Chat Section - 30% width */}
      <div 
        className={`flex flex-col transition-all duration-300 ease-in-out ${
          isCodeEditorCollapsed ? 'flex-1' : 'w-[30%] min-w-[300px]'
        } ${isAnimating ? 'pointer-events-none' : ''}`}
      >
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Chat Assistant</h2>
              <p className="text-xs text-muted-foreground">L2/L3 Support</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentSession?.messages && currentSession.messages.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {currentSession.messages.length} messages
              </Badge>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleCodeEditor}
              className="h-8 w-8 p-0 transition-all duration-200 hover:bg-muted"
              title={isCodeEditorCollapsed ? "Show Code Editor" : "Hide Code Editor"}
            >
              {isCodeEditorCollapsed ? (
                <ChevronLeft className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 min-h-0 relative">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {currentSession?.messages?.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onCopyCode={handleCopyCode}
                  onOpenFile={handleOpenFile}
                  onSendMessage={handleSendMessage}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Chat Input */}
        <div className="border-t bg-background/95 backdrop-blur-sm">
          <div className="p-4">
            <ChatInput 
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Code Editor Section - 70% width */}
      {!isCodeEditorCollapsed && (
        <div 
          className={`flex flex-col w-[70%] border-l transition-all duration-300 ease-in-out ${
            isAnimating ? 'pointer-events-none' : ''
          }`}
        >
          {/* Code Editor Header */}
          <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500/10 to-blue-500/10 flex items-center justify-center">
                <Code className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <h2 className="font-semibold text-sm">Code Editor</h2>
                <p className="text-xs text-muted-foreground">
                  {openFiles.length > 0 ? `${openFiles.length} files open` : 'No files open'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleCodeEditor}
                className="h-8 w-8 p-0 transition-all duration-200 hover:bg-muted"
                title="Hide Code Editor"
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 min-h-0">
            <MonacoEditor />
          </div>
        </div>
      )}

      {/* Floating Expand Button (when collapsed) */}
      {isCodeEditorCollapsed && ( 
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={toggleCodeEditor}
            className="h-12 w-12 rounded-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            title="Show Code Editor"
          >
            <Code className="w-5 h-5" />
          </Button>
        </div>
      )}
    </div>
  )
}

// Helper functions
function extractCodeFromResponse(response: string): string {
  const codeMatch = response.match(/```(?:\w+)?\n([\s\S]*?)\n```/)
  return codeMatch ? codeMatch[1] : response
}

// Generate example file content based on file name and path
function generateExampleFileContent(fileName: string, filePath: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase()
  
  switch (extension) {
    case 'ts':
    case 'tsx':
      if (fileName.includes('auth')) {
        return `// Authentication Service
export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResult {
  success: boolean
  token?: string
  user?: User
  error?: string
}

export class AuthService {
  private tokenCache = new Map<string, { token: string; expires: number }>()
  
  async authenticateUser(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      // Validate credentials format
      if (!this.validateCredentials(credentials)) {
        throw new Error('Invalid credentials format')
      }
      
      const response = await this.apiClient.post('/auth/login', credentials)
      const { token, expiresIn } = response.data
      
      // Cache token with expiration
      this.tokenCache.set(credentials.email, {
        token,
        expires: Date.now() + expiresIn * 1000
      })
      
      return { success: true, token, user: response.data.user }
    } catch (error) {
      console.error('Authentication failed:', error)
      return { 
        success: false, 
        error: error.message || 'Authentication failed' 
      }
    }
  }
  
  private validateCredentials(creds: LoginCredentials): boolean {
    return !!(creds.email && creds.password && 
             creds.email.includes('@') && 
             creds.password.length >= 8)
  }
}`
      }
      
      if (fileName.includes('chat')) {
        return `'use client'

import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

export function ChatInterface() {
  const { currentSession, addMessage, isLoading } = useAppStore()
  const [message, setMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentSession?.messages])

  const handleSendMessage = async () => {
    if (!message.trim() || !currentSession) return
    
    try {
      setIsLoading(true)
      
      // Add user message
      addMessage(currentSession.id, {
        role: 'user',
        content: message
      })
      
      // Clear input
      setMessage('')
      
      // Process with AI service
      const response = await aiService.processMessage(message)
      
      // Add AI response
      addMessage(currentSession.id, {
        role: 'assistant',
        content: response
      })
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        {/* Messages */}
      </ScrollArea>
      
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border rounded-lg"
          />
          <Button onClick={handleSendMessage} disabled={isLoading}>
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}`
      }
      
      if (fileName.includes('github')) {
        return `// GitHub Integration Service
export interface GitHubIssue {
  id: number
  title: string
  body: string
  state: 'open' | 'closed'
  assignee?: string
  labels: string[]
  created_at: string
  updated_at: string
}

export class GitHubService {
  private apiKey: string
  private baseUrl = 'https://api.github.com'
  
  constructor(apiKey: string) {
    this.apiKey = apiKey
  }
  
  async getRepositoryIssues(owner: string, repo: string): Promise<GitHubIssue[]> {
    try {
      const response = await fetch(
        \`\${this.baseUrl}/repos/\${owner}/\${repo}/issues\`,
        {
          headers: {
            'Authorization': \`Bearer \${this.apiKey}\`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      )
      
      if (!response.ok) {
        throw new Error(\`GitHub API error: \${response.statusText}\`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Failed to fetch GitHub issues:', error)
      throw error
    }
  }
  
  async createIssue(owner: string, repo: string, issue: Partial<GitHubIssue>): Promise<GitHubIssue> {
    try {
      const response = await fetch(
        \`\${this.baseUrl}/repos/\${owner}/\${repo}/issues\`,
        {
          method: 'POST',
          headers: {
            'Authorization': \`Bearer \${this.apiKey}\`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(issue)
        }
      )
      
      if (!response.ok) {
        throw new Error(\`Failed to create issue: \${response.statusText}\`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Failed to create GitHub issue:', error)
      throw error
    }
  }
}`
      }
      
      return `// TypeScript/React Component
export interface ComponentProps {
  // Add your props here
}

export function Component(props: ComponentProps) {
  return (
    <div>
      {/* Component implementation */}
    </div>
  )
}`
    
    case 'js':
      return `// JavaScript Module
export function exampleFunction() {
  // Implementation here
  console.log('Example function called')
}

export default {
  exampleFunction
}`
    
    case 'json':
      if (fileName === 'package.json') {
        return `{
  "name": "agentic-support",
  "version": "1.0.0",
  "description": "L2/L3 Support Assistant",
  "main": "index.js",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.0.0",
    "zustand": "^4.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "eslint": "^8.0.0",
    "jest": "^29.0.0"
  }
}`
      }
      return `{
  "example": "configuration",
  "version": "1.0.0"
}`
    
    case 'yml':
    case 'yaml':
      if (fileName.includes('azure') || fileName.includes('pipeline')) {
        return `# Azure DevOps Pipeline
trigger:
  branches:
    include:
    - main
    - develop
  paths:
    exclude:
    - docs/*
    - '*.md'

variables:
  buildConfiguration: 'Release'
  vmImageName: 'ubuntu-latest'

stages:
- stage: Build
  displayName: 'Build and Test'
  jobs:
  - job: BuildAndTest
    displayName: 'Build and Test Job'
    pool:
      vmImage: $(vmImageName)
    steps:
    - task: NodeTool@0
      inputs:
        versionSpec: '18.x'
      displayName: 'Install Node.js'
    
    - script: |
        npm ci
        npm run build
        npm run test:ci
      displayName: 'npm install, build and test'
    
    - task: PublishTestResults@2
      condition: succeededOrFailed()
      inputs:
        testResultsFormat: 'JUnit'
        testResultsFiles: 'test-results.xml'
        testRunTitle: 'Unit Tests'
    
    - task: PublishCodeCoverageResults@1
      inputs:
        codeCoverageTool: 'Cobertura'
        summaryFileLocation: 'coverage/cobertura-coverage.xml'

- stage: Deploy
  displayName: 'Deploy to Staging'
  dependsOn: Build
  condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
  jobs:
  - deployment: DeployToStaging
    displayName: 'Deploy to Staging Environment'
    environment: 'staging'
    strategy:
      runOnce:
        deploy:
          steps:
          - task: AzureWebApp@1
            inputs:
              azureSubscription: 'Azure-Subscription'
              appType: 'webApp'
              appName: 'agentic-support-staging'
              package: '$(Pipeline.Workspace)/drop/*.zip'`
      }
      return `# YAML Configuration
version: '1.0'
config:
  example: value`
    
    case 'css':
      return `/* Styles for ${fileName} */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.responsive-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 768px) {
  .responsive-layout {
    grid-template-columns: 1fr 1fr;
  }
}

@media (min-width: 1024px) {
  .responsive-layout {
    grid-template-columns: 1fr 2fr 1fr;
  }
}`
    
    case 'sql':
      return `-- Database queries for ${fileName}
-- Performance optimized queries

-- Get user analytics with proper indexing
SELECT 
  u.id,
  u.email,
  COUNT(s.id) as session_count,
  AVG(s.duration) as avg_session_duration
FROM users u
LEFT JOIN sessions s ON u.id = s.user_id
WHERE u.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY u.id, u.email
ORDER BY session_count DESC
LIMIT 100;

-- Index recommendations
-- CREATE INDEX idx_users_created_at ON users(created_at);
-- CREATE INDEX idx_sessions_user_id_duration ON sessions(user_id, duration);`
    
    default:
      return `# ${fileName}

This is an example file for ${filePath}.

## Description
This file contains example content for demonstration purposes.

## Usage
Replace this content with actual implementation.

## Notes
- This is a placeholder file
- Generated automatically by the chat assistant
- Modify as needed for your specific use case`
  }
}

// Enhanced mock responses with more conversational chatbot style
function generateMockResponse(message: string, metadata?: any): string {
  const lowerMessage = message.toLowerCase()
  
  // GitHub-related queries
  if (lowerMessage.includes('github') || lowerMessage.includes('issue') || lowerMessage.includes('repository')) {
    return `Hey there! 👋 I just took a look at your GitHub repository and found a couple of things that caught my attention.

So I spotted this authentication bug (#123) that's been causing some login headaches for users. It looks like there's a token validation issue happening in the auth service. The good news is, it's totally fixable!

There's also a memory leak in the chat component (#124) - basically, some WebSocket connections aren't cleaning up after themselves. Jane's already working on that one though.

Want me to pull up the auth service file so we can take a look at it together? I can show you exactly what's going wrong and how we can fix it. 🔧

What do you think - should we dive into the authentication issue first?`
  }
  
  // Code debugging and analysis
  if (lowerMessage.includes('debug') || lowerMessage.includes('error') || lowerMessage.includes('fix')) {
    return `Oh, I see you're running into some trouble! 🤔 Let me help you figure this out.

I'm looking at what's happening and it seems like there's an issue with how errors are being handled in your message system. Basically, when something goes wrong, the app doesn't know what to do and just crashes.

Here's what I think is happening - you've got some async code that's not wrapped in a try-catch block. So when the AI service fails to respond, everything just breaks.

Want me to show you a quick fix? I can pull up the problematic file and we can add some proper error handling together. It's actually pretty straightforward once you see it!

Should I load up the chat interface file so we can take a look? 🔍`
  }
  
  // JIRA and project management
  if (lowerMessage.includes('jira') || lowerMessage.includes('ticket') || lowerMessage.includes('project')) {
    return `Hey! I just checked your JIRA board and there are a couple of tickets that really need some attention. 📋

So there's this critical database performance issue (PROJ-456) that's been slowing down the analytics dashboard. The dev team is working on it, but it's been sitting in "In Progress" for a while now. Might be worth checking if they need any help with those queries?

There's also a mobile UI ticket (PROJ-457) in the backlog that's been waiting for some love. Users have been complaining about the responsive design on mobile devices.

Want me to pull up the analytics service file so we can see what's going on with those slow queries? Or would you rather tackle the mobile UI issues first? I'm here to help with whichever one you think is more urgent! 🚀`
  }
  
  // Performance and optimization
  if (lowerMessage.includes('performance') || lowerMessage.includes('optimize') || lowerMessage.includes('slow')) {
    return `Whoa, I noticed your app is running a bit sluggish! ⚡ Let me take a quick look at what might be slowing things down.

Okay, so I found a few things that are probably causing the slowness. Your bundle size is pretty hefty at 2.3MB - that's making the initial load really slow. Plus, there are some memory leaks in the chat component that are making the browser struggle over time.

The biggest issue I'm seeing is that your message list is re-rendering way more than it needs to. Every time someone sends a message, the whole list rebuilds itself instead of just adding the new message.

Want me to show you a quick fix for the re-rendering issue? It's actually just a matter of adding some React optimization hooks. Should make things feel much snappier! 🚀

Which performance issue would you like to tackle first?`
  }
  
  // Azure DevOps
  if (lowerMessage.includes('azure') || lowerMessage.includes('devops') || lowerMessage.includes('pipeline')) {
    return `Hey! I just checked your Azure DevOps pipelines and there's some good news and some not-so-good news. ☁️

The good news: your build pipeline is running smoothly! 94% success rate is pretty solid, and 8 minutes isn't too bad for build time.

The not-so-good news: your staging deployment is having a rough time. It keeps timing out when trying to start the container. This usually happens when the container is taking too long to become "ready" - maybe a health check issue or the app is just taking forever to start up.

Want me to pull up your pipeline config so we can figure out what's going wrong with that container startup? I have a feeling it might be a simple timeout setting that needs tweaking! 🔧`
  }
  
  // General help and capabilities
  return `Hey there! 👋 I'm your L2/L3 Support Assistant, and I'm here to help you tackle whatever technical challenges you're facing!

I'm pretty good at a bunch of different things - I can help you debug tricky code issues, dive into your GitHub repos to find problems, check on your JIRA tickets, or even optimize your Azure DevOps pipelines. Think of me as your technical buddy who's always ready to lend a hand! 🚀

Some things I love helping with:
- Hunting down bugs and fixing performance issues 🔍
- Making sense of messy JIRA boards and prioritizing tasks 📋
- Troubleshooting those annoying pipeline failures 🔧
- Reviewing code and suggesting improvements ✨

Just tell me what's bugging you today! You can say things like "debug this error" or "show me what's happening in GitHub" or "why is my app so slow?" - I'll figure out what you need and jump right in to help.

What's on your mind? 🤔`
}

function generateMockUI(message: string) {
  const lowerMessage = message.toLowerCase()
  
  if (lowerMessage.includes('github') || lowerMessage.includes('issue')) {
    return {
      type: 'issue-card',
      props: {
        title: 'Authentication Bug',
        number: 123,
        status: 'open',
        priority: 'high',
        assignee: 'john.doe@company.com'
      }
    }
  }
  
  if (lowerMessage.includes('code') || lowerMessage.includes('debug')) {
    return {
      type: 'code-block',
      props: {
        language: 'javascript',
        filename: 'auth.js'
      }
    }
  }
  
  return null
}
