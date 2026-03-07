# init.ps1 - 长时任务环境初始化脚本
# 用法：.\init.ps1 [任务ID]
# 参考：Anthropic 长时任务最佳实践

param(
    [string]$TaskId = $null
)

$ErrorActionPreference = "Stop"
$WorkspaceRoot = $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 长时任务环境初始化" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ============================================
# 1. 检查工作目录
# ============================================
Write-Host "[1/6] 检查工作目录..." -ForegroundColor Yellow
$featureListPath = Join-Path $WorkspaceRoot "feature_list.json"
$progressPath = Join-Path $WorkspaceRoot "progress.txt"

if (!(Test-Path $featureListPath)) {
    Write-Host "❌ feature_list.json 不存在" -ForegroundColor Red
    Write-Host "   请先运行：node scripts\create-task.ps1 <任务名称>" -ForegroundColor Gray
    exit 1
}

Write-Host "✅ 工作目录验证通过" -ForegroundColor Green
Write-Host ""

# ============================================
# 2. 读取功能清单
# ============================================
Write-Host "[2/6] 读取功能清单..." -ForegroundColor Yellow
try {
    $features = Get-Content $featureListPath -Raw | ConvertFrom-Json
    $pendingFeatures = $features | Where-Object { $_.passes -eq $false }
    $completedFeatures = $features | Where-Object { $_.passes -eq $true }
    
    Write-Host "   总功能数：$($features.Count)" -ForegroundColor Gray
    Write-Host "   已完成：$($completedFeatures.Count)" -ForegroundColor Green
    Write-Host "   待完成：$($pendingFeatures.Count)" -ForegroundColor Yellow
    
    if ($TaskId) {
        $targetFeature = $features | Where-Object { $_.id -eq $TaskId }
        if ($targetFeature) {
            Write-Host "   目标任务：$($targetFeature.id) - $($targetFeature.description)" -ForegroundColor Cyan
        } else {
            Write-Host "⚠️  未找到任务 ID: $TaskId" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "❌ 读取 feature_list.json 失败：$($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

# ============================================
# 3. 读取进度日志
# ============================================
Write-Host "[3/6] 读取进度日志..." -ForegroundColor Yellow
if (Test-Path $progressPath) {
    $progress = Get-Content $progressPath -Tail 10
    Write-Host "   最近进度:" -ForegroundColor Gray
    $progress | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
} else {
    Write-Host "⚠️  progress.txt 不存在（首次运行）" -ForegroundColor Yellow
}
Write-Host ""

# ============================================
# 4. 检查 Git 状态
# ============================================
Write-Host "[4/6] 检查 Git 状态..." -ForegroundColor Yellow
try {
    $gitStatus = git -C $WorkspaceRoot status --porcelain 2>&1
    if ($gitStatus) {
        Write-Host "⚠️  有未提交的更改:" -ForegroundColor Yellow
        $gitStatus | Select-Object -First 5 | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
    } else {
        Write-Host "✅ Git 工作区干净" -ForegroundColor Green
    }
    
    $lastCommit = git -C $WorkspaceRoot log --oneline -1 2>&1
    Write-Host "   最近提交：$lastCommit" -ForegroundColor Gray
} catch {
    Write-Host "⚠️  Git 未初始化或出错" -ForegroundColor Yellow
}
Write-Host ""

# ============================================
# 5. 安装依赖
# ============================================
Write-Host "[5/6] 检查依赖..." -ForegroundColor Yellow
$packageJson = Join-Path $WorkspaceRoot "package.json"
if (Test-Path $packageJson) {
    if (Test-Path (Join-Path $WorkspaceRoot "node_modules")) {
        Write-Host "✅ 依赖已安装" -ForegroundColor Green
    } else {
        Write-Host "📦 安装依赖..." -ForegroundColor Yellow
        npm install --silent
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ 依赖安装完成" -ForegroundColor Green
        } else {
            Write-Host "❌ 依赖安装失败" -ForegroundColor Red
            exit 1
        }
    }
} else {
    Write-Host "⚠️  package.json 不存在（跳过依赖检查）" -ForegroundColor Yellow
}
Write-Host ""

# ============================================
# 6. 启动开发服务器（可选）
# ============================================
Write-Host "[6/6] 检查开发服务器配置..." -ForegroundColor Yellow
$initScript = Join-Path $WorkspaceRoot "init.server.ps1"
if (Test-Path $initScript) {
    Write-Host "🔧 发现服务器启动脚本，是否执行？(Y/N)" -ForegroundColor Cyan
    $response = Read-Host
    if ($response -eq 'Y' -or $response -eq 'y') {
        Write-Host "🚀 启动开发服务器..." -ForegroundColor Yellow
        & $initScript
    }
} else {
    Write-Host "ℹ️  无服务器启动脚本（跳过）" -ForegroundColor Gray
}
Write-Host ""

# ============================================
# 7. 运行端到端测试（可选）
# ============================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🧪 端到端测试" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$e2eScript = Join-Path $WorkspaceRoot "test.e2e.ps1"
if (Test-Path $e2eScript) {
    Write-Host "🔍 运行端到端测试..." -ForegroundColor Yellow
    & $e2eScript
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 端到端测试通过" -ForegroundColor Green
    } else {
        Write-Host "❌ 端到端测试失败" -ForegroundColor Red
        Write-Host "⚠️  建议先修复基础功能再继续开发" -ForegroundColor Yellow
        $continue = Read-Host "是否继续？(Y/N)"
        if ($continue -ne 'Y' -and $continue -ne 'y') {
            exit 1
        }
    }
} else {
    Write-Host "ℹ️  无端到端测试脚本（跳过）" -ForegroundColor Gray
}
Write-Host ""

# ============================================
# 完成
# ============================================
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ 环境初始化完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

if ($pendingFeatures.Count -gt 0) {
    $nextFeature = $pendingFeatures[0]
    Write-Host "📋 下一个待开发功能:" -ForegroundColor Cyan
    Write-Host "   ID: $($nextFeature.id)" -ForegroundColor White
    Write-Host "   描述：$($nextFeature.description)" -ForegroundColor White
    if ($nextFeature.steps) {
        Write-Host "   测试步骤:" -ForegroundColor White
        $nextFeature.steps | ForEach-Object { Write-Host "     - $_" -ForegroundColor Gray }
    }
    Write-Host ""
    Write-Host "💡 提示：开始开发后，记得在 session 结束时:" -ForegroundColor Yellow
    Write-Host "   1. 自测通过" -ForegroundColor Gray
    Write-Host "   2. git commit" -ForegroundColor Gray
    Write-Host "   3. 更新 feature_list.json (passes: true)" -ForegroundColor Gray
    Write-Host "   4. 更新 progress.txt" -ForegroundColor Gray
} else {
    Write-Host "🎉 所有功能已完成！" -ForegroundColor Green
}
Write-Host ""
