# complete-task.ps1 - 长时任务完成脚本
# 用法：.\complete-task.ps1 <任务 ID>
# 参考：Anthropic 长时任务最佳实践 - 自测通过才能标记完成

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$TaskId
)

$ErrorActionPreference = "Stop"
$WorkspaceRoot = $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ 完成任务：$TaskId" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ============================================
# 1. 读取功能清单
# ============================================
Write-Host "[1/6] 读取功能清单..." -ForegroundColor Yellow
$featureListPath = Join-Path $WorkspaceRoot "feature_list.json"

if (!(Test-Path $featureListPath)) {
    Write-Host "❌ feature_list.json 不存在" -ForegroundColor Red
    exit 1
}

try {
    $features = Get-Content $featureListPath -Raw | ConvertFrom-Json
    $targetFeature = $features | Where-Object { $_.id -eq $TaskId }
    
    if (!$targetFeature) {
        Write-Host "❌ 未找到任务 ID: $TaskId" -ForegroundColor Red
        exit 1
    }
    
    if ($targetFeature.passes -eq $true) {
        Write-Host "⚠️  该任务已标记为完成" -ForegroundColor Yellow
        $continue = Read-Host "是否重新测试？(Y/N)"
        if ($continue -ne 'Y' -and $continue -ne 'y') {
            exit 0
        }
    }
    
    Write-Host "✅ 找到任务：$($targetFeature.description)" -ForegroundColor Green
} catch {
    Write-Host "❌ 读取功能清单失败：$($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

# ============================================
# 2. 运行测试
# ============================================
Write-Host "[2/6] 运行测试..." -ForegroundColor Yellow

if ($targetFeature.testCommand) {
    Write-Host "🧪 运行测试命令：$($targetFeature.testCommand)" -ForegroundColor Gray
    try {
        $testOutput = Invoke-Expression $targetFeature.testCommand 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ 测试通过" -ForegroundColor Green
        } else {
            Write-Host "❌ 测试失败" -ForegroundColor Red
            Write-Host "输出：" -ForegroundColor Gray
            $testOutput | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
            Write-Host ""
            Write-Host "⚠️  测试未通过，不能标记为完成" -ForegroundColor Yellow
            exit 1
        }
    } catch {
        Write-Host "❌ 测试执行出错：$($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "⚠️  无测试命令，跳过自动测试" -ForegroundColor Yellow
    $manualConfirm = Read-Host "是否确认功能已完成？(Y/N)"
    if ($manualConfirm -ne 'Y' -and $manualConfirm -ne 'y') {
        Write-Host "已取消" -ForegroundColor Yellow
        exit 0
    }
}
Write-Host ""

# ============================================
# 3. 运行端到端测试（可选）
# ============================================
Write-Host "[3/6] 端到端测试..." -ForegroundColor Yellow
$e2eScript = Join-Path $WorkspaceRoot "test.e2e.ps1"

if (Test-Path $e2eScript) {
    Write-Host "🧪 运行端到端测试..." -ForegroundColor Gray
    & $e2eScript -TaskId $TaskId
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ 端到端测试失败" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ 端到端测试通过" -ForegroundColor Green
} else {
    Write-Host "ℹ️  无端到端测试脚本（跳过）" -ForegroundColor Gray
}
Write-Host ""

# ============================================
# 4. 更新功能清单
# ============================================
Write-Host "[4/6] 更新功能清单..." -ForegroundColor Yellow

$targetFeature.passes = $true
$targetFeature.completedAt = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# 保存更新后的功能清单
$features | ConvertTo-Json -Depth 10 | Out-File $featureListPath -Encoding UTF8
Write-Host "✅ 功能清单已更新" -ForegroundColor Green
Write-Host ""

# ============================================
# 5. Git 提交
# ============================================
Write-Host "[5/6] Git 提交..." -ForegroundColor Yellow

try {
    $gitStatus = git -C $WorkspaceRoot status --porcelain 2>&1
    if ($gitStatus) {
        Write-Host "📝 有未提交的更改，准备提交..." -ForegroundColor Gray
        git -C $WorkspaceRoot add .
        
        $commitMsg = "feat($TaskId): 完成 - $($targetFeature.description)"
        git -C $WorkspaceRoot commit -m $commitMsg
        
        Write-Host "✅ Git 提交完成：$commitMsg" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  无更改需要提交" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️  Git 提交失败：$($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host ""

# ============================================
# 6. 更新进度日志
# ============================================
Write-Host "[6/6] 更新进度日志..." -ForegroundColor Yellow
$progressPath = Join-Path $WorkspaceRoot "progress.txt"

$progressEntry = @"

## $(Get-Date -Format "yyyy-MM-dd HH:mm:ss") - 任务完成 ✅

**任务 ID**: $TaskId  
**任务名称**: $($targetFeature.description)  
**状态**: 已完成

### 完成内容
- 功能实现完成
- 测试通过
- 代码已提交

---

"@

if (Test-Path $progressPath) {
    $progressEntry | Out-File $progressPath -Encoding UTF8 -Append
} else {
    $progressEntry | Out-File $progressPath -Encoding UTF8
}

Write-Host "✅ 进度日志已更新" -ForegroundColor Green
Write-Host ""

# ============================================
# 完成
# ============================================
Write-Host "========================================" -ForegroundColor Green
Write-Host "🎉 任务完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "任务 ID: $TaskId" -ForegroundColor White
Write-Host "任务名称：$($targetFeature.description)" -ForegroundColor White
Write-Host "完成时间：$(Get-Date -Format "yyyy-MM-dd HH:mm:ss")" -ForegroundColor White
Write-Host ""

# 检查是否还有未完成的功能
$pendingFeatures = $features | Where-Object { $_.passes -eq $false }
if ($pendingFeatures.Count -gt 0) {
    Write-Host "📋 还有 $($pendingFeatures.Count) 个待完成功能:" -ForegroundColor Cyan
    $pendingFeatures | Select-Object -First 3 | ForEach-Object {
        Write-Host "   - $($_.id): $($_.description)" -ForegroundColor Gray
    }
    if ($pendingFeatures.Count -gt 3) {
        Write-Host "   ... 还有 $($pendingFeatures.Count - 3) 个" -ForegroundColor Gray
    }
} else {
    Write-Host "🎉 所有功能已完成！" -ForegroundColor Green
}
Write-Host ""
