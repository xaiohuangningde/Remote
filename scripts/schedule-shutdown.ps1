# schedule-shutdown.ps1 - 定时关机任务管理
# 功能：创建、查看、删除 Windows 定时关机任务

param(
    [string]$Name,                    # 任务名称
    [string]$Time,                    # 执行时间（HH:MM 格式）
    [int]$Minutes,                    # 多少分钟后
    [switch]$List,                    # 列出所有任务
    [switch]$Remove,                  # 删除任务
    [switch]$Enable,                  # 启用任务
    [switch]$Disable                  # 禁用任务
)

$ErrorActionPreference = "Stop"

# ============================================
# 列出任务
# ============================================

if ($List) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "📋 定时关机任务列表" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    $tasks = Get-ScheduledTask -TaskPath "\OpenClaw\" -ErrorAction SilentlyContinue
    
    if (!$tasks) {
        Write-Host "ℹ️  没有定时关机任务" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "创建任务示例:" -ForegroundColor White
        Write-Host "  .\schedule-shutdown.ps1 -Name `"DailyShutdown`" -Time `"23:30`"" -ForegroundColor Gray
        Write-Host "  .\schedule-shutdown.ps1 -Name `"WeekendShutdown`" -Minutes 120" -ForegroundColor Gray
        exit 0
    }
    
    foreach ($task in $tasks) {
        $state = $task.State
        $color = switch ($state) {
            "Ready" { "Green" }
            "Running" { "Cyan" }
            "Disabled" { "Gray" }
            default { "White" }
        }
        
        Write-Host "任务名：$($task.TaskName)" -ForegroundColor White
        Write-Host "  状态：$state" -ForegroundColor $color
        Write-Host "  路径：$($task.TaskPath)" -ForegroundColor Gray
        
        $trigger = $task.Triggers[0]
        if ($trigger) {
            Write-Host "  触发器：$($trigger.CimClass.CimClassName)" -ForegroundColor Gray
            if ($trigger.StartBoundary) {
                Write-Host "  时间：$($trigger.StartBoundary)" -ForegroundColor Gray
            }
        }
        
        Write-Host ""
    }
    
    exit 0
}

# ============================================
# 删除任务
# ============================================

if ($Remove) {
    if (!$Name) {
        Write-Host "❌ 请指定任务名称：-Name <任务名>" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "🗑️  删除定时关机任务" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    try {
        Unregister-ScheduledTask -TaskName $Name -TaskPath "\OpenClaw\" -Confirm:$false
        Write-Host "✅ 任务 '$Name' 已删除" -ForegroundColor Green
    } catch {
        Write-Host "❌ 删除失败：$($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
    
    exit 0
}

# ============================================
# 启用/禁用任务
# ============================================

if ($Enable -or $Disable) {
    if (!$Name) {
        Write-Host "❌ 请指定任务名称：-Name <任务名>" -ForegroundColor Red
        exit 1
    }
    
    $action = if ($Enable) { "启用" } else { "禁用" }
    $color = if ($Enable) { "Green" } else { "Yellow" }
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "$action 定时关机任务" -ForegroundColor $color
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    try {
        $task = Get-ScheduledTask -TaskName $Name -TaskPath "\OpenClaw\" -ErrorAction Stop
        if ($Enable) {
            Enable-ScheduledTask -InputObject $task
            Write-Host "✅ 任务 '$Name' 已启用" -ForegroundColor Green
        } else {
            Disable-ScheduledTask -InputObject $task
            Write-Host "✅ 任务 '$Name' 已禁用" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ 操作失败：$($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
    
    exit 0
}

# ============================================
# 创建任务 - 按时间
# ============================================

if ($Time) {
    if (!$Name) {
        $Name = "AutoShutdown_$(Get-Random -Maximum 9999)"
    }
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "⏰ 创建定时关机任务" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "任务名：$Name" -ForegroundColor White
    Write-Host "执行时间：$Time" -ForegroundColor Cyan
    Write-Host ""
    
    # 确保任务路径存在
    $taskPath = "\OpenClaw\"
    try {
        $existingPaths = Get-ScheduledTaskInfo | Select-Object -ExpandProperty TaskPath -Unique
        if ($existingPaths -notcontains $taskPath) {
            # 路径不存在时直接创建任务，Windows 会自动创建路径
        }
    } catch {}
    
    # 创建关机动作
    $action = New-ScheduledTaskAction -Execute "shutdown.exe" -Argument "/s /f /t 60"
    
    # 创建每日触发器
    $trigger = New-ScheduledTaskTrigger -Daily -At $Time
    
    # 创建设置
    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -RestartCount 0 `
        -ExecutionTimeLimit (New-TimeSpan -Hours 1)
    
    # 创建任务
    try {
        Register-ScheduledTask `
            -TaskName $Name `
            -TaskPath $taskPath `
            -Action $action `
            -Trigger $trigger `
            -Settings $settings `
            -Description "OpenClaw 自动关机任务 - 每天 $Time 执行" `
            -ErrorAction Stop
        
        Write-Host "✅ 任务创建成功" -ForegroundColor Green
        Write-Host ""
        Write-Host "管理命令:" -ForegroundColor Yellow
        Write-Host "  查看：.\schedule-shutdown.ps1 -List" -ForegroundColor Gray
        Write-Host "  禁用：.\schedule-shutdown.ps1 -Name `"$Name`" -Disable" -ForegroundColor Gray
        Write-Host "  删除：.\schedule-shutdown.ps1 -Name `"$Name`" -Remove" -ForegroundColor Gray
        Write-Host ""
    } catch {
        Write-Host "❌ 创建失败：$($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "提示：可能需要管理员权限运行" -ForegroundColor Yellow
        exit 1
    }
    
    exit 0
}

# ============================================
# 创建任务 - 按分钟（一次性）
# ============================================

if ($Minutes) {
    if (!$Name) {
        $Name = "OneTimeShutdown_$(Get-Random -Maximum 9999)"
    }
    
    $executeTime = (Get-Date).AddMinutes($Minutes)
    $timeString = $executeTime.ToString("HH:mm")
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "⏰ 创建一次性关机任务" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "任务名：$Name" -ForegroundColor White
    Write-Host "执行时间：$($executeTime.ToString("yyyy-MM-dd HH:mm:ss"))" -ForegroundColor Cyan
    Write-Host "剩余时间：$Minutes 分钟" -ForegroundColor Cyan
    Write-Host ""
    
    # 创建关机动作
    $action = New-ScheduledTaskAction -Execute "shutdown.exe" -Argument "/s /f /t 60"
    
    # 创建一次性触发器
    $trigger = New-ScheduledTaskTrigger -Once -At $executeTime
    
    # 创建设置
    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -ExecutionTimeLimit (New-TimeSpan -Hours 1)
    
    # 创建任务
    try {
        Register-ScheduledTask `
            -TaskName $Name `
            -TaskPath "\OpenClaw\" `
            -Action $action `
            -Trigger $trigger `
            -Settings $settings `
            -Description "OpenClaw 一次性关机任务 - $Minutes 分钟后执行" `
            -ErrorAction Stop
        
        Write-Host "✅ 任务创建成功" -ForegroundColor Green
        Write-Host ""
        Write-Host "管理命令:" -ForegroundColor Yellow
        Write-Host "  查看：.\schedule-shutdown.ps1 -List" -ForegroundColor Gray
        Write-Host "  删除：.\schedule-shutdown.ps1 -Name `"$Name`" -Remove" -ForegroundColor Gray
        Write-Host ""
    } catch {
        Write-Host "❌ 创建失败：$($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "提示：可能需要管理员权限运行" -ForegroundColor Yellow
        exit 1
    }
    
    exit 0
}

# ============================================
# 显示帮助
# ============================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "⏰ 定时关机任务管理" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "用法:" -ForegroundColor White
Write-Host ""
Write-Host "创建任务:" -ForegroundColor Yellow
Write-Host "  .\schedule-shutdown.ps1 -Name `"Daily`" -Time `"23:30`"     每天 23:30 关机" -ForegroundColor Gray
Write-Host "  .\schedule-shutdown.ps1 -Name `"Nap`" -Minutes 30          30 分钟后关机（一次性）" -ForegroundColor Gray
Write-Host ""
Write-Host "管理任务:" -ForegroundColor Yellow
Write-Host "  .\schedule-shutdown.ps1 -List                              列出所有任务" -ForegroundColor Gray
Write-Host "  .\schedule-shutdown.ps1 -Name `"Daily`" -Remove            删除任务" -ForegroundColor Gray
Write-Host "  .\schedule-shutdown.ps1 -Name `"Daily`" -Disable           禁用任务" -ForegroundColor Gray
Write-Host "  .\schedule-shutdown.ps1 -Name `"Daily`" -Enable            启用任务" -ForegroundColor Gray
Write-Host ""
Write-Host "示例:" -ForegroundColor White
Write-Host ""
Write-Host "  .\schedule-shutdown.ps1 -Time `"00:00`"                    每天午夜关机" -ForegroundColor Gray
Write-Host "  .\schedule-shutdown.ps1 -Minutes 60                        1 小时后关机" -ForegroundColor Gray
Write-Host "  .\schedule-shutdown.ps1 -List                              查看所有任务" -ForegroundColor Gray
Write-Host ""
