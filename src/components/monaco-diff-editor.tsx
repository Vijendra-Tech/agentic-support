'use client'

import { useState, useEffect, useRef } from 'react'
import { DiffEditor } from '@monaco-editor/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Check, 
  X, 
  Download, 
  Copy,
  FileText,
  GitBranch,
  ArrowRight
} from 'lucide-react'
import { toast } from 'sonner'
import { CodeSuggestion } from '@/lib/code-suggestion-parser'

interface MonacoDiffEditorProps {
  suggestion: CodeSuggestion
  originalContent?: string
  onAccept: (suggestion: CodeSuggestion) => void
  onReject: (suggestion: CodeSuggestion) => void
  onClose: () => void
}

export function MonacoDiffEditor({ 
  suggestion, 
  originalContent = '', 
  onAccept, 
  onReject, 
  onClose 
}: MonacoDiffEditorProps) {
  const [isAccepting, setIsAccepting] = useState(false)
  const editorRef = useRef<any>(null)

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor
    
    // Configure diff editor theme
    monaco.editor.defineTheme('agentic-diff', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'diffEditor.insertedTextBackground': '#28a74540',
        'diffEditor.removedTextBackground': '#ef444440',
        'diffEditor.insertedLineBackground': '#28a74520',
        'diffEditor.removedLineBackground': '#ef444420',
        'diffEditor.border': '#374151',
      }
    })
    
    monaco.editor.setTheme('agentic-diff')
  }

  const handleAccept = async () => {
    setIsAccepting(true)
    try {
      await onAccept(suggestion)
      toast.success(`Applied changes to ${suggestion.filePath}`)
    } catch (error) {
      toast.error('Failed to apply changes')
      console.error('Error applying changes:', error)
    } finally {
      setIsAccepting(false)
    }
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(suggestion.suggestedCode)
    toast.success('Code copied to clipboard')
  }

  const handleDownload = () => {
    const blob = new Blob([suggestion.suggestedCode], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = suggestion.filePath.split('/').pop() || 'code.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('File downloaded')
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <Card className="rounded-none border-x-0 border-t-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium">Code Suggestion</CardTitle>
              <Badge variant="outline" className="text-xs">
                {suggestion.language}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-3 w-3" />
            <span className="font-mono">{suggestion.filePath}</span>
          </div>
          
          {suggestion.description && (
            <p className="text-xs text-muted-foreground mt-1">
              {suggestion.description}
            </p>
          )}
        </CardHeader>
      </Card>

      {/* Diff Editor */}
      <div className="flex-1 min-h-0">
        <DiffEditor
          height="100%"
          language={suggestion.language}
          original={originalContent}
          modified={suggestion.suggestedCode}
          onMount={handleEditorDidMount}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: 'var(--font-mono)',
            lineNumbers: 'on',
            wordWrap: 'on',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            renderSideBySide: true,
            ignoreTrimWhitespace: false,
            renderWhitespace: 'boundary',
            diffWordWrap: 'on',
            originalEditable: false,
          }}
        />
      </div>

      {/* Action Bar */}
      <Card className="rounded-none border-x-0 border-b-0">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleAccept}
                disabled={isAccepting}
                className="h-7"
              >
                <Check className="h-3 w-3 mr-1" />
                {isAccepting ? 'Applying...' : 'Accept Changes'}
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReject(suggestion)}
                className="h-7"
              >
                <X className="h-3 w-3 mr-1" />
                Reject
              </Button>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyCode}
                className="h-7 w-7 p-0"
                title="Copy code"
              >
                <Copy className="h-3 w-3" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDownload}
                className="h-7 w-7 p-0"
                title="Download file"
              >
                <Download className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500/40 border border-green-500/60 rounded-sm"></div>
              <span>Added</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500/40 border border-red-500/60 rounded-sm"></div>
              <span>Removed</span>
            </div>
            <ArrowRight className="h-3 w-3" />
            <span>Side-by-side diff view</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
