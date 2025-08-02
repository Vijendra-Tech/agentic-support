'use client'

import { useEffect, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { ChatMessage } from './chat-message'
import { ChatInput } from './chat-input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { generateId } from '@/lib/utils'
import { File } from '@/lib/types'
import { Settings, MessageSquare, FileText } from 'lucide-react'

interface ChatInterfaceProps {
  onSendMessage?: (message: string, metadata?: any) => Promise<void>
}

export function ChatInterface({ onSendMessage }: ChatInterfaceProps) {
  const { 
    currentSession, 
    addMessage, 
    openFile,
    createSession,
    isLoading 
  } = useAppStore()
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentSession?.messages])

  useEffect(() => {
    // Create a default session if none exists
    if (!currentSession) {
      createSession('New L2/L3 Support Session')
    }
  }, [currentSession, createSession])

  const handleSendMessage = async (message: string, metadata?: any) => {
    if (!currentSession) return

    // Add user message
    addMessage(currentSession.id, {
      role: 'user',
      content: message,
      metadata,
    })

    try {
      // Call the AI service (this would be replaced with actual AI integration)
      if (onSendMessage) {
        await onSendMessage(message, metadata)
      } else {
        // Mock AI response for demonstration
        setTimeout(() => {
          addMessage(currentSession.id, {
            role: 'assistant',
            content: generateMockResponse(message, metadata),
            metadata: {
              source: metadata?.source,
              generativeUI: generateMockUI(message),
            },
          })
        }, 1000)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      addMessage(currentSession.id, {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
      })
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    // Show toast notification in a real implementation
    console.log('Code copied to clipboard')
  }

  const handleOpenFile = (filename: string, content: string) => {
    const file: File = {
      id: generateId(),
      name: filename,
      path: `/${filename}`,
      content,
      language: filename.split('.').pop() || 'plaintext',
      lastModified: new Date(),
      isReadOnly: false,
    }
    openFile(file)
  }

  if (!currentSession) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center">
            <MessageSquare className="w-10 h-10 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            L2/L3 Support Assistant
          </h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">
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
    <div className="h-full flex flex-col">
      {/* Minimal Main Area */}
      <div className="flex-1 min-h-0"></div>

      {/* Chat Input */}
      <div className="border-t bg-background">
        <div className="flex justify-center">
          <div className="w-full max-w-4xl p-6">
            <ChatInput 
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Mock functions for demonstration
function generateMockResponse(message: string, metadata?: any): string {
  const lowerMessage = message.toLowerCase()
  
  if (lowerMessage.includes('github') || lowerMessage.includes('issue')) {
    return `I can help you with GitHub issues! Here are some recent issues I found:

## Recent GitHub Issues

1. **Bug: Authentication failing on login** (#123)
   - Status: Open
   - Priority: High
   - Assigned to: john.doe@company.com

2. **Feature: Add dark mode support** (#124)
   - Status: In Progress
   - Priority: Medium
   - Assigned to: jane.smith@company.com

\`\`\`javascript
// Example fix for authentication issue
function authenticateUser(credentials) {
  try {
    const token = await auth.login(credentials);
    localStorage.setItem('authToken', token);
    return { success: true, token };
  } catch (error) {
    console.error('Authentication failed:', error);
    return { success: false, error: error.message };
  }
}
\`\`\`

Would you like me to help you with any specific issue or create a pull request?`
  }
  
  if (lowerMessage.includes('debug') || lowerMessage.includes('code')) {
    return `I'll help you debug your code! Here's a systematic approach:

## Debugging Checklist

1. **Check the error logs** - Look for stack traces and error messages
2. **Verify inputs** - Ensure all parameters are valid
3. **Test edge cases** - Consider null, undefined, and boundary values
4. **Use debugging tools** - Leverage browser dev tools or IDE debuggers

\`\`\`python
# Example debugging code
def debug_function(data):
    print(f"Input data: {data}")
    print(f"Data type: {type(data)}")
    
    if not data:
        print("Warning: Empty data received")
        return None
    
    try:
        result = process_data(data)
        print(f"Processing successful: {result}")
        return result
    except Exception as e:
        print(f"Error during processing: {e}")
        raise
\`\`\`

Please share your specific code or error message for more targeted assistance!`
  }
  
  if (lowerMessage.includes('jira')) {
    return `I can help you with JIRA tickets! Here's what I found:

## Recent JIRA Tickets

- **PROJ-456**: Database performance issues
  - Status: In Progress
  - Priority: Critical
  - Assignee: dev-team@company.com

- **PROJ-457**: UI improvements for mobile
  - Status: Open
  - Priority: Medium
  - Assignee: ui-team@company.com

Would you like me to help you create a new ticket or analyze an existing one?`
  }
  
  return `I'm here to help with your L2/L3 support needs! I can assist with:

- **GitHub**: Issues, pull requests, code reviews
- **JIRA**: Ticket management, workflow automation
- **Azure DevOps**: Work items, build pipelines
- **Code Analysis**: Debugging, performance optimization
- **Documentation**: API docs, troubleshooting guides

What specific area would you like help with?`
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
