'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Send, 
  Paperclip, 
  Mic, 
  Square, 
  Github, 
  ExternalLink,
  FileText,
  X 
} from 'lucide-react'
import { useAppStore } from '@/lib/store'

interface ChatInputProps {
  onSendMessage: (message: string, metadata?: any) => void
  isLoading?: boolean
}

export function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [selectedSource, setSelectedSource] = useState<'github' | 'jira' | 'ado' | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { activeIntegration } = useAppStore()

  const handleSend = () => {
    if (!message.trim() && attachedFiles.length === 0) return

    const metadata = {
      source: selectedSource || activeIntegration?.type,
      attachments: attachedFiles.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
      })),
    }

    onSendMessage(message, metadata)
    setMessage('')
    setAttachedFiles([])
    setSelectedSource(null)
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileAttach = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachedFiles(prev => [...prev, ...files])
  }

  const removeAttachedFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const toggleRecording = () => {
    setIsRecording(!isRecording)
    // In a real implementation, this would start/stop voice recording
  }

  const selectSource = (source: 'github' | 'jira' | 'ado') => {
    setSelectedSource(selectedSource === source ? null : source)
  }

  return (
    <Card className="p-4 bg-background/50 dark:bg-card/80 backdrop-blur-sm">
      {/* Source Selection */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-medium">Source:</span>
        <Button
          size="sm"
          variant={selectedSource === 'github' ? 'default' : 'outline'}
          onClick={() => selectSource('github')}
          className="h-7 bg-background/80 dark:bg-card/70 hover:bg-background/90 dark:hover:bg-card/90 text-foreground"
        >
          <Github className="w-3 h-3 mr-1" />
          GitHub
        </Button>
        <Button
          size="sm"
          variant={selectedSource === 'jira' ? 'default' : 'outline'}
          onClick={() => selectSource('jira')}
          className="h-7 bg-background/80 dark:bg-card/70 hover:bg-background/90 dark:hover:bg-card/90 text-foreground"
        >
          <ExternalLink className="w-3 h-3 mr-1" />
          JIRA
        </Button>
        <Button
          size="sm"
          variant={selectedSource === 'ado' ? 'default' : 'outline'}
          onClick={() => selectSource('ado')}
          className="h-7 bg-background/80 dark:bg-card/70 hover:bg-background/90 dark:hover:bg-card/90 text-foreground"
        >
          <ExternalLink className="w-3 h-3 mr-1" />
          ADO
        </Button>
        {activeIntegration && (
          <Badge variant="secondary" className="ml-auto">
            Active: {activeIntegration.name}
          </Badge>
        )}
      </div>

      {/* Attached Files */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {attachedFiles.map((file, index) => (
            <Badge key={index} variant="outline" className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {file.name}
              <Button
                size="sm"
                variant="ghost"
                className="h-4 w-4 p-0"
                onClick={() => removeAttachedFile(index)}
              >
                <X className="w-2 h-2" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about issues, code, or get L2/L3 support..."
            disabled={isLoading}
            className="min-h-[40px] resize-none bg-background dark:bg-card/50 border-input/50 dark:border-input/30 placeholder:text-muted-foreground/70 dark:placeholder:text-muted-foreground/50"
          />
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleFileAttach}
            disabled={isLoading}
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleRecording}
            disabled={isLoading}
            className={isRecording ? 'text-red-500' : ''}
          >
            {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          
          <Button
            size="sm"
            onClick={handleSend}
            disabled={isLoading || (!message.trim() && attachedFiles.length === 0)}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
        accept=".txt,.md,.js,.ts,.jsx,.tsx,.py,.java,.c,.cpp,.cs,.php,.rb,.go,.rs,.sql,.json,.xml,.html,.css,.scss,.yaml,.yml"
      />

      {/* Quick Actions */}
      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/50">
        <span className="text-xs text-muted-foreground">Quick actions:</span>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-xs"
          onClick={() => setMessage('Show me recent GitHub issues')}
        >
          Recent Issues
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-xs"
          onClick={() => setMessage('Help me debug this code')}
        >
          Debug Code
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-xs"
          onClick={() => setMessage('Create a pull request')}
        >
          Create PR
        </Button>
      </div>
    </Card>
  )
}
