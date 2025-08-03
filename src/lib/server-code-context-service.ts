import fs from 'fs/promises'
import path from 'path'

export interface CodeContext {
  filePath: string
  fileName: string
  repository: string
  content: string
  relevanceScore: number
  lineNumbers?: { start: number; end: number }
  language: string
  contextType: 'function' | 'class' | 'interface' | 'component' | 'config' | 'test' | 'documentation'
}

export interface CodeSearchResult {
  contexts: CodeContext[]
  totalMatches: number
  searchTerms: string[]
  confidence: number
}

export class ServerCodeContextService {
  private projectPath: string

  constructor(projectPath?: string) {
    // Default to current project directory
    this.projectPath = projectPath || process.cwd()
  }

  /**
   * Search for relevant code context based on user query
   */
  async searchCodeContext(query: string, maxResults: number = 10): Promise<CodeSearchResult> {
    const searchTerms = this.extractSearchTerms(query)
    const contexts: CodeContext[] = []
    
    try {
      // Get all code files from the project
      const files = await this.getAllCodeFiles()
      
      if (files.length === 0) {
        return {
          contexts: [], 
          totalMatches: 0,
          searchTerms,
          confidence: 0
        }
      }

      // Search through files for relevant content
      for (const file of files) {
        try {
          const content = await fs.readFile(file.fullPath, 'utf-8')
          const relevanceScore = this.calculateFileRelevance(file, content, searchTerms, query)
          
          if (relevanceScore > 0.1) { // Only include files with some relevance
            const context: CodeContext = {
              filePath: file.relativePath,
              fileName: file.name,
              repository: 'current-project',
              content,
              relevanceScore,
              language: this.detectLanguage(file.name),
              contextType: this.determineContextType(file.relativePath, content)
            }
            
            // Extract relevant code sections if the file is large
            if (content.length > 2000) {
              const relevantSection = this.extractRelevantSection(content, searchTerms)
              if (relevantSection) {
                context.content = relevantSection.content
                context.lineNumbers = relevantSection.lineNumbers
              }
            }
            
            contexts.push(context)
          }
        } catch (fileError) {
          // Skip files that can't be read
          console.warn(`Could not read file ${file.fullPath}:`, fileError)
        }
      }

      // Sort by relevance score and limit results
      contexts.sort((a, b) => b.relevanceScore - a.relevanceScore)
      const limitedContexts = contexts.slice(0, maxResults)

      const confidence = this.calculateSearchConfidence(limitedContexts, searchTerms)

      return {
        contexts: limitedContexts,
        totalMatches: contexts.length,
        searchTerms,
        confidence
      }
    } catch (error) {
      console.error('Error searching code context:', error)
      return {
        contexts: [],
        totalMatches: 0,
        searchTerms,
        confidence: 0
      }
    }
  }

  /**
   * Get all code files from the project directory
   */
  private async getAllCodeFiles(): Promise<Array<{ fullPath: string; relativePath: string; name: string }>> {
    const files: Array<{ fullPath: string; relativePath: string; name: string }> = []
    
    const codeExtensions = [
      '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cs', '.go', '.rs', '.php', '.rb',
      '.cpp', '.c', '.h', '.css', '.scss', '.html', '.json', '.yaml', '.yml', '.md',
      '.sql', '.sh', '.dockerfile'
    ]

    const excludeDirs = [
      'node_modules', '.git', '.next', 'dist', 'build', 'coverage', '.turbo',
      'target', 'vendor', '__pycache__', '.vscode', '.idea'
    ]

    async function scanDirectory(dirPath: string, relativePath: string = ''): Promise<void> {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true })
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name)
          const relPath = path.join(relativePath, entry.name)
          
          if (entry.isDirectory()) {
            // Skip excluded directories
            if (!excludeDirs.includes(entry.name) && !entry.name.startsWith('.')) {
              await scanDirectory(fullPath, relPath)
            }
          } else if (entry.isFile()) {
            // Include files with code extensions
            const ext = path.extname(entry.name).toLowerCase()
            if (codeExtensions.includes(ext)) {
              files.push({
                fullPath,
                relativePath: relPath,
                name: entry.name
              })
            }
          }
        }
      } catch (error) {
        // Skip directories that can't be read
        console.warn(`Could not scan directory ${dirPath}:`, error)
      }
    }

    await scanDirectory(this.projectPath)
    return files
  }

  /**
   * Extract search terms from user query
   */
  private extractSearchTerms(query: string): string[] {
    const technicalTerms = [
      // Programming concepts
      'function', 'class', 'interface', 'component', 'method', 'variable', 'constant',
      'async', 'await', 'promise', 'callback', 'event', 'handler', 'listener',
      'state', 'props', 'context', 'hook', 'effect', 'reducer', 'action',
      
      // Common issues
      'error', 'bug', 'crash', 'fail', 'exception', 'timeout', 'memory', 'leak',
      'performance', 'slow', 'optimization', 'bottleneck', 'deadlock',
      
      // Technologies
      'react', 'typescript', 'javascript', 'node', 'express', 'api', 'database',
      'sql', 'mongodb', 'redis', 'auth', 'authentication', 'authorization',
      'test', 'testing', 'jest', 'cypress', 'docker', 'kubernetes',
      
      // File types and patterns
      'config', 'configuration', 'env', 'environment', 'package', 'dependency',
      'route', 'middleware', 'controller', 'service', 'util', 'helper'
    ]

    const words = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)

    // Extract technical terms and important keywords
    const searchTerms = words.filter(word => 
      technicalTerms.includes(word) || 
      word.length > 4 || // Include longer words that might be specific terms
      /^[A-Z][a-z]+[A-Z]/.test(word) // CamelCase terms
    )

    // Add exact phrases for multi-word technical terms
    technicalTerms.forEach(term => {
      if (query.toLowerCase().includes(term)) {
        searchTerms.push(term)
      }
    })

    return [...new Set(searchTerms)]
  }

  /**
   * Calculate relevance score for a file based on search terms
   */
  private calculateFileRelevance(file: any, content: string, searchTerms: string[], originalQuery: string): number {
    let score = 0
    const contentLower = content.toLowerCase()
    const fileName = file.name.toLowerCase()
    const filePath = file.relativePath.toLowerCase()

    // Check for exact matches in file name (high weight)
    searchTerms.forEach(term => {
      if (fileName.includes(term)) {
        score += 0.3
      }
      if (filePath.includes(term)) {
        score += 0.2
      }
    })

    // Check for matches in file content
    searchTerms.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi')
      const matches = contentLower.match(regex)
      if (matches) {
        score += Math.min(matches.length * 0.05, 0.2) // Cap contribution per term
      }
    })

    // Boost score for certain file types based on query context
    if (originalQuery.includes('test') && (fileName.includes('test') || fileName.includes('spec'))) {
      score += 0.2
    }
    if (originalQuery.includes('config') && (fileName.includes('config') || fileName.includes('env'))) {
      score += 0.2
    }
    if (originalQuery.includes('component') && fileName.includes('component')) {
      score += 0.2
    }

    return Math.min(score, 1.0)
  }

  /**
   * Extract relevant section from large files
   */
  private extractRelevantSection(content: string, searchTerms: string[]): { content: string; lineNumbers: { start: number; end: number } } | null {
    const lines = content.split('\n')
    const relevantLines: { line: string; index: number; score: number }[] = []

    // Score each line based on search terms
    lines.forEach((line, index) => {
      let lineScore = 0
      const lowerLine = line.toLowerCase()
      
      searchTerms.forEach(term => {
        if (lowerLine.includes(term)) {
          lineScore += 1
        }
      })

      if (lineScore > 0) {
        relevantLines.push({ line, index, score: lineScore })
      }
    })

    if (relevantLines.length === 0) return null

    // Find the best section (around the highest scoring lines)
    relevantLines.sort((a, b) => b.score - a.score)
    const bestLine = relevantLines[0]
    
    // Extract context around the best line (±15 lines)
    const start = Math.max(0, bestLine.index - 15)
    const end = Math.min(lines.length - 1, bestLine.index + 15)
    
    const sectionLines = lines.slice(start, end + 1)
    
    return {
      content: sectionLines.join('\n'),
      lineNumbers: { start: start + 1, end: end + 1 }
    }
  }

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase()
    
    const languageMap: { [key: string]: string } = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'java': 'java',
      'cs': 'csharp',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'rb': 'ruby',
      'cpp': 'cpp',
      'c': 'c',
      'h': 'c',
      'css': 'css',
      'scss': 'scss',
      'html': 'html',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sql': 'sql',
      'sh': 'bash',
      'dockerfile': 'dockerfile'
    }

    return languageMap[extension || ''] || 'text'
  }

  /**
   * Determine the type of code context
   */
  private determineContextType(filePath: string, content: string): CodeContext['contextType'] {
    const fileName = filePath.toLowerCase()
    const contentLower = content.toLowerCase()

    if (fileName.includes('test') || fileName.includes('spec')) {
      return 'test'
    }
    if (fileName.includes('config') || fileName.includes('.env') || fileName.includes('package.json')) {
      return 'config'
    }
    if (fileName.includes('readme') || fileName.includes('.md')) {
      return 'documentation'
    }
    if (contentLower.includes('class ') || contentLower.includes('export class')) {
      return 'class'
    }
    if (contentLower.includes('interface ') || contentLower.includes('export interface')) {
      return 'interface'
    }
    if (contentLower.includes('function ') || contentLower.includes('const ') || contentLower.includes('export function')) {
      return 'function'
    }
    if (fileName.includes('component') || contentLower.includes('react') || contentLower.includes('jsx')) {
      return 'component'
    }

    return 'function' // Default fallback
  }

  /**
   * Calculate confidence score for search results
   */
  private calculateSearchConfidence(contexts: CodeContext[], searchTerms: string[]): number {
    if (contexts.length === 0) return 0

    let confidence = 0

    // Base confidence from number of results
    confidence += Math.min(contexts.length * 0.1, 0.3)

    // Confidence from relevance scores
    const avgRelevance = contexts.reduce((sum, ctx) => sum + ctx.relevanceScore, 0) / contexts.length
    confidence += avgRelevance * 0.4

    // Confidence from search term coverage
    const termCoverage = searchTerms.length > 0 ? 0.3 : 0
    confidence += termCoverage

    return Math.min(confidence, 1.0)
  }

  /**
   * Format code contexts for AI prompt
   */
  formatContextsForPrompt(contexts: CodeContext[]): string {
    if (contexts.length === 0) {
      return "No relevant code context found in the repository."
    }

    let formatted = "\n=== RELEVANT CODE CONTEXT FROM REPOSITORY ===\n\n"

    contexts.forEach((context, index) => {
      formatted += `**${index + 1}. ${context.fileName}** (${context.repository})\n`
      formatted += `Path: ${context.filePath}\n`
      formatted += `Type: ${context.contextType} | Language: ${context.language} | Relevance: ${(context.relevanceScore * 100).toFixed(1)}%\n`
      
      if (context.lineNumbers) {
        formatted += `Lines: ${context.lineNumbers.start}-${context.lineNumbers.end}\n`
      }
      
      formatted += "```" + context.language + "\n"
      formatted += context.content.substring(0, 1500) // Limit content length
      if (context.content.length > 1500) {
        formatted += "\n... (truncated)"
      }
      formatted += "\n```\n\n"
    })

    formatted += "=== END CODE CONTEXT ===\n"
    return formatted
  }
}
