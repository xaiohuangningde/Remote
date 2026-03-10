@echo off
REM Voice System 启动脚本

echo ========================================
echo   Voice System - 快速启动
echo ========================================
echo.

REM 检查 Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Node.js，请先安装 Node.js
    exit /b 1
)

echo [信息] Node.js 版本:
node --version
echo.

REM 安装依赖
echo [步骤 1/3] 安装依赖...
npm install
if errorlevel 1 (
    echo [错误] 依赖安装失败
    exit /b 1
)
echo.

REM 运行快速测试
echo [步骤 2/3] 运行快速测试...
npx tsx test-quick.ts
if errorlevel 1 (
    echo [错误] 测试失败
    exit /b 1
)
echo.

REM 启动示例
echo [步骤 3/3] 启动语音系统示例...
echo.
echo 提示：按 Ctrl+C 停止
echo.
npx tsx examples/usage-examples.ts
