# create-task.ps1 - 长时任务创建脚本
# 用法：.\create-task.ps1 "任务名称"
# 参考：Anthropic 长时任务最佳实践

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$TaskName,
    
    [string]$TaskId = $null,
    
    [switch]$NoGit
)

$ErrorActionPreference = "Stop"
$WorkspaceRoot = $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📝 创建长时任务" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ============================================
# 1. 生成任务 ID
# ============================================
if (!$TaskId) {
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $random = Get-Random -Maximum 9999
    $TaskId = "task-$timestamp-$random"
}

Write-Host "任务 ID: $TaskId" -ForegroundColor Gray
Write-Host "任务名称：$TaskName" -ForegroundColor Gray
Write-Host ""

# ============================================
# 2. 创建 feature_list.json
# ============================================
Write-Host "[1/4] 创建功能清单..." -ForegroundColor Yellow
$featureListPath = Join-Path $WorkspaceRoot "feature_list.json"

# 如果已存在，读取现有列表
$features = @()
if (Test-Path $featureListPath) {
    try {
        $features = Get-Content $featureListPath -Raw | ConvertFrom-Json
        Write-Host "   发现现有功能清单，追加新功能..." -ForegroundColor Gray
    } catch {
        Write-Host "⚠️  现有 feature_list.json 格式错误，将覆盖" -ForegroundColor Yellow
    }
}

# 创建新功能条目
$newFeature = [PSCustomObject]@{
    id = $TaskId
    category = "functional"
    description = $TaskName
    steps = @(
        "理解需求并设计实现方案",
        "实现核心功能",
        "编写单元测试",
        "运行端到端测试",
        "更新文档"
    )
    passes = $false
    testCommand = "npm test -- $TaskId"
    createdAt = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    priority = 1
}

$features += $newFeature

# 保存功能清单
$features | ConvertTo-Json -Depth 10 | Out-File $featureListPath -Encoding UTF8
Write-Host "✅ 功能清单已创建：$featureListPath" -ForegroundColor Green
Write-Host ""

# ============================================
# 3. 创建 progress.txt
# ============================================
Write-Host "[2/4] 创建进度日志..." -ForegroundColor Yellow
$progressPath = Join-Path $WorkspaceRoot "progress.txt"

$progressContent = @"
# 项目进度日志

## $(Get-Date -Format "yyyy-MM-dd HH:mm") - 任务创建
- 任务 ID: $TaskId
- 任务名称：$TaskName
- 功能清单已创建
- 状态：待开发

---

"@

if (Test-Path $progressPath) {
    $progressContent | Out-File $progressPath -Encoding UTF8 -Append
} else {
    $progressContent | Out-File $progressPath -Encoding UTF8
}
Write-Host "✅ 进度日志已创建：$progressPath" -ForegroundColor Green
Write-Host ""

# ============================================
# 4. 初始化 Git（可选）
# ============================================
Write-Host "[3/4] 初始化 Git..." -ForegroundColor Yellow
if ($NoGit) {
    Write-Host "ℹ️  跳过 Git 初始化（--NoGit 参数）" -ForegroundColor Gray
} else {
    try {
        $gitDir = Join-Path $WorkspaceRoot ".git"
        if (!(Test-Path $gitDir)) {
            Write-Host "📂 初始化 Git 仓库..." -ForegroundColor Yellow
            git -C $WorkspaceRoot init
            git -C $WorkspaceRoot config user.name "Evolver"
            git -C $WorkspaceRoot config user.email "evolver@openclaw.local"
        }
        
        # 添加并提交初始文件
        git -C $WorkspaceRoot add feature_list.json progress.txt
        $commitMsg = "init: 创建任务 '$TaskName' ($TaskId)"
        git -C $WorkspaceRoot commit -m $commitMsg
        
        Write-Host "✅ Git 初始化完成" -ForegroundColor Green
        Write-Host "   提交：$commitMsg" -ForegroundColor Gray
    } catch {
        Write-Host "⚠️  Git 初始化失败：$($_.Exception.Message)" -ForegroundColor Yellow
    }
}
Write-Host ""

# ============================================
# 5. 创建任务模板文件（可选）
# ============================================
Write-Host "[4/4] 创建任务模板..." -ForegroundColor Yellow

# 创建任务详情文件
$taskDetailPath = Join-Path $WorkspaceRoot "tasks" "$TaskId.md"
if (!(Test-Path (Join-Path $WorkspaceRoot "tasks"))) {
    New-Item -ItemType Directory -Path (Join-Path $WorkspaceRoot "tasks") -Force | Out-Null
}

$taskDetailContent = @"
# $TaskName

> 任务 ID: $TaskId  
> 创建时间：$(Get-Date -Format "yyyy-MM-dd HH:mm:ss")  
> 状态：**待开发**

---

## 需求描述

$TaskName

---

## 实现计划

### 阶段 1: 设计
- [ ] 理解需求
- [ ] 技术方案设计
- [ ] 接口定义

### 阶段 2: 实现
- [ ] 核心功能开发
- [ ] 单元测试编写

### 阶段 3: 测试
- [ ] 单元测试通过
- [ ] 端到端测试通过
- [ ] 性能测试（如适用）

### 阶段 4: 文档
- [ ] 更新 README
- [ ] 编写使用示例
- [ ] 记录已知问题

---

## 开发日志

<!-- 每次 session 结束后在此记录 -->

### $(Get-Date -Format "yyyy-MM-dd")
- 任务创建

---

## 测试步骤

1. 运行 `npm test -- $TaskId`
2. 手动验证功能
3. 端到端测试

---

## 验收标准

- [ ] 功能按需求实现
- [ ] 所有测试通过
- [ ] 代码已提交
- [ ] 文档已更新

"@

$taskDetailContent | Out-File $taskDetailPath -Encoding UTF8
Write-Host "✅ 任务详情已创建：$taskDetailPath" -ForegroundColor Green
Write-Host ""

# ============================================
# 完成
# ============================================
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ 任务创建完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📁 创建的文件:" -ForegroundColor Cyan
Write-Host "   - feature_list.json (功能清单)" -ForegroundColor White
Write-Host "   - progress.txt (进度日志)" -ForegroundColor White
Write-Host "   - tasks/$TaskId.md (任务详情)" -ForegroundColor White
Write-Host ""
Write-Host "🚀 下一步:" -ForegroundColor Cyan
Write-Host "   1. 运行 .\init.ps1 初始化环境" -ForegroundColor White
Write-Host "   2. 阅读 tasks/$TaskId.md 了解需求" -ForegroundColor White
Write-Host "   3. 开始开发！" -ForegroundColor White
Write-Host ""
Write-Host "💡 提示：开发完成后运行" -ForegroundColor Yellow
Write-Host "   node scripts\complete-task.ps1 $TaskId" -ForegroundColor Gray
Write-Host ""
