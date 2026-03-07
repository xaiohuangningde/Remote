# smart-shutdown.ps1 - 智能自动关机
# 功能:
# - 检查是否有运行中的任务
# - 检查 CPU/内存使用率
# - 检查特定进程是否在运行
# - 安全时自动关机

param(
    [int]$IdleMinutes = 30,           # 空闲多少分钟后关机
    [int]$CheckInterval = 5,          # 检查间隔（分钟）
    [string[]]$WatchProcesses = @(),  # 监控的进程名（这些进程运行时不关机）
    [int]$MaxCpuPercent = 50,         # CPU 使用率超过此值不关机
    [int]$MaxMemPercent = 80,         # 内存使用率超过此值不关机
    [switch]$DryRun                   # 试运行，不实际关机
)

$ErrorActionPreference = "Continue"
$StateFile = "$PSScriptRoot\smart-shutdown-state.json"
$LogFile = "$PSScriptRoot\smart-shutdown.log"

# ============================================
# 日志函数
# ============================================

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    
    # 输出到控制台
    $color = switch ($Level) {
        "INFO" { "White" }
        "WARN" { "Yellow" }
        "ERROR" { "Red" }
        "SUCCESS" { "Green" }
        default { "White" }
    }
    Write-Host $logEntry -ForegroundColor $color
    
    # 输出到文件
    $logEntry | Out-File $LogFile -Append -Encoding UTF8
}

# ============================================
# 状态管理
# ============================================

function Save-State {
    param([object]$State)
    try {
        $State | ConvertTo-Json | Out-File $StateFile -Encoding UTF8
    } catch {}
}

function Get-State {
    if (Test-Path $StateFile) {
        try {
            return Get-Content $StateFile -Raw | ConvertFrom-Json
        } catch {}
    }
    return $null
}

# ============================================
# 检查函数
# ============================================

function Test-WatchProcesses {
    if ($WatchProcesses.Count -eq 0) {
        return $false
    }
    
    foreach ($procName in $WatchProcesses) {
        $procs = Get-Process -Name $procName -ErrorAction SilentlyContinue
        if ($procs) {
            return $true
        }
    }
    return $false
}

function Test-SystemLoad {
    # 获取 CPU 使用率（过去 1 分钟平均）
    $cpuLoad = Get-WmiObject Win32_Processor | Measure-Object -Property LoadPercentage -Average | Select-Object -ExpandProperty Average
    
    # 获取内存使用率
    $os = Get-WmiObject Win32_OperatingSystem
    $memTotal = $os.TotalVisibleMemorySize
    $memFree = $os.FreePhysicalMemory
    $memUsed = $memTotal - $memFree
    $memPercent = [math]::Round(($memUsed / $memTotal) * 100, 2)
    
    return @{
        CpuPercent = [math]::Round($cpuLoad, 2)
        MemPercent = $memPercent
        CpuHigh = ($cpuLoad -gt $MaxCpuPercent)
        MemHigh = ($memPercent -gt $MaxMemPercent)
    }
}

function Test-UserActive {
    # 检查用户是否活跃（鼠标/键盘活动）
    # 通过检查最后输入时间
    try {
        $lastInput = Get-LastInputInfo
        $idleTime = (Get-Date) - $lastInput
        return $idleTime.TotalMinutes -lt $IdleMinutes
    } catch {
        # 如果无法检测，假设用户活跃
        return $true
    }
}

# Win32 API 调用获取最后输入时间
$signature = @"
[DllImport("user32.dll", SetLastError=true)]
public static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);

[StructLayout(LayoutKind.Sequential)]
public struct LASTINPUTINFO {
    public uint cbSize;
    public uint dwTime;
}
"@

function Get-LastInputInfo {
    try {
        $type = Add-Type -MemberDefinition $signature -Name "User32" -Namespace "Win32" -PassThru -ErrorAction Stop
        $lii = New-Object Win32.User32+LASTINPUTINFO
        $lii.cbSize = [System.Runtime.InteropServices.Marshal]::SizeOf($lii)
        $null = [Win32.User32]::GetLastInputInfo([ref]$lii)
        $lastInputTick = $lii.dwTime
        $elapsed = [Environment]::TickCount - $lastInputTick
        return (Get-Date).AddMilliseconds(-$elapsed)
    } catch {
        return Get-Date
    }
}

# ============================================
# 主循环
# ============================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🌙 智能自动关机监控" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "配置:" -ForegroundColor White
Write-Host "  空闲时间：$IdleMinutes 分钟" -ForegroundColor Gray
Write-Host "  检查间隔：$CheckInterval 分钟" -ForegroundColor Gray
Write-Host "  监控进程：$(if ($WatchProcesses.Count -gt 0) { $WatchProcesses -join ", " } else { "无" })" -ForegroundColor Gray
Write-Host "  CPU 阈值：$MaxCpuPercent%" -ForegroundColor Gray
Write-Host "  内存阈值：$MaxMemPercent%" -ForegroundColor Gray
Write-Host ""
Write-Host "按 Ctrl+C 停止监控" -ForegroundColor Yellow
Write-Host ""

$startTime = Get-Date
Save-State @{
    StartedAt = $startTime.ToString("yyyy-MM-dd HH:mm:ss")
    IdleMinutes = $IdleMinutes
    CheckInterval = $CheckInterval
    Status = "running"
}

while ($true) {
    $checkTime = Get-Date
    Write-Log "=== 检查点：$($checkTime.ToString("HH:mm:ss")) ==="
    
    # 1. 检查监控的进程
    $watchingProcs = Test-WatchProcesses
    if ($watchingProcs) {
        Write-Log "有监控进程在运行，跳过关机" -Level "WARN"
        Start-Sleep -Minutes $CheckInterval
        continue
    }
    
    # 2. 检查系统负载
    $load = Test-SystemLoad
    Write-Log "CPU: $($load.CpuPercent)% | 内存：$($load.MemPercent)%"
    
    if ($load.CpuHigh -or $load.MemHigh) {
        Write-Log "系统负载高，跳过关机" -Level "WARN"
        Start-Sleep -Minutes $CheckInterval
        continue
    }
    
    # 3. 检查用户活动
    $userActive = Test-UserActive
    if ($userActive) {
        Write-Log "用户活跃，跳过关机" -Level "WARN"
        Start-Sleep -Minutes $CheckInterval
        continue
    }
    
    # 4. 所有条件满足，执行关机
    Write-Log "所有条件满足，准备关机" -Level "SUCCESS"
    
    if ($DryRun) {
        Write-Log "[DRY RUN] 不会实际关机" -Level "WARN"
    } else {
        Write-Log "执行关机..." -Level "INFO"
        
        # 发送通知（如果有）
        try {
            # 这里可以集成 Telegram/飞书通知
            Write-Log "发送关机通知..." -Level "INFO"
        } catch {}
        
        # 执行关机
        shutdown /s /t 60 /c "智能关机：系统空闲超过 $IdleMinutes 分钟"
        
        Write-Log "关机命令已发送，60 秒后执行" -Level "SUCCESS"
    }
    
    # 更新状态
    Save-State @{
        StartedAt = $startTime.ToString("yyyy-MM-dd HH:mm:ss")
        LastCheck = $checkTime.ToString("yyyy-MM-dd HH:mm:ss")
        ShutdownInitiated = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        Status = "shutdown_pending"
    }
    
    break
}
