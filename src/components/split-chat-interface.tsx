'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useAppStore } from '@/lib/store'
import { ChatMessage } from './chat-message'
import { ChatInput } from './chat-input'
import { MonacoEditor } from './monaco-editor-new'
import { MonacoDiffEditor } from './monaco-diff-editor'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { 
  ChevronLeft, 
  ChevronRight, 
  Code, 
  MessageSquare, 
  FileText,
  Minimize2,
  Bot,
  User,
  Send,
  GitBranch,
  FileCode
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { generateId } from '@/lib/utils'
import { File } from '@/lib/types'
import { parseCodeSuggestions, hasCodeSuggestions, CodeSuggestion } from '@/lib/code-suggestion-parser'

interface SplitChatInterfaceProps {
  onSendMessage?: (message: string, metadata?: any) => Promise<void>
}

export function SplitChatInterface({ onSendMessage }: SplitChatInterfaceProps) {
  const { 
    currentSession, 
    addMessage, 
    openFile,
    createSession,
    isLoading: storeLoading,
    openFiles,
    setSidebarOpen,
    updateFile
  } = useAppStore()
  
  const [isCodeEditorCollapsed, setIsCodeEditorCollapsed] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [currentCodeSuggestion, setCurrentCodeSuggestion] = useState<CodeSuggestion | null>(null)
  const [showDiffView, setShowDiffView] = useState(false)
  const [originalFileContent, setOriginalFileContent] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Use the AI SDK 5.0 useChat hook with DefaultChatTransport
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat'
    })
  })

  const isLoading = status === 'submitted' || status === 'streaming' || storeLoading
  const hasError = status === 'error'

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Monitor AI messages for code suggestions
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage && lastMessage.role === 'assistant') {
      const messageText = lastMessage.parts?.map(part => 
        part.type === 'text' ? part.text : ''
      ).join('') || ''
      
      if (hasCodeSuggestions(messageText)) {
        const parsed = parseCodeSuggestions(messageText)
        if (parsed.hasCodeSuggestions && parsed.suggestions.length > 0) {
          // Take the first suggestion for now
          const suggestion = parsed.suggestions[0]
          handleCodeSuggestionDetected(suggestion)
        }
      }
    }
  }, [messages, currentSession?.messages])

  useEffect(() => {
    // Create a default session if none exists
    if (!currentSession) {
      createSession('New L2/L3 Support Session')
    }
  }, [currentSession, createSession])

  const toggleCodeEditor = () => {
    setIsAnimating(true)
    setIsCodeEditorCollapsed(!isCodeEditorCollapsed)
    setTimeout(() => setIsAnimating(false), 300)
  }

  const handleSendMessage = async (message: string, metadata?: any) => {
    if (!currentSession) return
    
    // Auto-collapse sidebar when sending message for better UX
    setSidebarOpen(false)
    
    // Send to AI SDK for OpenAI response (this will handle the message display)
    sendMessage({ text: message })
    
    try {
      if (onSendMessage) {
        await onSendMessage(message, metadata)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Add error message to AI SDK messages
      // Note: AI SDK will handle this through the API response
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
  }

  const handleCodeSuggestionDetected = async (suggestion: CodeSuggestion) => {
    try {
      // Auto-expand code editor when code suggestion is detected
      setIsCodeEditorCollapsed(false)
      
      // Try to load the original file content if it exists
      let originalContent = ''
      
      // Check if the file is already open
      const existingFile = openFiles.find(file => 
        file.path.endsWith(suggestion.filePath) || file.name === suggestion.filePath
      )
      
      if (existingFile) {
        originalContent = existingFile.content
      } else {
        // Try to create a new file with the suggested content
        const file: File = {
          id: generateId(),
          name: suggestion.filePath.split('/').pop() || suggestion.filePath,
          content: '', // Start with empty content to show the diff
          language: suggestion.language,
          path: suggestion.filePath,
          lastModified: new Date(),
          isReadOnly: false
        }
        openFile(file)
      }
      
      // Set up diff view
      setOriginalFileContent(originalContent)
      setCurrentCodeSuggestion(suggestion)
      setShowDiffView(true)
      
    } catch (error) {
      console.error('Error handling code suggestion:', error)
    }
  }

  const handleAcceptCodeSuggestion = async (suggestion: CodeSuggestion) => {
    try {
      // Find or create the file
      let targetFile = openFiles.find(file => 
        file.path.endsWith(suggestion.filePath) || file.name === suggestion.filePath
      )
      
      if (targetFile) {
        // Update existing file
        updateFile(targetFile.id, suggestion.suggestedCode)
      } else {
        // Create new file with the suggested content
        const newFile: File = {
          id: generateId(),
          name: suggestion.filePath.split('/').pop() || suggestion.filePath,
          content: suggestion.suggestedCode,
          language: suggestion.language,
          path: suggestion.filePath,
          lastModified: new Date(),
          isReadOnly: false
        }
        openFile(newFile)
      }
      
      // Close diff view and switch to normal editor
      setShowDiffView(false)
      setCurrentCodeSuggestion(null)
      
    } catch (error) {
      console.error('Error accepting code suggestion:', error)
      throw error
    }
  }

  const handleRejectCodeSuggestion = (suggestion: CodeSuggestion) => {
    setShowDiffView(false)
    setCurrentCodeSuggestion(null)
  }

  const handleCloseDiffView = () => {
    setShowDiffView(false)
    setCurrentCodeSuggestion(null)
  }

  const handleOpenFile = (filename: string, content: string) => {
    const file: File = {
      id: generateId(),
      name: filename,
      content,
      language: filename.split('.').pop() || 'text',
      path: `/workspace/${filename}`,
      lastModified: new Date(),
      isReadOnly: false
    }
    openFile(file)
    setIsCodeEditorCollapsed(false)
  }

  if (!currentSession) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">No Active Session</h3>
          <p className="text-muted-foreground mb-4">Create a new session to start chatting</p>
          <Button onClick={() => createSession('New L2/L3 Support Session')}>
            Start New Session
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex bg-background">
      {/* Chat Section */}
      <div 
        className={`flex flex-col transition-all duration-300 ease-in-out ${
          isCodeEditorCollapsed ? 'flex-1' : 'w-[40%] min-w-[400px]'
        } ${isAnimating ? 'pointer-events-none' : ''}`}
      >
        {/* Simplified Chat Header */}
        <div className="flex items-center justify-between p-3 border-b bg-background/95 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Chat</span>
            {currentSession?.messages && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                {currentSession.messages.length}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCodeEditor}
            className="h-7 w-7 p-0"
          >
            {isCodeEditorCollapsed ? (
              <ChevronLeft className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </Button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 min-h-0 relative">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {/* AI SDK messages - single source of truth for chat display */}
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
                        {message.parts?.map((part, index) => {
                          if (part.type === 'text') {
                            return part.text
                          }
                          return null
                        }).join('') || ''}
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
                      <span className="ml-2">
                        {status === 'submitted' ? 'Sending message...' : 
                         status === 'streaming' ? 'AI is responding...' : 
                         'AI is thinking...'}
                      </span>
                    </div>
                  </Card>
                </div>
              )}
              
              {hasError && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-destructive rounded-full flex items-center justify-center">
                      <Bot className="h-4 w-4 text-destructive-foreground" />
                    </div>
                  </div>
                  <Card className="p-3 bg-destructive/10 border-destructive/20">
                    <div className="text-sm text-destructive">
                      Sorry, there was an error processing your request. Please try again.
                    </div>
                  </Card>
                </div>
              )}
              
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

      {/* Code Editor Section */}
      {!isCodeEditorCollapsed && (
        <div 
          className={`flex flex-col w-[70%] border-l transition-all duration-300 ease-in-out ${
            isAnimating ? 'pointer-events-none' : ''
          }`}
        >
          {/* Code Editor Header */}
          <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {showDiffView ? (
                  <>
                    <GitBranch className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold">Code Diff</h2>
                  </>
                ) : (
                  <>
                    <FileText className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold">Code Editor</h2>
                  </>
                )}
              </div>
              {showDiffView && currentCodeSuggestion ? (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {currentCodeSuggestion.language}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    AI Suggestion
                  </Badge>
                </div>
              ) : openFiles.length > 0 ? (
                <Badge variant="secondary" className="text-xs">
                  {openFiles.length} file{openFiles.length !== 1 ? 's' : ''}
                </Badge>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {showDiffView && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseDiffView}
                  title="Close diff view"
                >
                  <FileCode className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleCodeEditor}
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 min-h-0">
            {showDiffView && currentCodeSuggestion ? (
              <MonacoDiffEditor
                suggestion={currentCodeSuggestion}
                originalContent={originalFileContent}
                onAccept={handleAcceptCodeSuggestion}
                onReject={handleRejectCodeSuggestion}
                onClose={handleCloseDiffView}
              />
            ) : openFiles.length > 0 ? (
              <MonacoEditor />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Code className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No Files Open</h3>
                  <p className="text-muted-foreground mb-4">
                    Files will appear here when the AI suggests code changes or when you open them from the chat.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => handleOpenFile('example.ts', '// Example TypeScript file\nconsole.log("Hello, World!");')}
                  >
                    Open Example File
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Expand Button (when collapsed) */}
      {isCodeEditorCollapsed && ( 
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={toggleCodeEditor}
            size="lg"
            className="rounded-full shadow-lg"
            title="Show Code Editor"
          >
            <Code className="w-5 h-5" />
          </Button>
        </div>
      )}
    </div>
  )
}
