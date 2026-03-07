# test.e2e.ps1 - 端到端测试脚本（Playwright MCP 整合）
# 用法：.\test.e2e.ps1 [任务 ID]
# 参考：Anthropic 长时任务最佳实践 - 每次会话前验证基础功能

param(
    [string]$TaskId = $null
)

$ErrorActionPreference = "Continue"
$WorkspaceRoot = $PSScriptRoot
$TestResults = @()
$PassedCount = 0
$FailedCount = 0

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🧪 端到端测试" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ============================================
# 1. 读取功能清单
# ============================================
Write-Host "[1/4] 读取功能清单..." -ForegroundColor Yellow
$featureListPath = Join-Path $WorkspaceRoot "feature_list.json"

if (!(Test-Path $featureListPath)) {
    Write-Host "❌ feature_list.json 不存在" -ForegroundColor Red
    exit 1
}

try {
    $features = Get-Content $featureListPath -Raw | ConvertFrom-Json
    
    if ($TaskId) {
        $features = $features | Where-Object { $_.id -eq $TaskId }
    } else {
        # 只测试未完成的功能
        $features = $features | Where-Object { $_.passes -eq $false }
    }
    
    Write-Host "   待测试功能数：$($features.Count)" -ForegroundColor Gray
} catch {
    Write-Host "❌ 读取功能清单失败：$($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

# ============================================
# 2. 检查 Playwright 是否可用
# ============================================
Write-Host "[2/4] 检查 Playwright 环境..." -ForegroundColor Yellow

$playwrightAvailable = $false
try {
    # 检查是否安装了 Playwright
    $playwrightCheck = npm list -g @playwright/test 2>&1
    if ($playwrightCheck -match "@playwright") {
        $playwrightAvailable = $true
        Write-Host "✅ Playwright 已安装" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Playwright 未全局安装" -ForegroundColor Yellow
}

# 检查本地安装
if (!$playwrightAvailable) {
    $localPlaywright = Join-Path $WorkspaceRoot "node_modules\@playwright\test"
    if (Test-Path $localPlaywright) {
        $playwrightAvailable = $true
        Write-Host "✅ Playwright 已本地安装" -ForegroundColor Green
    }
}

if (!$playwrightAvailable) {
    Write-Host "⚠️  Playwright 不可用，跳过浏览器测试" -ForegroundColor Yellow
    Write-Host "   安装：npm install -D @playwright/test" -ForegroundColor Gray
}
Write-Host ""

# ============================================
# 3. 运行功能测试
# ============================================
Write-Host "[3/4] 运行功能测试..." -ForegroundColor Yellow
Write-Host ""

foreach ($feature in $features) {
    Write-Host "📋 测试功能：$($feature.id)" -ForegroundColor Cyan
    Write-Host "   描述：$($feature.description)" -ForegroundColor Gray
    
    $featurePassed = $true
    $testSteps = @()
    
    # 如果有测试命令，运行它
    if ($feature.testCommand) {
        Write-Host "   运行测试命令：$($feature.testCommand)" -ForegroundColor Gray
        try {
            $testOutput = Invoke-Expression $feature.testCommand 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "   ✅ 测试命令通过" -ForegroundColor Green
                $testSteps += @{ Step = "测试命令"; Result = "Pass" }
            } else {
                Write-Host "   ❌ 测试命令失败" -ForegroundColor Red
                $featurePassed = $false
                $testSteps += @{ Step = "测试命令"; Result = "Fail" }
            }
        } catch {
            Write-Host "   ❌ 测试命令执行出错：$($_.Exception.Message)" -ForegroundColor Red
            $featurePassed = $false
            $testSteps += @{ Step = "测试命令"; Result = "Error" }
        }
    } else {
        Write-Host "   ℹ️  无测试命令（跳过）" -ForegroundColor Gray
    }
    
    # 如果有 Playwright 测试文件，运行它
    $pwTestFile = Join-Path $WorkspaceRoot "tests" "$($feature.id).spec.js"
    if ($playwrightAvailable -and (Test-Path $pwTestFile)) {
        Write-Host "   运行 Playwright 测试：$pwTestFile" -ForegroundColor Gray
        try {
            $pwOutput = npx playwright test $pwTestFile --reporter=list 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "   ✅ Playwright 测试通过" -ForegroundColor Green
                $testSteps += @{ Step = "Playwright E2E"; Result = "Pass" }
            } else {
                Write-Host "   ❌ Playwright 测试失败" -ForegroundColor Red
                $featurePassed = $false
                $testSteps += @{ Step = "Playwright E2E"; Result = "Fail" }
            }
        } catch {
            Write-Host "   ❌ Playwright 测试执行出错" -ForegroundColor Red
            $featurePassed = $false
            $testSteps += @{ Step = "Playwright E2E"; Result = "Error" }
        }
    }
    
    # 记录结果
    $TestResults += @{
        FeatureId = $feature.id
        Description = $feature.description
        Passed = $featurePassed
        Steps = $testSteps
    }
    
    if ($featurePassed) {
        $PassedCount++
        Write-Host "   🟢 功能测试通过" -ForegroundColor Green
    } else {
        $FailedCount++
        Write-Host "   🔴 功能测试失败" -ForegroundColor Red
    }
    
    Write-Host ""
}

# ============================================
# 4. 生成测试报告
# ============================================
Write-Host "[4/4] 生成测试报告..." -ForegroundColor Yellow
Write-Host ""

$reportPath = Join-Path $WorkspaceRoot "test-results"
if (!(Test-Path $reportPath)) {
    New-Item -ItemType Directory -Path $reportPath -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$reportFile = Join-Path $reportPath "e2e-report-$timestamp.md"

$reportContent = @"
# 端到端测试报告

**生成时间**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")  
**任务 ID**: $(if ($TaskId) { $TaskId } else { "全部未完成功能" })

---

## 汇总

| 指标 | 数值 |
|------|------|
| 测试功能数 | $($features.Count) |
| 通过数 | $PassedCount |
| 失败数 | $FailedCount |
| 通过率 | $([math]::Round($PassedCount / $features.Count * 100, 2))% |

---

## 详细结果

"@

foreach ($result in $TestResults) {
    $status = if ($result.Passed) { "🟢 通过" } else { "🔴 失败" }
    $reportContent += @"

### $($result.FeatureId) - $($result.Description)

**状态**: $status

**测试步骤**:
"@
    
    foreach ($step in $result.Steps) {
        $stepStatus = if ($step.Result -eq "Pass") { "✅" } else { "❌" }
        $reportContent += "`n- $stepStatus $($step.Step)"
    }
    
    $reportContent += "`n"
}

$reportContent | Out-File $reportFile -Encoding UTF8
Write-Host "✅ 测试报告已保存：$reportFile" -ForegroundColor Green
Write-Host ""

# ============================================
# 完成
# ============================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📊 测试结果汇总" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "测试功能数：$($features.Count)" -ForegroundColor White
Write-Host "通过：$PassedCount" -ForegroundColor Green
Write-Host "失败：$FailedCount" -ForegroundColor $(if ($FailedCount -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($FailedCount -gt 0) {
    Write-Host "⚠️  有测试失败，建议修复后再继续开发" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "✅ 所有测试通过！" -ForegroundColor Green
    exit 0
}
