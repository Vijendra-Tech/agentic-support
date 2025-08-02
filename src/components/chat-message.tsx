'use client'

import { Message } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Copy, ThumbsUp, ThumbsDown, ExternalLink, Bot, User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useAppStore } from '@/lib/store'

interface ChatMessageProps {
  message: Message
  onCopyCode?: (code: string) => void
  onOpenFile?: (filename: string, content: string) => void
  onSendMessage?: (message: string) => void
}

export function ChatMessage({ message, onCopyCode, onOpenFile, onSendMessage }: ChatMessageProps) {
  const { theme } = useAppStore()

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content)
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    onCopyCode?.(code)
  }

  const handleOpenFile = (filename: string, content: string) => {
    onOpenFile?.(filename, content)
  }

  return (
    <div className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {message.role === 'assistant' && (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center flex-shrink-0 mt-1">
          <Bot className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
      
      {message.role === 'user' && (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500/10 to-blue-500/10 flex items-center justify-center flex-shrink-0 mt-1 order-2">
          <User className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
      
      <div className={`max-w-[75%] ${message.role === 'user' ? 'order-1' : ''}`}>
        <div className={`rounded-2xl px-4 py-3 ${message.role === 'user' 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-muted/80 dark:bg-muted/30 text-foreground'}`}>
          {/* Message metadata */}
          {(message.metadata?.source || message.metadata?.ticketId) && (
            <div className="flex items-center gap-2 mb-3 text-xs opacity-60">
              {message.metadata?.source && (
                <span className="px-2 py-1 rounded-full bg-background/20 text-xs">
                  {message.metadata.source}
                </span>
              )}
              {message.metadata?.ticketId && (
                <span className="px-2 py-1 rounded-full bg-background/20 text-xs">
                  {message.metadata.ticketId}
                </span>
              )}
            </div>
          )}
          
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown
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
              {message.content}
            </ReactMarkdown>
          </div>

          {/* File references */}
          {message.metadata?.fileReferences && message.metadata.fileReferences.length > 0 && (
            <div className="mt-4 p-3 bg-background/10 rounded-lg">
              <div className="text-sm font-medium mb-2 opacity-80">Referenced Files:</div>
              <div className="flex flex-wrap gap-2">
                {message.metadata.fileReferences.map((file, index) => (
                  <span key={index} className="px-2 py-1 rounded bg-background/20 text-xs">
                    {file}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Repository URL */}
          {message.metadata?.repositoryUrl && (
            <div className="mt-4 p-3 bg-background/10 rounded-lg">
              <div className="text-sm font-medium mb-2 opacity-80">Repository:</div>
              <a
                href={message.metadata.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline text-sm"
              >
                {message.metadata.repositoryUrl}
              </a>
            </div>
          )}
          
          {/* Generative UI - Example Buttons */}
          {message.metadata?.generativeUI?.type === 'example-buttons' && (
            <div className="mt-4 p-4 bg-background/10 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {message.metadata.generativeUI.props.examples.map((example: any, index: number) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-auto p-3 text-left justify-start bg-background/20 hover:bg-background/40 border-border/20 hover:border-border/40 transition-all duration-200"
                    onClick={() => onSendMessage?.(example.query)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
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
          <div className="flex items-center gap-2 mt-2 ml-2">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 opacity-50 hover:opacity-100">
              <ThumbsUp className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 opacity-50 hover:opacity-100">
              <ThumbsDown className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 opacity-50 hover:opacity-100" onClick={handleCopyMessage}>
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
