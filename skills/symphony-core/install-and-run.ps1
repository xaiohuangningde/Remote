# Symphony 系统安装和运行脚本

Write-Host "🔧 Symphony 系统安装和运行" -ForegroundColor Cyan
Write-Host ""

# 1. 安装 ts-node（如果未安装）
Write-Host "📦 检查 ts-node 安装..." -ForegroundColor Yellow
$tsNodeInstalled = node -e "try { require.resolve('ts-node'); process.exit(0); } catch(e) { process.exit(1); }" 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "安装 ts-node..."
    npm install -g ts-node
}

# 2. 设置 GITHUB_TOKEN（需要用户输入）
Write-Host ""
Write-Host "🔑 设置 GitHub Token" -ForegroundColor Yellow
Write-Host "请选择 Token 选项:" -ForegroundColor Cyan
Write-Host "1. 从环境变量读取 (GITHUB_TOKEN)"
Write-Host "2. 手动输入 Token"
Write-Host "3. 跳过（仅演示核心功能）"
Write-Host ""

$choice = Read-Host "请选择 (1-3)"

switch ($choice) {
    "1" {
        if (-not $env:GITHUB_TOKEN) {
            Write-Host "❌ GITHUB_TOKEN 环境变量未设置" -ForegroundColor Red
            exit 1
        }
    }
    "2" {
        $token = Read-Host -asSecureString "请输入 GitHub Token"
        $tokenString = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($token))
        $env:GITHUB_TOKEN = $tokenString
        Write-Host "✅ Token 已设置" -ForegroundColor Green
    }
    "3" {
        Write-Host "跳过 GitHub Token 设置" -ForegroundColor Yellow
    }
    default {
        Write-Host "无效选择" -ForegroundColor Red
        exit 1
    }
}

# 3. 运行演示
Write-Host ""
Write-Host "🚀 运行 Symphony 演示..." -ForegroundColor Cyan
cd "C:\Users\12132\.openclaw\workspace\skills\symphony-core"
ts-node demo.ts

# 4. 运行测试
Write-Host ""
Write-Host "🧪 运行测试..." -ForegroundColor Cyan
ts-node test/core.test.ts

Write-Host ""
Write-Host "🎉 安装和运行完成！" -ForegroundColor Green
