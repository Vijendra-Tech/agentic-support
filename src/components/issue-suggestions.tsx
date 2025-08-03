'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  AlertCircle, 
  CheckCircle, 
  Code, 
  ExternalLink, 
  ChevronDown, 
  ChevronRight,
  Lightbulb,
  Bug,
  Zap,
  Shield,
  Star,
  Copy,
  FileText
} from 'lucide-react'
import { IssueMatch, CodeSuggestion } from '@/lib/issue-analysis'

interface IssueSuggestionsProps {
  issues: IssueMatch[]
  suggestions: CodeSuggestion[]
  summary: string
  confidence: number
  onOpenFile?: (filename: string, content: string) => void
  onCopyCode?: (code: string) => void
}

export function IssueSuggestions({ 
  issues, 
  suggestions, 
  summary, 
  confidence,
  onOpenFile,
  onCopyCode 
}: IssueSuggestionsProps) {
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set())
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(new Set())

  const toggleIssue = (issueId: string) => {
    const newExpanded = new Set(expandedIssues)
    if (newExpanded.has(issueId)) {
      newExpanded.delete(issueId)
    } else {
      newExpanded.add(issueId)
    }
    setExpandedIssues(newExpanded)
  }

  const toggleSuggestion = (suggestionId: string) => {
    const newExpanded = new Set(expandedSuggestions)
    if (newExpanded.has(suggestionId)) {
      newExpanded.delete(suggestionId)
    } else {
      newExpanded.add(suggestionId)
    }
    setExpandedSuggestions(newExpanded)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'bug_fix': return <Bug className="w-4 h-4" />
      case 'performance': return <Zap className="w-4 h-4" />
      case 'security': return <Shield className="w-4 h-4" />
      case 'best_practice': return <Star className="w-4 h-4" />
      case 'feature': return <Lightbulb className="w-4 h-4" />
      default: return <Code className="w-4 h-4" />
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 dark:text-green-400'
    if (confidence >= 0.6) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  if (issues.length === 0 && suggestions.length === 0) {
    return null
  }

  return (
    <div className="space-y-4 mt-4">
      {/* Analysis Summary */}
      <Card className="border-l-4 border-l-blue-500 dark:border-l-blue-400">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Analysis Results
            </CardTitle>
            <Badge variant="outline" className={getConfidenceColor(confidence)}>
              {(confidence * 100).toFixed(1)}% confidence
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground whitespace-pre-line">{summary}</p>
        </CardContent>
      </Card>

      {/* Relevant Issues */}
      {issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              Relevant Issues ({issues.length})
            </CardTitle>
            <CardDescription>
              Found issues that may be related to your request
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {issues.map((issue) => (
              <Collapsible key={issue.id}>
                <CollapsibleTrigger
                  className="w-full"
                  onClick={() => toggleIssue(issue.id)}
                >
                  <div className="flex items-start justify-between w-full p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-3 text-left flex-1">
                      <div className="flex items-center gap-2 mt-1">
                        {expandedIssues.has(issue.id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        {issue.state === 'open' ? (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{issue.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {issue.repository}
                          </Badge>
                          <Badge 
                            variant={issue.state === 'open' ? 'destructive' : 'default'}
                            className="text-xs"
                          >
                            {issue.state}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {(issue.relevanceScore * 100).toFixed(0)}% match
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-6 mt-2 p-4 bg-muted/30 rounded-lg space-y-3">
                    <div>
                      <h5 className="font-medium text-sm mb-2">Description</h5>
                      <p className="text-sm text-muted-foreground">{issue.body}</p>
                    </div>
                    
                    {issue.labels.length > 0 && (
                      <div>
                        <h5 className="font-medium text-sm mb-2">Labels</h5>
                        <div className="flex flex-wrap gap-1">
                          {issue.labels.map((label) => (
                            <Badge key={label} variant="secondary" className="text-xs">
                              {label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {issue.suggestedActions.length > 0 && (
                      <div>
                        <h5 className="font-medium text-sm mb-2">Suggested Actions</h5>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {issue.suggestedActions.map((action, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-blue-500 mt-1">•</span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" asChild>
                        <a href={issue.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View Issue
                        </a>
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Code Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Code className="w-5 h-5 text-green-600 dark:text-green-400" />
              Code Suggestions ({suggestions.length})
            </CardTitle>
            <CardDescription>
              Generated code improvements based on your request
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.map((suggestion) => (
              <Collapsible key={suggestion.id}>
                <CollapsibleTrigger
                  className="w-full"
                  onClick={() => toggleSuggestion(suggestion.id)}
                >
                  <div className="flex items-start justify-between w-full p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-3 text-left flex-1">
                      <div className="flex items-center gap-2 mt-1">
                        {expandedSuggestions.has(suggestion.id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        {getCategoryIcon(suggestion.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{suggestion.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {suggestion.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getPriorityColor(suggestion.priority)}`}
                          >
                            {suggestion.priority} priority
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {suggestion.category.replace('_', ' ')}
                          </Badge>
                          {suggestion.repository && (
                            <Badge variant="outline" className="text-xs">
                              {suggestion.repository}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-6 mt-2 p-4 bg-muted/30 rounded-lg space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-sm">Code Implementation</h5>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => onCopyCode?.(suggestion.code)}
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
                          </Button>
                          {suggestion.filePath && onOpenFile && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => onOpenFile(suggestion.filePath!, suggestion.code)}
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              Open File
                            </Button>
                          )}
                        </div>
                      </div>
                      <ScrollArea className="h-64 w-full rounded border">
                        <pre className="p-3 text-xs">
                          <code className={`language-${suggestion.language}`}>
                            {suggestion.code}
                          </code>
                        </pre>
                      </ScrollArea>
                    </div>
                    
                    {suggestion.filePath && (
                      <div className="text-xs text-muted-foreground">
                        <strong>Suggested file:</strong> {suggestion.filePath}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
