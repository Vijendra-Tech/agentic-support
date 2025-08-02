import { generateText, streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { Message, ChatSession, Integration } from './types'
import { GitHubService, JiraService, AdoService, IntegrationFactory } from './integrations'

export interface AIServiceConfig {
  apiKey: string
  model?: string
}

export class AIService {
  private config: AIServiceConfig

  constructor(config: AIServiceConfig) {
    this.config = {
      model: 'gpt-4-turbo-preview',
      ...config,
    }
  }

  async generateResponse(
    message: string,
    context: {
      session: ChatSession
      integrations: Integration[]
      activeIntegration?: Integration | null
    }
  ): Promise<string> {
    try {
      const systemPrompt = this.buildSystemPrompt(context)
      const conversationHistory = this.buildConversationHistory(context.session.messages)

      const { text } = await generateText({
        model: openai(this.config.model!),
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: message },
        ],
        temperature: 0.7,
      })

      return text
    } catch (error) {
      console.error('Error generating AI response:', error)
      throw new Error('Failed to generate AI response')
    }
  }

  async streamResponse(
    message: string,
    context: {
      session: ChatSession
      integrations: Integration[]
      activeIntegration?: Integration | null
    }
  ) {
    try {
      const systemPrompt = this.buildSystemPrompt(context)
      const conversationHistory = this.buildConversationHistory(context.session.messages)

      return streamText({
        model: openai(this.config.model!),
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: message },
        ],
        temperature: 0.7,
      })
    } catch (error) {
      console.error('Error streaming AI response:', error)
      throw new Error('Failed to stream AI response')
    }
  }

  async processWithIntegration(
    message: string,
    integration: Integration,
    action: string
  ): Promise<any> {
    try {
      switch (integration.type) {
        case 'github':
          return await this.processGitHubAction(message, integration, action)
        case 'jira':
          return await this.processJiraAction(message, integration, action)
        case 'ado':
          return await this.processAdoAction(message, integration, action)
        default:
          throw new Error(`Unsupported integration type: ${integration.type}`)
      }
    } catch (error) {
      console.error('Error processing integration action:', error)
      throw error
    }
  }

  private buildSystemPrompt(context: {
    session: ChatSession
    integrations: Integration[]
    activeIntegration?: Integration | null
  }): string {
    const basePrompt = `You are an expert L2/L3 support assistant for enterprise software development teams. You specialize in:

1. **GitHub Integration**: Issues, pull requests, code reviews, repository management
2. **JIRA Integration**: Ticket management, workflow automation, project tracking
3. **Azure DevOps Integration**: Work items, build pipelines, release management
4. **Code Analysis**: Debugging, performance optimization, code reviews
5. **Technical Documentation**: API docs, troubleshooting guides, best practices

Your role is to provide comprehensive technical support, automate workflows, and help teams resolve complex issues efficiently.

## Current Session Context:
- Session Type: ${context.session.metadata?.ticketType || 'L2'}
- Priority: ${context.session.metadata?.priority || 'medium'}
- Status: ${context.session.metadata?.status || 'open'}

## Available Integrations:
${context.integrations.map(int => `- ${int.name} (${int.type}): ${int.isActive ? 'Active' : 'Inactive'}`).join('\n')}

${context.activeIntegration ? `## Active Integration:
${context.activeIntegration.name} (${context.activeIntegration.type})` : ''}

## Guidelines:
- Provide actionable, specific solutions
- Use code examples when relevant
- Suggest automation opportunities
- Reference relevant documentation
- Escalate to L3 when necessary
- Always consider security best practices
- Format responses with proper markdown
- Include relevant file references when discussing code

## Response Format:
- Use clear headings and bullet points
- Include code blocks with proper syntax highlighting
- Provide step-by-step instructions when applicable
- Suggest follow-up actions or related tasks`

    return basePrompt
  }

  private buildConversationHistory(messages: Message[]): Array<{ role: 'user' | 'assistant'; content: string }> {
    return messages
      .slice(-10) // Keep last 10 messages for context
      .map(msg => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      }))
  }

  private async processGitHubAction(message: string, integration: Integration, action: string): Promise<any> {
    if (!integration.config.token) {
      throw new Error('GitHub token not configured')
    }

    const github = IntegrationFactory.createGitHubService(integration.config.token)

    switch (action) {
      case 'list-repos':
        return await github.getRepositories()
      
      case 'list-issues':
        // Extract owner/repo from message or use default
        const repoMatch = message.match(/([a-zA-Z0-9-_]+)\/([a-zA-Z0-9-_]+)/)
        if (repoMatch) {
          return await github.getIssues(repoMatch[1], repoMatch[2])
        }
        throw new Error('Repository not specified. Please use format: owner/repo')
      
      case 'create-issue':
        // This would need more sophisticated parsing
        throw new Error('Create issue action requires more specific implementation')
      
      default:
        throw new Error(`Unknown GitHub action: ${action}`)
    }
  }

  private async processJiraAction(message: string, integration: Integration, action: string): Promise<any> {
    if (!integration.config.baseUrl || !integration.config.username || !integration.config.apiKey) {
      throw new Error('JIRA configuration incomplete')
    }

    const jira = IntegrationFactory.createJiraService(
      integration.config.baseUrl,
      integration.config.username,
      integration.config.apiKey
    )

    switch (action) {
      case 'list-issues':
        return await jira.getIssues()
      
      case 'create-issue':
        // This would need more sophisticated parsing
        throw new Error('Create issue action requires more specific implementation')
      
      default:
        throw new Error(`Unknown JIRA action: ${action}`)
    }
  }

  private async processAdoAction(message: string, integration: Integration, action: string): Promise<any> {
    if (!integration.config.baseUrl || !integration.config.token) {
      throw new Error('Azure DevOps configuration incomplete')
    }

    // Extract organization from baseUrl
    const orgMatch = integration.config.baseUrl.match(/dev\.azure\.com\/([^\/]+)/)
    if (!orgMatch) {
      throw new Error('Invalid Azure DevOps URL format')
    }

    const ado = IntegrationFactory.createAdoService(orgMatch[1], integration.config.token)

    switch (action) {
      case 'list-work-items':
        // Extract project from message or use default
        const projectMatch = message.match(/project[:\s]+([a-zA-Z0-9-_]+)/i)
        if (projectMatch) {
          return await ado.getWorkItems(projectMatch[1])
        }
        throw new Error('Project not specified')
      
      case 'create-work-item':
        // This would need more sophisticated parsing
        throw new Error('Create work item action requires more specific implementation')
      
      default:
        throw new Error(`Unknown ADO action: ${action}`)
    }
  }

  // Utility method to extract action intent from user message
  extractActionIntent(message: string): { action: string; confidence: number } | null {
    const actionPatterns = [
      { pattern: /list\s+(issues?|tickets?)/i, action: 'list-issues', confidence: 0.9 },
      { pattern: /show\s+(recent\s+)?(issues?|tickets?)/i, action: 'list-issues', confidence: 0.8 },
      { pattern: /get\s+(repos?|repositories)/i, action: 'list-repos', confidence: 0.9 },
      { pattern: /list\s+(repos?|repositories)/i, action: 'list-repos', confidence: 0.9 },
      { pattern: /create\s+(issue|ticket)/i, action: 'create-issue', confidence: 0.9 },
      { pattern: /new\s+(issue|ticket)/i, action: 'create-issue', confidence: 0.8 },
      { pattern: /list\s+work\s+items/i, action: 'list-work-items', confidence: 0.9 },
      { pattern: /show\s+work\s+items/i, action: 'list-work-items', confidence: 0.8 },
      { pattern: /create\s+work\s+item/i, action: 'create-work-item', confidence: 0.9 },
    ]

    for (const { pattern, action, confidence } of actionPatterns) {
      if (pattern.test(message)) {
        return { action, confidence }
      }
    }

    return null
  }
}
