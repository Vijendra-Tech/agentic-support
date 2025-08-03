import { Integration } from './types'

// Utility function to create sample integration data with health monitoring
export function createSampleIntegrations(): Integration[] {
  const now = new Date()
  
  return [
    {
      id: 'github-1',
      type: 'github',
      name: 'Main Repository',
      config: {
        apiKey: 'ghp_****',
        baseUrl: 'https://api.github.com',
        username: 'user',
      },
      isActive: true,
      lastSync: new Date(now.getTime() - 5 * 60 * 1000), // 5 minutes ago
      health: {
        status: 'connected',
        lastChecked: new Date(now.getTime() - 30 * 1000), // 30 seconds ago
        responseTime: 245,
        apiUsage: {
          used: 3420,
          limit: 5000,
          resetTime: new Date(now.getTime() + 45 * 60 * 1000), // 45 minutes from now
        },
      },
      activity: {
        newItems: 3,
        lastActivity: new Date(now.getTime() - 15 * 60 * 1000), // 15 minutes ago
        recentActions: [
          'New PR #142: Fix authentication bug',
          'Issue #89 updated by john.doe',
          'PR #140 merged to main branch',
        ],
      },
    },
    {
      id: 'jira-1',
      type: 'jira',
      name: 'Project Management',
      config: {
        apiKey: 'ATATT****',
        baseUrl: 'https://company.atlassian.net',
        username: 'user@company.com',
      },
      isActive: true,
      lastSync: new Date(now.getTime() - 2 * 60 * 1000), // 2 minutes ago
      health: {
        status: 'syncing',
        lastChecked: new Date(now.getTime() - 10 * 1000), // 10 seconds ago
        responseTime: 890,
      },
      activity: {
        newItems: 1,
        lastActivity: new Date(now.getTime() - 8 * 60 * 1000), // 8 minutes ago
        recentActions: [
          'Ticket PROJ-456 assigned to you',
        ],
      },
    },
    {
      id: 'ado-1',
      type: 'ado',
      name: 'Azure DevOps',
      config: {
        token: 'pat_****',
        baseUrl: 'https://dev.azure.com/company',
      },
      isActive: false,
      lastSync: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      health: {
        status: 'error',
        lastChecked: new Date(now.getTime() - 5 * 60 * 1000), // 5 minutes ago
        errorMessage: 'Authentication failed: Token expired',
        responseTime: 1200,
      },
      activity: {
        newItems: 0,
        lastActivity: new Date(now.getTime() - 3 * 60 * 60 * 1000), // 3 hours ago
      },
    },
    {
      id: 'github-2',
      type: 'github',
      name: 'Documentation Repo',
      config: {
        apiKey: 'ghp_****',
        baseUrl: 'https://api.github.com',
        username: 'user',
      },
      isActive: true,
      lastSync: new Date(now.getTime() - 10 * 60 * 1000), // 10 minutes ago
      health: {
        status: 'rate_limited',
        lastChecked: new Date(now.getTime() - 2 * 60 * 1000), // 2 minutes ago
        errorMessage: 'Rate limit exceeded. Try again in 15 minutes.',
        responseTime: 156,
        apiUsage: {
          used: 5000,
          limit: 5000,
          resetTime: new Date(now.getTime() + 13 * 60 * 1000), // 13 minutes from now
        },
      },
      activity: {
        newItems: 0,
        lastActivity: new Date(now.getTime() - 45 * 60 * 1000), // 45 minutes ago
      },
    },
  ]
}

// Utility function to simulate real-time health updates
export function updateIntegrationHealth(integration: Integration): Integration {
  const now = new Date()
  const statuses = ['connected', 'syncing', 'error', 'rate_limited', 'warning'] as const
  
  // Simulate some realistic health changes
  let newStatus = integration.health.status
  
  // Occasionally change status based on current state
  if (Math.random() < 0.1) { // 10% chance of status change
    switch (integration.health.status) {
      case 'syncing':
        newStatus = Math.random() < 0.8 ? 'connected' : 'error'
        break
      case 'error':
        newStatus = Math.random() < 0.3 ? 'connected' : 'error'
        break
      case 'rate_limited':
        newStatus = Math.random() < 0.2 ? 'connected' : 'rate_limited'
        break
      default:
        newStatus = 'connected'
    }
  }
  
  return {
    ...integration,
    health: {
      ...integration.health,
      status: newStatus,
      lastChecked: now,
      responseTime: Math.floor(Math.random() * 1000) + 100, // 100-1100ms
    },
    lastSync: newStatus === 'connected' && Math.random() < 0.3 
      ? now 
      : integration.lastSync,
  }
}
