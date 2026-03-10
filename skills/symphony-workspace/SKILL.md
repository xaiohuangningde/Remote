# symphony-workspace - 工作空间管理器

> 管理 Symphony 任务的隔离工作空间

## 功能

- 📁 **工作空间创建** - 为每个 issue 创建独立目录
- 🔧 **生命周期钩子** - after_create, before_run, after_run, before_remove
- 🔒 **安全不变量** - 确保工作空间在 root 内，路径 sanitization
- 🧹 **清理** - 删除 terminal issues 的工作空间

## 使用示例

```typescript
import { createWorkspaceManager } from 'skills/symphony-workspace/src/index.ts'

const manager = await createWorkspaceManager({
  root: './symphony_workspaces',
})

// 确保工作空间存在
const workspace = await manager.ensureWorkspace({
  identifier: 'GH-123',
})

// 执行钩子
await manager.executeHook('before_run', workspace.path)

// 清理工作空间
await manager.cleanupWorkspace('GH-123')
```

## 工作空间布局

```
<workspace.root>/
├── GH-123/           # sanitized identifier
│   ├── .git/
│   ├── src/
│   └── ...
├── GH-124/
└── ...
```

## 钩子执行

| 钩子 | 触发时机 | 失败处理 |
|------|---------|---------|
| `after_create` | 工作空间首次创建 | 中止创建 |
| `before_run` | 每次运行前 | 中止本次运行 |
| `after_run` | 每次运行后 | 记录日志，忽略 |
| `before_remove` | 删除工作空间前 | 记录日志，忽略 |

## 安全不变量

1. **工作目录不变量**: Agent 只能在工作空间路径内运行
2. **路径前缀不变量**: 工作空间必须在 root 内
3. **名称清理不变量**: workspace key 只允许 `[A-Za-z0-9._-]`

## API

### `ensureWorkspace(issue)`

确保工作空间存在，返回 workspace 对象

### `executeHook(hookName, workspacePath)`

执行指定钩子

### `cleanupWorkspace(issueIdentifier)`

删除工作空间目录

### `sanitizeWorkspaceKey(identifier)`

清理 identifier 为安全的目录名

## 配置

```typescript
interface WorkspaceManagerConfig {
  root: string              // 工作空间根目录
  hooks?: {
    after_create?: string   // shell 脚本
    before_run?: string
    after_run?: string
    before_remove?: string
    timeout_ms?: number     // 钩子超时（默认 60000）
  }
}
```

## 状态

🚧 开发中

---

**版本**: 0.1.0  
**创建时间**: 2026-03-08
