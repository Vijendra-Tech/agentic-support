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
    <div className="space-y-3">
      {/* Main Input Area - Primary Focus */}
      <div className="relative">
        <div className="flex items-center gap-3 p-3 bg-card/60 dark:bg-card/40 border border-border/30 dark:border-border/20 rounded-xl backdrop-blur-sm">
          <div className="flex-1">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about issues, code, or get comprehensive L2/L3 support..."
              disabled={isLoading}
              className="h-11 text-base bg-background dark:bg-background text-foreground dark:text-foreground border-border/40 dark:border-border/30 focus:border-primary/50 dark:focus:border-primary/60 focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 placeholder:text-muted-foreground/60 dark:placeholder:text-muted-foreground/50 transition-all duration-200"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleFileAttach}
              disabled={isLoading}
              className="h-11 w-11 p-0 hover:bg-muted/80 dark:hover:bg-muted/60 transition-all duration-200"
              title="Attach files"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleRecording}
              disabled={isLoading}
              className={`h-11 w-11 p-0 transition-all duration-200 ${
                isRecording 
                  ? 'text-red-500 dark:text-red-400 bg-red-500/10 dark:bg-red-500/20 hover:bg-red-500/20 dark:hover:bg-red-500/30' 
                  : 'hover:bg-muted/80 dark:hover:bg-muted/60'
              }`}
              title={isRecording ? "Stop recording" : "Start voice recording"}
            >
              {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            
            <Button
              size="sm"
              onClick={handleSend}
              disabled={isLoading || (!message.trim() && attachedFiles.length === 0)}
              className={`h-11 px-4 font-medium transition-all duration-200 ${
                isLoading || (!message.trim() && attachedFiles.length === 0)
                  ? 'opacity-50 cursor-not-allowed'
                  : 'bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/80 text-primary-foreground shadow-md hover:shadow-lg'
              }`}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Compact Source & Quick Actions Row */}
      <div className="flex items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Source:</span>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={selectedSource === 'github' ? 'default' : 'ghost'}
              onClick={() => selectSource('github')}
              className={`h-7 px-2 text-xs font-medium transition-all duration-200 ${
                selectedSource === 'github' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted/80 dark:hover:bg-muted/60 text-muted-foreground hover:text-foreground dark:hover:text-foreground'
              }`}
            >
              <Github className="w-3 h-3 mr-1" />
              GitHub
            </Button>
            <Button
              size="sm"
              variant={selectedSource === 'jira' ? 'default' : 'ghost'}
              onClick={() => selectSource('jira')}
              className={`h-7 px-2 text-xs font-medium transition-all duration-200 ${
                selectedSource === 'jira' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted/80 dark:hover:bg-muted/60 text-muted-foreground hover:text-foreground dark:hover:text-foreground'
              }`}
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              JIRA
            </Button>
            <Button
              size="sm"
              variant={selectedSource === 'ado' ? 'default' : 'ghost'}
              onClick={() => selectSource('ado')}
              className={`h-7 px-2 text-xs font-medium transition-all duration-200 ${
                selectedSource === 'ado' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted/80 dark:hover:bg-muted/60 text-muted-foreground hover:text-foreground dark:hover:text-foreground'
              }`}
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              ADO
            </Button>
          </div>
          {activeIntegration && (
            <Badge variant="secondary" className="h-6 text-xs bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/20 dark:border-green-500/30">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400 mr-1" />
              {activeIntegration.name}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground dark:hover:text-foreground"
            onClick={() => setMessage('Show me recent GitHub issues')}
          >
            Issues
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground dark:hover:text-foreground"
            onClick={() => setMessage('Help me debug this code')}
          >
            Debug
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground dark:hover:text-foreground"
            onClick={() => setMessage('Create a pull request')}
          >
            PR
          </Button>
        </div>
      </div>

      {/* Attached Files - Compact Display */}
      {attachedFiles.length > 0 && (
        <div className="p-3 bg-card/40 dark:bg-card/30 border border-border/30 dark:border-border/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Files ({attachedFiles.length})</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {attachedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-1.5 px-2 py-1 bg-background/60 dark:bg-background/40 border border-border/20 dark:border-border/15 rounded text-xs">
                <FileText className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                <span className="font-medium truncate max-w-[100px]">{file.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-4 w-4 p-0 hover:bg-red-500/10 dark:hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400"
                  onClick={() => removeAttachedFile(index)}
                >
                  <X className="w-2.5 h-2.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
        accept=".txt,.md,.js,.ts,.jsx,.tsx,.py,.java,.c,.cpp,.cs,.php,.rb,.go,.rs,.sql,.json,.xml,.html,.css,.scss,.yaml,.yml"
      />
    </div>
  )
}
