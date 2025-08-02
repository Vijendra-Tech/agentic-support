import { Octokit } from '@octokit/rest'
import { GitHubRepository, GitHubIssue, GitHubPullRequest, GitHubTreeItem, JiraIssue, AdoWorkItem } from './types'

// GitHub Integration Service
export class GitHubService {
  private octokit: Octokit

  constructor(token: string) {
    this.octokit = new Octokit({
      auth: token,
    })
  }

  async getRepositories(): Promise<GitHubRepository[]> {
    try {
      const { data } = await this.octokit.rest.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 50,
      })
      
      return data.map(repo => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        html_url: repo.html_url,
        clone_url: repo.clone_url,
        default_branch: repo.default_branch,
      }))
    } catch (error) {
      console.error('Error fetching repositories:', error)
      throw new Error('Failed to fetch repositories')
    }
  }

  async getIssues(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open'): Promise<GitHubIssue[]> {
    try {
      const { data } = await this.octokit.rest.issues.listForRepo({
        owner,
        repo,
        state,
        per_page: 50,
      })

      return data.map(issue => ({
        id: issue.id,
        number: issue.number,
        title: issue.title,
        body: issue.body || null,
        state: issue.state as 'open' | 'closed',
        html_url: issue.html_url,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        labels: issue.labels.map(label => ({
          name: typeof label === 'string' ? label : label.name || '',
          color: typeof label === 'string' ? '' : label.color || '',
        })),
      }))
    } catch (error) {
      console.error('Error fetching issues:', error)
      throw new Error('Failed to fetch issues')
    }
  }

  async getPullRequests(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open'): Promise<GitHubPullRequest[]> {
    try {
      const { data } = await this.octokit.rest.pulls.list({
        owner,
        repo,
        state,
        per_page: 50,
      })

      return data.map(pr => ({
        id: pr.id,
        number: pr.number,
        title: pr.title,
        body: pr.body || null,
        state: pr.state as 'open' | 'closed' | 'merged',
        html_url: pr.html_url,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        head: {
          ref: pr.head.ref,
          sha: pr.head.sha,
        },
        base: {
          ref: pr.base.ref,
          sha: pr.base.sha,
        },
      }))
    } catch (error) {
      console.error('Error fetching pull requests:', error)
      throw new Error('Failed to fetch pull requests')
    }
  }

  async createIssue(owner: string, repo: string, title: string, body: string, labels?: string[]): Promise<GitHubIssue> {
    try {
      const { data } = await this.octokit.rest.issues.create({
        owner,
        repo,
        title,
        body,
        labels,
      })

      return {
        id: data.id,
        number: data.number,
        title: data.title,
        body: data.body || null,
        state: data.state as 'open' | 'closed',
        html_url: data.html_url,
        created_at: data.created_at,
        updated_at: data.updated_at,
        labels: data.labels.map(label => ({
          name: typeof label === 'string' ? label : label.name || '',
          color: typeof label === 'string' ? '' : label.color || '',
        })),
      }
    } catch (error) {
      console.error('Error creating issue:', error)
      throw new Error('Failed to create issue')
    }
  }

  async getFileContent(ownerOrFullName: string, repoOrPath: string, pathOrRef?: string, ref?: string): Promise<string> {
    let owner: string, repo: string, path: string, refToUse: string | undefined
    
    if (pathOrRef && ref !== undefined) {
      // Called with (owner, repo, path, ref)
      owner = ownerOrFullName
      repo = repoOrPath
      path = pathOrRef
      refToUse = ref
    } else {
      // Called with (repoFullName, path, sha)
      const [repoOwner, repoName] = ownerOrFullName.split('/')
      owner = repoOwner
      repo = repoName
      path = repoOrPath
      refToUse = pathOrRef
    }

    const fetchContent = async (ref: string | undefined) => {
      try {
        const { data } = await this.octokit.rest.repos.getContent({
          owner,
          repo,
          path,
          ref,
        })

        if ('content' in data && data.content) {
          return Buffer.from(data.content, 'base64').toString('utf-8')
        }
        
        throw new Error('File content not found')
      } catch (error: any) {
        if (error.status === 404 && ref) {
          // If we get a 404 and we were using a specific ref, return null to try with default branch
          return null;
        }
        throw error;
      }
    }

    try {
      // First try with the provided ref
      if (refToUse) {
        const content = await fetchContent(refToUse);
        if (content !== null) return content;
      }
      
      // If that fails, try with the default branch
      const { data: repoData } = await this.octokit.rest.repos.get({ owner, repo });
      const content = await fetchContent(repoData.default_branch);
      if (content !== null) return content;
      
      throw new Error('File not found in the repository');
    } catch (error: any) {
      console.error('Error fetching file content:', error);
      if (error.status === 404) {
        throw new Error(`File not found at path: ${path}${refToUse ? ` (ref: ${refToUse})` : ''}`);
      }
      throw new Error(`Failed to fetch file content: ${error.message || 'Unknown error'}`);
    }
  }

  async getRepositoryTree(repoFullName: string, branch: string = 'main'): Promise<GitHubTreeItem[]> {
    try {
      const [owner, repo] = repoFullName.split('/')
      
      const { data } = await this.octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: branch,
        recursive: 'true',
      })

      return data.tree.map(item => ({
        path: item.path || '',
        mode: item.mode || '',
        type: item.type as 'blob' | 'tree',
        sha: item.sha || '',
        size: item.size,
        url: item.url || ''
      }))
    } catch (error) {
      console.error('Error fetching repository tree:', error)
      throw new Error('Failed to fetch repository tree')
    }
  }
}

// JIRA Integration Service
export class JiraService {
  private baseUrl: string
  private auth: string

  constructor(baseUrl: string, email: string, apiToken: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.auth = Buffer.from(`${email}:${apiToken}`).toString('base64')
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}/rest/api/3${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Basic ${this.auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`JIRA API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async getIssues(jql: string = 'assignee = currentUser() ORDER BY updated DESC'): Promise<JiraIssue[]> {
    try {
      const data = await this.request(`/search?jql=${encodeURIComponent(jql)}&maxResults=50`)
      
      return data.issues.map((issue: any) => ({
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary,
        description: issue.fields.description || '',
        status: issue.fields.status.name,
        priority: issue.fields.priority?.name || 'None',
        assignee: issue.fields.assignee ? {
          displayName: issue.fields.assignee.displayName,
          emailAddress: issue.fields.assignee.emailAddress,
        } : undefined,
        created: issue.fields.created,
        updated: issue.fields.updated,
      }))
    } catch (error) {
      console.error('Error fetching JIRA issues:', error)
      throw new Error('Failed to fetch JIRA issues')
    }
  }

  async createIssue(projectKey: string, summary: string, description: string, issueType: string = 'Task'): Promise<JiraIssue> {
    try {
      const data = await this.request('/issue', {
        method: 'POST',
        body: JSON.stringify({
          fields: {
            project: { key: projectKey },
            summary,
            description: {
              type: 'doc',
              version: 1,
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: description }],
                },
              ],
            },
            issuetype: { name: issueType },
          },
        }),
      })

      // Fetch the created issue to get full details
      const issueData = await this.request(`/issue/${data.key}`)
      
      return {
        id: issueData.id,
        key: issueData.key,
        summary: issueData.fields.summary,
        description: issueData.fields.description || '',
        status: issueData.fields.status.name,
        priority: issueData.fields.priority?.name || 'None',
        assignee: issueData.fields.assignee ? {
          displayName: issueData.fields.assignee.displayName,
          emailAddress: issueData.fields.assignee.emailAddress,
        } : undefined,
        created: issueData.fields.created,
        updated: issueData.fields.updated,
      }
    } catch (error) {
      console.error('Error creating JIRA issue:', error)
      throw new Error('Failed to create JIRA issue')
    }
  }
}

// Azure DevOps Integration Service
export class AdoService {
  private baseUrl: string
  private auth: string

  constructor(organization: string, personalAccessToken: string) {
    this.baseUrl = `https://dev.azure.com/${organization}`
    this.auth = Buffer.from(`:${personalAccessToken}`).toString('base64')
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Basic ${this.auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`ADO API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async getWorkItems(project: string, wiql?: string): Promise<AdoWorkItem[]> {
    try {
      // Default query to get recent work items
      const defaultWiql = `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.AssignedTo], [System.CreatedDate], [System.ChangedDate] FROM WorkItems WHERE [System.TeamProject] = '${project}' ORDER BY [System.ChangedDate] DESC`
      
      const queryData = await this.request(`/${project}/_apis/wit/wiql?api-version=7.0`, {
        method: 'POST',
        body: JSON.stringify({
          query: wiql || defaultWiql,
        }),
      })

      if (!queryData.workItems || queryData.workItems.length === 0) {
        return []
      }

      const workItemIds = queryData.workItems.map((wi: any) => wi.id).slice(0, 50)
      const workItemsData = await this.request(`/${project}/_apis/wit/workitems?ids=${workItemIds.join(',')}&api-version=7.0`)

      return workItemsData.value.map((item: any) => ({
        id: item.id,
        title: item.fields['System.Title'],
        description: item.fields['System.Description'] || '',
        state: item.fields['System.State'],
        workItemType: item.fields['System.WorkItemType'],
        assignedTo: item.fields['System.AssignedTo'] ? {
          displayName: item.fields['System.AssignedTo'].displayName,
          uniqueName: item.fields['System.AssignedTo'].uniqueName,
        } : undefined,
        createdDate: item.fields['System.CreatedDate'],
        changedDate: item.fields['System.ChangedDate'],
      }))
    } catch (error) {
      console.error('Error fetching ADO work items:', error)
      throw new Error('Failed to fetch ADO work items')
    }
  }

  async createWorkItem(project: string, workItemType: string, title: string, description?: string): Promise<AdoWorkItem> {
    try {
      const operations = [
        {
          op: 'add',
          path: '/fields/System.Title',
          value: title,
        },
      ]

      if (description) {
        operations.push({
          op: 'add',
          path: '/fields/System.Description',
          value: description,
        })
      }

      const data = await this.request(`/${project}/_apis/wit/workitems/$${workItemType}?api-version=7.0`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json-patch+json',
        },
        body: JSON.stringify(operations),
      })

      return {
        id: data.id,
        title: data.fields['System.Title'],
        description: data.fields['System.Description'] || '',
        state: data.fields['System.State'],
        workItemType: data.fields['System.WorkItemType'],
        assignedTo: data.fields['System.AssignedTo'] ? {
          displayName: data.fields['System.AssignedTo'].displayName,
          uniqueName: data.fields['System.AssignedTo'].uniqueName,
        } : undefined,
        createdDate: data.fields['System.CreatedDate'],
        changedDate: data.fields['System.ChangedDate'],
      }
    } catch (error) {
      console.error('Error creating ADO work item:', error)
      throw new Error('Failed to create ADO work item')
    }
  }
}

// Integration Factory
export class IntegrationFactory {
  static createGitHubService(token: string): GitHubService {
    return new GitHubService(token)
  }

  static createJiraService(baseUrl: string, email: string, apiToken: string): JiraService {
    return new JiraService(baseUrl, email, apiToken)
  }

  static createAdoService(organization: string, personalAccessToken: string): AdoService {
    return new AdoService(organization, personalAccessToken)
  }
}
