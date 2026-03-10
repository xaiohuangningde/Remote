/**
 * symphony-github - GitHub Issues 适配器
 */

import type { Issue } from '../symphony-core/src/types.ts'

export interface GitHubAdapterConfig {
  token: string
  repo: string  // owner/repo
  endpoint?: string
}

export interface GitHubAdapter {
  fetchCandidateIssues(options?: FetchOptions): Promise<Issue[]>
  fetchIssueStates(issueIds: string[]): Promise<Map<string, string>>
  normalizeIssue(raw: GitHubIssue): Issue
}

export interface FetchOptions {
  states?: string[]
  labels?: string[]
  limit?: number
}

interface GitHubIssue {
  id: string
  number: number
  title: string
  body: string | null
  state: 'OPEN' | 'CLOSED'
  createdAt: string
  updatedAt: string
  labels: {
    nodes: Array<{ name: string }>
  }
}

/**
 * 创建 GitHub 适配器
 */
export async function createGitHubAdapter(
  config: GitHubAdapterConfig
): Promise<GitHubAdapter> {
  const [owner, repo] = config.repo.split('/')
  
  if (!owner || !repo) {
    throw new Error('Invalid repo format. Expected: owner/repo')
  }
  
  const endpoint = config.endpoint ?? 'https://api.github.com/graphql'
  
  return {
    async fetchCandidateIssues(options: FetchOptions = {}): Promise<Issue[]> {
      const states = options.states ?? ['OPEN']
      const limit = options.limit ?? 50
      
      const query = `
        query GetCandidateIssues($owner: String!, $repo: String!, $states: [IssueState!], $first: Int!) {
          repository(owner: $owner, name: $repo) {
            issues(states: $states, first: $first, orderBy: {field: CREATED_AT, direction: ASC}) {
              nodes {
                id
                number
                title
                body
                state
                createdAt
                updatedAt
                labels(first: 10) {
                  nodes { name }
                }
              }
            }
          }
        }
      `
      
      const variables = {
        owner,
        repo,
        states,
        first: limit,
      }
      
      const response = await graphqlRequest(endpoint, config.token, query, variables)
      const rawIssues = response.data.repository.issues.nodes as GitHubIssue[]
      
      return rawIssues.map(issue => normalizeIssue(issue, owner, repo))
    },
    
    async fetchIssueStates(issueIds: string[]): Promise<Map<string, string>> {
      if (issueIds.length === 0) {
        return new Map()
      }
      
      const query = `
        query GetIssueStates($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Issue {
              id
              state
            }
          }
        }
      `
      
      const response = await graphqlRequest(endpoint, config.token, query, { ids: issueIds })
      const nodes = response.data.nodes as Array<{ id: string; state: string }>
      
      const stateMap = new Map<string, string>()
      for (const node of nodes) {
        stateMap.set(node.id, node.state)
      }
      
      return stateMap
    },
    
    normalizeIssue(raw: GitHubIssue): Issue {
      return normalizeIssue(raw, owner, repo)
    },
  }
}

/**
 * 规范化 GitHub Issue 到 Symphony Issue 模型
 */
function normalizeIssue(
  raw: GitHubIssue,
  owner: string,
  repo: string
): Issue & { number: number } {
  return {
    id: raw.id,
    number: raw.number,  // 添加 number 字段用于显示
    identifier: `GH-${raw.number}`,
    title: raw.title,
    description: raw.body,
    priority: null,  // GitHub 没有原生优先级，可用 labels
    state: raw.state.toLowerCase(),
    branch_name: null,
    url: `https://github.com/${owner}/${repo}/issues/${raw.number}`,
    labels: raw.labels.nodes.map(l => l.name.toLowerCase()),
    blocked_by: [],  // TODO: 从 GitHub Projects 依赖关系提取
    created_at: raw.createdAt,
    updated_at: raw.updatedAt,
  }
}

/**
 * GraphQL 请求（带限流检测）
 */
async function graphqlRequest(
  endpoint: string,
  token: string,
  query: string,
  variables: Record<string, unknown>
): Promise<GraphQLResponse & { rateLimit?: RateLimitInfo }> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  })
  
  // 解析限流头
  const rateLimit: RateLimitInfo | undefined = response.headers.get('x-ratelimit-remaining')
    ? {
        limit: parseInt(response.headers.get('x-ratelimit-limit') ?? '5000', 10),
        remaining: parseInt(response.headers.get('x-ratelimit-remaining') ?? '0', 10),
        resetAt: new Date(
          parseInt(response.headers.get('x-ratelimit-reset') ?? '0', 10) * 1000
        ).toISOString(),
      }
    : undefined
  
  if (!response.ok) {
    const errorText = await response.text()
    
    // 检测限流
    if (response.status === 403 && rateLimit && rateLimit.remaining === 0) {
      throw new Error(
        `GitHub API rate limit exceeded. Resets at ${rateLimit.resetAt}`
      )
    }
    
    throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}\n${errorText}`)
  }
  
  const result = await response.json() as GraphQLResponse & { rateLimit?: RateLimitInfo }
  if (rateLimit) {
    result.rateLimit = rateLimit
  }
  
  return result
}

interface GraphQLResponse {
  data: Record<string, unknown>
  errors?: Array<{ message: string }>
}

interface RateLimitInfo {
  limit: number
  remaining: number
  resetAt: string
}
