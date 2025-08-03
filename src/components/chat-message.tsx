'use client'

import { Message } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Copy, ThumbsUp, ThumbsDown, ExternalLink, Bot, User, FileText } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useAppStore } from '@/lib/store'
import { UIMessage } from 'ai'

type AIMessage = UIMessage & {
  role: 'user' | 'assistant' | 'system'
  content: string | Array<{ type: string; text: string }>
  metadata?: {
    source?: 'github' | 'jira' | 'ado' | 'manual'
    ticketId?: string
    repositoryUrl?: string
    fileReferences?: string[]
    generativeUI?: {
      type: string
      props: Record<string, any>
    }
  }
}

interface MessagePart {
  type: string
  text: string
}

interface ChatMessageProps {
  message: Message | AIMessage
  onCopyCode?: (code: string) => void
  onOpenFile?: (filename: string, content: string) => void
  onSendMessage?: (message: string) => void
}

export function ChatMessage({ message, onCopyCode, onOpenFile, onSendMessage }: ChatMessageProps) {
  const { theme } = useAppStore()

  const handleCopyMessage = () => {
    if (typeof message.content === 'string') {
      navigator.clipboard.writeText(message.content)
    } else if (Array.isArray(message.content)) {
      // Handle array content from AI SDK
      const textContent = message.content
        .filter((part: MessagePart) => part.type === 'text')
        .map((part: MessagePart) => part.text)
        .join('\n')
      navigator.clipboard.writeText(textContent)
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    onCopyCode?.(code)
  }

  const handleOpenFile = (filename: string, content: string) => {
    onOpenFile?.(filename, content)
  }

  return (
    <div className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
      {message.role === 'assistant' && (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 flex items-center justify-center flex-shrink-0 mt-1">
          <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
      )}
      
      {message.role === 'user' && (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500/20 to-blue-500/20 border border-green-500/20 flex items-center justify-center flex-shrink-0 mt-1 order-2">
          <User className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
      )}
      
      <div className={`max-w-[80%] ${message.role === 'user' ? 'order-1' : ''}`}>
        <div className={`rounded-2xl px-5 py-4 shadow-sm ${message.role === 'user' 
          ? 'bg-primary text-primary-foreground ml-4' 
          : 'bg-card dark:bg-card/80 border border-border/50 dark:border-border/30 text-card-foreground mr-4'}`}>
          {/* Message metadata */}
          {(message.metadata?.source || message.metadata?.ticketId) && (
            <div className="flex items-center gap-2 mb-4 text-xs">
              {message.metadata?.source && (
                <span className="px-3 py-1 rounded-full bg-background/30 dark:bg-background/20 text-xs font-medium border border-border/20 dark:border-border/15">
                  {message.metadata.source.toUpperCase()}
                </span>
              )}
              {message.metadata?.ticketId && (
                <span className="px-3 py-1 rounded-full bg-background/30 dark:bg-background/20 text-xs font-medium border border-border/20 dark:border-border/15">
                  {message.metadata.ticketId}
                </span>
              )}
            </div>
          )}
          
          <div className="prose prose-sm max-w-none dark:prose-invert leading-relaxed">
            {Array.isArray(message.content) ? (
              // Handle AI SDK message parts
              <div className="space-y-4">
                {message.content.map((part: MessagePart, index: number) => {
                  if (part.type === 'text') {
                    return (
                      <ReactMarkdown
                        key={index}
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '')
                            const language = match ? match[1] : ''
                            const codeContent = String(children).replace(/\n$/, '')

                            if (!inline && match) {
                              return (
                                <div className="relative my-4">
                                  <div className="flex items-center justify-between bg-muted px-4 py-2 rounded-t-md">
                                    <span className="text-sm font-medium">{language}</span>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleCopyCode(codeContent)}
                                      >
                                        <Copy className="w-3 h-3" />
                                      </Button>
                                      {language && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleOpenFile(`code.${language}`, codeContent)}
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  <SyntaxHighlighter
                                    style={theme === 'dark' ? oneDark : oneLight}
                                    language={language}
                                    PreTag="div"
                                    className="!mt-0 !rounded-t-none"
                                    {...props}
                                  >
                                    {codeContent}
                                  </SyntaxHighlighter>
                                </div>
                              )
                            }
                            return (
                              <code className={`${className} px-1 py-0.5 rounded bg-muted text-sm`} {...props}>
                                {children}
                              </code>
                            )
                          },
                          a({ href, children }) {
                            return (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-700 underline"
                              >
                                {children}
                              </a>
                            )
                          },
                        }}
                      >
                        {part.text}
                      </ReactMarkdown>
                    )
                  }
                  // Handle other part types (e.g., tool calls) if needed
                  return null
                })}
              </div>
            ) : (
              // Handle regular string content
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '')
                    const language = match ? match[1] : ''
                    const codeContent = String(children).replace(/\n$/, '')

                    if (!inline && match) {
                      return (
                        <div className="relative group my-4">
                          <div className="flex items-center justify-between bg-muted/80 dark:bg-muted/60 px-4 py-2.5 rounded-t-lg border border-b-0 dark:border-border/30">
                            <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wide">
                              {language || 'code'}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background/80 dark:hover:bg-background/60"
                              onClick={() => handleCopyCode(codeContent)}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          <SyntaxHighlighter
                            style={theme === 'dark' ? oneDark : oneLight}
                            language={language}
                            PreTag="div"
                            className="!mt-0 !rounded-t-none !border !border-t-0 !rounded-b-lg dark:!border-border/30"
                            customStyle={{
                              margin: 0,
                              fontSize: '13px',
                              lineHeight: '1.5'
                            }}
                            {...props}
                          >
                            {codeContent}
                          </SyntaxHighlighter>
                        </div>
                      )
                    }
                    return (
                      <code className={`${className} px-1 py-0.5 rounded bg-muted text-sm`} {...props}>
                        {children}
                      </code>
                    )
                  },
                  a({ href, children }) {
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700 underline"
                      >
                        {children}
                      </a>
                    )
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>

          {/* File references - Only show if metadata exists and is of the expected type */}
          {('metadata' in message && message.metadata && 'fileReferences' in message.metadata && message.metadata.fileReferences && message.metadata.fileReferences.length > 0) && (
            <div className="mt-5 p-4 bg-background/20 dark:bg-background/10 border border-border/30 dark:border-border/20 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium mb-3 text-muted-foreground">
                <FileText className="w-4 h-4" />
                Referenced Files
              </div>
              <div className="flex flex-wrap gap-2">
                {message.metadata.fileReferences.map((file: string, index: number) => (
                  <span key={index} className="px-3 py-1.5 rounded-md bg-background/40 dark:bg-background/30 border border-border/20 dark:border-border/15 text-xs font-mono hover:bg-background/60 dark:hover:bg-background/50 transition-colors cursor-pointer">
                    {file}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Repository URL - Only show if metadata exists and is of the expected type */}
          {('metadata' in message && message.metadata && 'repositoryUrl' in message.metadata && message.metadata.repositoryUrl) && (
            <div className="mt-5 p-4 bg-background/20 dark:bg-background/10 border border-border/30 dark:border-border/20 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium mb-3 text-muted-foreground">
                <ExternalLink className="w-4 h-4" />
                Repository
              </div>
              <a
                href={message.metadata.repositoryUrl as string}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline text-sm font-medium transition-colors"
              >
                {message.metadata.repositoryUrl as string}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
          
          {/* Generative UI - Only show if metadata exists and is of the expected type */}
          {('metadata' in message && message.metadata && 'generativeUI' in message.metadata && 
            message.metadata.generativeUI?.type === 'example-buttons' && 
            Array.isArray(message.metadata.generativeUI.props?.examples)) && (
            <div className="mt-5 p-4 bg-background/20 dark:bg-background/10 border border-border/30 dark:border-border/20 rounded-lg">
              <div className="text-sm font-medium mb-4 text-muted-foreground">Quick Actions</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {message.metadata.generativeUI.props.examples.map((example: { query: string; text: string }, index: number) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-auto p-3 text-left justify-start bg-background/30 dark:bg-background/20 hover:bg-background/50 dark:hover:bg-background/40 border-border/30 dark:border-border/20 hover:border-border/50 dark:hover:border-border/40 transition-all duration-200"
                    onClick={() => onSendMessage?.(example.query)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      <span className="text-sm font-medium">{example.text}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons for assistant messages */}
        {message.role === 'assistant' && (
          <div className="flex items-center gap-1 mt-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-muted/80 dark:hover:bg-muted/60">
              <ThumbsUp className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-muted/80 dark:hover:bg-muted/60">
              <ThumbsDown className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-muted/80 dark:hover:bg-muted/60" onClick={handleCopyMessage}>
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
