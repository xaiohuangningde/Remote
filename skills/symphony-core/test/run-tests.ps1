# Symphony Phase 2 集成测试运行脚本
# 使用 gh CLI 获取 GitHub token

Write-Host "🧪 Symphony Phase 2 集成测试" -ForegroundColor Cyan
Write-Host ""

# 1. 检查 gh 是否登录
Write-Host "📋 检查 GitHub 登录状态..." -ForegroundColor Yellow
$ghStatus = gh auth status 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 未登录 GitHub，请先运行：gh auth login" -ForegroundColor Red
    exit 1
}

Write-Host "✅ GitHub 已登录" -ForegroundColor Green

# 2. 获取 token
Write-Host "🔑 获取 GitHub Token..." -ForegroundColor Yellow
$token = gh auth token 2>&1

if ([string]::IsNullOrEmpty($token)) {
    Write-Host "❌ 无法获取 GitHub token" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Token 获取成功" -ForegroundColor Green

# 3. 设置环境变量
$env:GITHUB_TOKEN = $token

# 4. 运行测试
Write-Host ""
Write-Host "🚀 运行集成测试..." -ForegroundColor Cyan
Write-Host ""

cd "C:\Users\12132\.openclaw\workspace\skills\symphony-core"
node --experimental-strip-types test/integration.test.ts

$exitCode = $LASTEXITCODE

Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "🎉 所有测试通过！" -ForegroundColor Green
} else {
    Write-Host "⚠️ 部分测试失败" -ForegroundColor Yellow
}

exit $exitCode
