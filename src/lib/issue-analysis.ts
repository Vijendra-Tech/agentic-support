import { GitHubService } from './integrations'
import { createSampleIntegrations } from './integration-utils'
import { ServerCodeContextService, CodeContext } from './server-code-context-service'

export interface IssueMatch {
  id: string
  title: string
  body: string
  labels: string[]
  state: 'open' | 'closed'
  repository: string
  url: string
  relevanceScore: number
  suggestedActions: string[]
}

export interface CodeSuggestion {
  id: string
  title: string
  description: string
  code: string
  language: string
  filePath?: string
  repository?: string
  priority: 'high' | 'medium' | 'low'
  category: 'bug_fix' | 'performance' | 'security' | 'best_practice' | 'feature'
}

export interface AnalysisResult {
  relevantIssues: IssueMatch[]
  codeSuggestions: CodeSuggestion[]
  codeContexts: CodeContext[]
  summary: string
  confidence: number
}

export class IssueAnalysisService {
  private integrations = createSampleIntegrations()
  private codeContextService = new ServerCodeContextService()

  /**
   * Analyze user statement to find relevant issues and generate code suggestions
   */
  async analyzeUserStatement(statement: string): Promise<AnalysisResult> {
    const keywords = this.extractKeywords(statement)
    const context = this.determineContext(statement)
    
    // Find relevant issues from GitHub integrations
    const relevantIssues = await this.findRelevantIssues(keywords, context)
    
    // Search for relevant code context from synced repositories
    const codeSearchResult = await this.codeContextService.searchCodeContext(statement, 5)
    const codeContexts = codeSearchResult.contexts
    
    // Generate code suggestions based on the analysis
    const codeSuggestions = await this.generateCodeSuggestions(statement, keywords, context, relevantIssues)
    
    // Calculate overall confidence score (including code context)
    const confidence = this.calculateConfidence(relevantIssues, codeSuggestions, keywords, codeContexts)
    
    // Generate summary
    const summary = this.generateSummary(statement, relevantIssues, codeSuggestions, codeContexts)
    
    return {
      relevantIssues,
      codeSuggestions,
      codeContexts,
      summary,
      confidence
    }
  }

  /**
   * Extract relevant keywords from user statement
   */
  private extractKeywords(statement: string): string[] {
    const technicalTerms = [
      // Languages & Frameworks
      'javascript', 'typescript', 'react', 'node', 'python', 'java', 'c#', 'go', 'rust',
      'angular', 'vue', 'svelte', 'next.js', 'express', 'fastapi', 'spring', 'django',
      
      // Issues & Problems
      'bug', 'error', 'crash', 'fail', 'broken', 'issue', 'problem', 'exception',
      'memory leak', 'performance', 'slow', 'timeout', 'deadlock', 'race condition',
      
      // Security
      'security', 'vulnerability', 'xss', 'sql injection', 'csrf', 'authentication',
      'authorization', 'oauth', 'jwt', 'encryption', 'ssl', 'tls',
      
      // DevOps & Infrastructure
      'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'ci/cd', 'pipeline', 'deployment',
      'database', 'redis', 'mongodb', 'postgresql', 'mysql', 'elasticsearch',
      
      // Testing
      'test', 'testing', 'unit test', 'integration test', 'e2e', 'jest', 'cypress',
      'selenium', 'coverage', 'mock', 'stub'
    ]
    
    const words = statement.toLowerCase().split(/\s+/)
    const keywords = words.filter(word => 
      technicalTerms.some(term => 
        word.includes(term) || term.includes(word)
      )
    )
    
    // Add exact matches for multi-word terms
    technicalTerms.forEach(term => {
      if (statement.toLowerCase().includes(term)) {
        keywords.push(term)
      }
    })
    
    return [...new Set(keywords)] // Remove duplicates
  }

  /**
   * Determine the context/category of the user's request
   */
  private determineContext(statement: string): string[] {
    const contexts: { [key: string]: string[] } = {
      'debugging': ['debug', 'error', 'bug', 'crash', 'fail', 'broken', 'exception', 'stack trace'],
      'performance': ['slow', 'performance', 'optimize', 'speed', 'memory', 'cpu', 'bottleneck'],
      'security': ['security', 'vulnerability', 'hack', 'breach', 'auth', 'permission', 'encrypt'],
      'testing': ['test', 'testing', 'coverage', 'mock', 'unit', 'integration', 'e2e'],
      'deployment': ['deploy', 'build', 'ci/cd', 'pipeline', 'docker', 'kubernetes', 'production'],
      'database': ['database', 'sql', 'query', 'migration', 'schema', 'index', 'transaction'],
      'api': ['api', 'endpoint', 'rest', 'graphql', 'webhook', 'integration', 'service'],
      'frontend': ['ui', 'ux', 'component', 'render', 'dom', 'css', 'responsive', 'browser'],
      'backend': ['server', 'backend', 'microservice', 'architecture', 'scalability', 'load']
    }
    
    const detectedContexts: string[] = []
    const lowerStatement = statement.toLowerCase()
    
    Object.entries(contexts).forEach(([context, keywords]) => {
      if (keywords.some(keyword => lowerStatement.includes(keyword))) {
        detectedContexts.push(context)
      }
    })
    
    return detectedContexts
  }

  /**
   * Find relevant GitHub issues based on keywords and context
   */
  private async findRelevantIssues(keywords: string[], context: string[]): Promise<IssueMatch[]> {
    // Mock GitHub issues data - in a real implementation, this would query GitHub API
    const mockIssues: IssueMatch[] = [
      {
        id: 'issue-1',
        title: 'Authentication timeout in production',
        body: 'Users experiencing timeout errors when logging in during peak hours. JWT tokens seem to expire unexpectedly.',
        labels: ['bug', 'authentication', 'production'],
        state: 'open',
        repository: 'main-app',
        url: 'https://github.com/company/main-app/issues/142',
        relevanceScore: 0.9,
        suggestedActions: [
          'Check JWT token expiration settings',
          'Review authentication middleware',
          'Add timeout handling in login flow'
        ]
      },
      {
        id: 'issue-2',
        title: 'React component re-rendering performance issue',
        body: 'Dashboard components are re-rendering too frequently, causing UI lag. Need to optimize with React.memo and useMemo.',
        labels: ['performance', 'react', 'frontend'],
        state: 'open',
        repository: 'frontend-app',
        url: 'https://github.com/company/frontend-app/issues/89',
        relevanceScore: 0.8,
        suggestedActions: [
          'Implement React.memo for expensive components',
          'Use useMemo for heavy calculations',
          'Add React DevTools profiler analysis'
        ]
      },
      {
        id: 'issue-3',
        title: 'Database connection pool exhaustion',
        body: 'API endpoints failing with connection pool errors during high traffic. Need to optimize database connections.',
        labels: ['database', 'performance', 'backend'],
        state: 'open',
        repository: 'api-service',
        url: 'https://github.com/company/api-service/issues/156',
        relevanceScore: 0.85,
        suggestedActions: [
          'Increase database connection pool size',
          'Implement connection pooling best practices',
          'Add database monitoring and alerts'
        ]
      }
    ]
    
    // Filter and score issues based on relevance
    return mockIssues
      .filter(issue => {
        const issueText = `${issue.title} ${issue.body} ${issue.labels.join(' ')}`.toLowerCase()
        return keywords.some(keyword => issueText.includes(keyword)) ||
               context.some(ctx => issue.labels.some(label => label.includes(ctx)))
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5) // Return top 5 most relevant issues
  }

  /**
   * Generate code suggestions based on analysis
   */
  private async generateCodeSuggestions(
    statement: string, 
    keywords: string[], 
    context: string[], 
    issues: IssueMatch[]
  ): Promise<CodeSuggestion[]> {
    const suggestions: CodeSuggestion[] = []
    
    // Authentication/JWT related suggestions
    if (keywords.some(k => ['auth', 'jwt', 'token', 'login'].includes(k))) {
      suggestions.push({
        id: 'auth-timeout-fix',
        title: 'Fix JWT Token Timeout Handling',
        description: 'Add proper timeout handling and token refresh logic to prevent authentication failures.',
        code: `// Enhanced JWT token handling with timeout
import jwt from 'jsonwebtoken'

export const verifyTokenWithTimeout = async (token: string, timeout = 30000) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Token verification timeout'))
    }, timeout)
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!)
      clearTimeout(timer)
      resolve(decoded)
    } catch (error) {
      clearTimeout(timer)
      reject(error)
    }
  })
}

// Middleware with timeout handling
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) throw new Error('No token provided')
    
    const user = await verifyTokenWithTimeout(token)
    req.user = user
    next()
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed', details: error.message })
  }
}`,
        language: 'typescript',
        filePath: 'src/middleware/auth.ts',
        repository: 'main-app',
        priority: 'high',
        category: 'bug_fix'
      })
    }
    
    // React performance suggestions
    if (keywords.some(k => ['react', 'performance', 'render'].includes(k))) {
      suggestions.push({
        id: 'react-performance-fix',
        title: 'Optimize React Component Re-rendering',
        description: 'Use React.memo and useMemo to prevent unnecessary re-renders and improve performance.',
        code: `import React, { memo, useMemo, useCallback } from 'react'

// Memoized component to prevent unnecessary re-renders
const DashboardCard = memo(({ data, onUpdate }) => {
  // Memoize expensive calculations
  const processedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      computed: expensiveCalculation(item)
    }))
  }, [data])
  
  // Memoize callback functions
  const handleUpdate = useCallback((id: string) => {
    onUpdate(id)
  }, [onUpdate])
  
  return (
    <div className="dashboard-card">
      {processedData.map(item => (
        <div key={item.id} onClick={() => handleUpdate(item.id)}>
          {item.name}: {item.computed}
        </div>
      ))}
    </div>
  )
})

// Custom hook for optimized data fetching
const useDashboardData = (filters) => {
  return useMemo(() => {
    return fetchDashboardData(filters)
  }, [filters])
}`,
        language: 'typescript',
        filePath: 'src/components/DashboardCard.tsx',
        repository: 'frontend-app',
        priority: 'high',
        category: 'performance'
      })
    }
    
    // Database connection suggestions
    if (keywords.some(k => ['database', 'connection', 'pool'].includes(k))) {
      suggestions.push({
        id: 'db-connection-fix',
        title: 'Optimize Database Connection Pool',
        description: 'Implement proper connection pooling to handle high traffic and prevent connection exhaustion.',
        code: `import { Pool } from 'pg'

// Optimized connection pool configuration
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  
  // Connection pool settings
  min: 5,          // Minimum connections
  max: 20,         // Maximum connections
  idleTimeoutMillis: 30000,  // Close idle connections after 30s
  connectionTimeoutMillis: 10000,  // Timeout after 10s
  
  // Health check
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
})

// Connection wrapper with retry logic
export const queryWithRetry = async (text: string, params?: any[], retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect()
      try {
        const result = await client.query(text, params)
        return result
      } finally {
        client.release() // Always release connection
      }
    } catch (error) {
      if (i === retries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))) // Exponential backoff
    }
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await pool.end()
  process.exit(0)
})`,
        language: 'typescript',
        filePath: 'src/lib/database.ts',
        repository: 'api-service',
        priority: 'high',
        category: 'performance'
      })
    }
    
    return suggestions
  }

  /**
   * Calculate confidence score based on matches and relevance
   */
  private calculateConfidence(issues: IssueMatch[], suggestions: CodeSuggestion[], keywords: string[], codeContexts?: CodeContext[]): number {
    let confidence = 0
    
    // Base confidence from keyword matches
    confidence += Math.min(keywords.length * 0.1, 0.3)
    
    // Confidence from relevant issues found
    confidence += Math.min(issues.length * 0.15, 0.4)
    
    // Confidence from code suggestions generated
    confidence += Math.min(suggestions.length * 0.1, 0.3)
    
    // Bonus for high-relevance issues
    const highRelevanceIssues = issues.filter(issue => issue.relevanceScore > 0.8)
    confidence += highRelevanceIssues.length * 0.05
    
    // Confidence from code context matches
    if (codeContexts && codeContexts.length > 0) {
      confidence += Math.min(codeContexts.length * 0.1, 0.2)
      
      // Bonus for high-relevance code contexts
      const highRelevanceContexts = codeContexts.filter(ctx => ctx.relevanceScore > 0.5)
      confidence += highRelevanceContexts.length * 0.05
    }
    
    return Math.min(confidence, 1.0)
  }

  /**
   * Generate a summary of the analysis
   */
  private generateSummary(statement: string, issues: IssueMatch[], suggestions: CodeSuggestion[], codeContexts?: CodeContext[]): string {
    if (issues.length === 0 && suggestions.length === 0 && (!codeContexts || codeContexts.length === 0)) {
      return "I couldn't find specific relevant issues, code suggestions, or repository context for your request. Try providing more technical details or specific error messages."
    }
    
    let summary = `Based on your request: "${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}"\n\n`
    
    if (codeContexts && codeContexts.length > 0) {
      summary += `📁 **Found ${codeContexts.length} relevant code file${codeContexts.length > 1 ? 's' : ''} in repository:**\n`
      codeContexts.slice(0, 3).forEach(ctx => {
        summary += `• ${ctx.fileName} (${ctx.contextType}) - ${(ctx.relevanceScore * 100).toFixed(1)}% relevant\n`
      })
      summary += '\n'
    }
    
    if (issues.length > 0) {
      summary += `🔍 **Found ${issues.length} relevant issue${issues.length > 1 ? 's' : ''}:**\n`
      issues.slice(0, 3).forEach(issue => {
        summary += `• ${issue.title} (${issue.repository})\n`
      })
      summary += '\n'
    }
    
    if (suggestions.length > 0) {
      summary += `💡 **Generated ${suggestions.length} code suggestion${suggestions.length > 1 ? 's' : ''}:**\n`
      suggestions.forEach(suggestion => {
        summary += `• ${suggestion.title} (${suggestion.category})\n`
      })
      summary += '\n'
    }
    
    summary += "The AI response will include relevant code context and actionable suggestions based on your repository."
    
    return summary
  }
}
