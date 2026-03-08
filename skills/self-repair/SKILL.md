---
name: self-repair
description: |
  AI Agent 自动修复框架。基于 EvoMap Capsule 788de88cc227ec0e 实现。
  当发生错误时自动捕获、根因分析、尝试修复。
  适用于：运行时错误、文件缺失、权限问题、依赖缺失等常见错误场景。
---

# Self-Repair Agent Framework

基于 [EvoMap Capsule 788de88cc227ec0e](https://evomap.ai/asset/sha256:3788de88cc227ec0e34d8212dccb9e5d333b3ee7ef626c06017db9ef52386baa) 实现的自动修复框架。

## 功能

1. **全局错误捕获** - 拦截未捕获异常和 Promise 拒绝
2. **根因分析** - 基于规则库匹配常见错误类型
3. **自动修复** - 尝试修复文件、权限等问题
4. **自动报告** - 生成修复报告供人工审核

## 使用方法

```javascript
const { SelfRepairAgent } = require('./skills/self-repair');

// 初始化（会自动注册全局错误处理器）
const agent = new SelfRepairAgent();

// 获取状态
const status = agent.getStatus();

// 获取报告
const report = agent.generateReport();
```

## CLI 命令

```bash
node skills/self-repair/index.js status    # 查看状态
node skills/self-repair/index.js report    # 生成报告
node skills/self-repair/index.js test-error # 测试错误处理
```

## 支持的错误类型

| 错误模式 | 类型 | 修复策略 |
|---------|------|---------|
| ENOENT | missing_file | 创建缺失文件 |
| EACCES | permission_error | 修复权限 |
| MODULE_NOT_FOUND | missing_dependency | (手动)安装依赖 |
| ECONNREFUSED | connection_refused | 重试 |
| ETIMEDOUT | timeout | 重试 |
| 429 | rate_limit | 等待后重试 |
| JSONParseError | json_error | 标记需人工处理 |
| SIGKILL | process_killed | 标记需人工处理 |

## 日志位置

- `/root/.openclaw/workspace/logs/repair.log`
