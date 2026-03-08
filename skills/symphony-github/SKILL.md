# symphony-github - GitHub Issues 适配器

> 为 Symphony 提供 GitHub Issues 集成

## 功能

- 📋 **Issue 轮询** - 获取候选 issues（open 状态）
- 🔄 **状态同步** - 批量获取运行中 issues 的当前状态
- 🏷️ **数据规范化** - 将 GitHub API 响应映射到 Symphony Issue 模型

## 使用示例

```typescript
import { createGitHubAdapter } from 'skills/symphony-github/src/index.ts'

const github = await createGitHubAdapter({
  token: process.env.GITHUB_TOKEN,
  repo: 'my-org/my-repo',
})

// 获取候选 issues
const candidates = await github.fetchCandidateIssues({
  states: ['open'],
})

// 批量获取状态
const states = await github.fetchIssueStates([
  'I_kwDO...',  // GitHub issue node ID
])
```

## 配置

```typescript
interface GitHubAdapterConfig {
  token: string           // GitHub Personal Access Token
  repo: string            // 格式：owner/repo
  endpoint?: string       // GitHub GraphQL API 端点（默认官方 API）
}
```

## API

### `fetchCandidateIssues(options)`

获取候选 issues

```typescript
interface FetchOptions {
  states?: string[]       // 状态过滤（默认：['open']）
  labels?: string[]       // 标签过滤
  limit?: number          // 最大返回数（默认：50）
}
```

### `fetchIssueStates(issueIds)`

批量获取 issue 当前状态

### `normalizeIssue(raw)`

将 GitHub GraphQL 响应规范化为 Symphony Issue

## GraphQL Queries

### 获取候选 Issues

```graphql
query GetCandidateIssues($owner: String!, $repo: String!, $states: [IssueState!]) {
  repository(owner: $owner, name: $repo) {
    issues(states: $states, first: 50, orderBy: {field: CREATED_AT, direction: ASC}) {
      nodes {
        id
        number
        title
        body
        state
        createdAt
        updatedAt
        labels(first: 10) { nodes { name } }
      }
    }
  }
}
```

### 刷新 Issue 状态

```graphql
query GetIssueStates($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on Issue {
      id
      state
    }
  }
}
```

## 状态映射

| GitHub | Symphony |
|--------|----------|
| `open` | `active` |
| `closed` | `terminal` |

可通过 `WORKFLOW.md` 配置自定义映射：

```yaml
tracker:
  active_states: ["open"]
  terminal_states: ["closed", "done"]
```

## 依赖

- `@octokit/graphql` - GitHub GraphQL 客户端（可选，也可用原生 fetch）

## 状态

🚧 开发中

---

**版本**: 0.1.0  
**创建时间**: 2026-03-08
