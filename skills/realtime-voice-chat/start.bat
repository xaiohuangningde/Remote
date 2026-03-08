@echo off
chcp 65001 >nul
echo.
echo ============================================================
echo   Real-time Voice Chat - Launcher
echo ============================================================
echo.

REM 检查 Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found!
    echo Please install Python 3.10+ and add to PATH.
    pause
    exit /b 1
)

echo [INFO] Starting voice chat...
echo.

REM 启动
python "%~dp0realtime_voice_chat.py"

echo.
echo [INFO] Voice chat stopped.
pause
