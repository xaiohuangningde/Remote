# auto-shutdown.ps1 - Automatic shutdown script
# Usage:
#   .\auto-shutdown.ps1 -Minutes 30
#   .\auto-shutdown.ps1 -Time "23:30"
#   .\auto-shutdown.ps1 -Cancel
#   .\auto-shutdown.ps1 -Status

param(
    [int]$Minutes,
    [string]$Time,
    [switch]$Cancel,
    [switch]$Status
)

$ErrorActionPreference = "Stop"
$StateFile = "$PSScriptRoot\auto-shutdown-state.json"

function Save-State {
    param([object]$State)
    $State | ConvertTo-Json | Out-File $StateFile -Encoding UTF8
}

function Get-State {
    if (Test-Path $StateFile) {
        return Get-Content $StateFile -Raw | ConvertFrom-Json
    }
    return $null
}

function Format-Countdown {
    param([int]$Seconds)
    $hours = [math]::Floor($Seconds / 3600)
    $minutes = [math]::Floor(($Seconds % 3600) / 60)
    $secs = $Seconds % 60
    return "{0:D2}:{1:D2}:{2:D2}" -f $hours, $minutes, $secs
}

if ($Cancel) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Cancel Shutdown Plan" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    shutdown /a 2>$null
    
    if (Test-Path $StateFile) {
        Remove-Item $StateFile -Force
    }
    
    Write-Host "Shutdown plan cancelled" -ForegroundColor Green
    exit 0
}

if ($Status) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Shutdown Plan Status" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    $state = Get-State
    
    if (!$state) {
        Write-Host "No shutdown plan scheduled" -ForegroundColor Yellow
        exit 0
    }
    
    $shutdownTime = [DateTime]::Parse($state.scheduledTime)
    $now = Get-Date
    $remaining = $shutdownTime - $now
    
    if ($remaining.TotalSeconds -le 0) {
        Write-Host "Shutdown time passed, state file not cleaned" -ForegroundColor Yellow
        exit 0
    }
    
    Write-Host "Scheduled Time: $($state.scheduledTime)" -ForegroundColor White
    Write-Host "Created At: $($state.createdAt)" -ForegroundColor Gray
    Write-Host "Remaining: $(Format-Countdown $remaining.TotalSeconds)" -ForegroundColor Cyan
    Write-Host "Reason: $($state.reason)" -ForegroundColor Gray
    
    exit 0
}

if ($Minutes) {
    if ($Minutes -lt 1) {
        Write-Host "Minutes must be greater than 0" -ForegroundColor Red
        exit 1
    }
    
    $shutdownTime = (Get-Date).AddMinutes($Minutes)
    $seconds = $Minutes * 60
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Set Auto Shutdown" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Shutdown Time: $($shutdownTime.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor White
    Write-Host "Remaining: $(Format-Countdown $seconds)" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "Registering Windows shutdown task..." -ForegroundColor Yellow
    shutdown /s /t $seconds
    
    $state = [PSCustomObject]@{
        scheduledTime = $shutdownTime.ToString("yyyy-MM-dd HH:mm:ss")
        createdAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        seconds = $seconds
        reason = "User set: $Minutes minutes"
        type = "minutes"
        value = $Minutes
    }
    Save-State $state
    
    Write-Host "Shutdown plan set successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "Tip: Run .\auto-shutdown.ps1 -Cancel to cancel" -ForegroundColor Yellow
    Write-Host ""
    
    exit 0
}

if ($Time) {
    try {
        $shutdownTime = [DateTime]::Parse($Time)
        $now = Get-Date
        if ($shutdownTime -lt $now) {
            $shutdownTime = $shutdownTime.AddDays(1)
        }
        
        $remaining = $shutdownTime - $now
        $seconds = [int]$remaining.TotalSeconds
        
        if ($seconds -lt 60) {
            Write-Host "Shutdown time must be at least 1 minute later" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "Set Auto Shutdown" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Shutdown Time: $($shutdownTime.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor White
        Write-Host "Remaining: $(Format-Countdown $seconds)" -ForegroundColor Cyan
        Write-Host ""
        
        Write-Host "Registering Windows shutdown task..." -ForegroundColor Yellow
        shutdown /s /t $seconds
        
        $state = [PSCustomObject]@{
            scheduledTime = $shutdownTime.ToString("yyyy-MM-dd HH:mm:ss")
            createdAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
            seconds = $seconds
            reason = "User set: $Time shutdown"
            type = "time"
            value = $Time
        }
        Save-State $state
        
        Write-Host "Shutdown plan set successfully" -ForegroundColor Green
        Write-Host ""
        Write-Host "Tip: Run .\auto-shutdown.ps1 -Cancel to cancel" -ForegroundColor Yellow
        Write-Host ""
        
        exit 0
        
    } catch {
        Write-Host "Time format error, use HH:MM format (e.g., 23:30)" -ForegroundColor Red
        exit 1
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Auto Shutdown Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Usage:" -ForegroundColor White
Write-Host ""
Write-Host "  .\auto-shutdown.ps1 -Minutes 30     Shutdown in 30 minutes" -ForegroundColor Gray
Write-Host "  .\auto-shutdown.ps1 -Time '23:30'   Shutdown at specified time" -ForegroundColor Gray
Write-Host "  .\auto-shutdown.ps1 -Cancel         Cancel shutdown plan" -ForegroundColor Gray
Write-Host "  .\auto-shutdown.ps1 -Status         Check shutdown status" -ForegroundColor Gray
Write-Host ""
Write-Host "Examples:" -ForegroundColor White
Write-Host ""
Write-Host "  .\auto-shutdown.ps1 -Minutes 60     # Shutdown in 1 hour" -ForegroundColor Gray
Write-Host "  .\auto-shutdown.ps1 -Time '00:00'   # Shutdown at midnight" -ForegroundColor Gray
Write-Host "  .\auto-shutdown.ps1 -Cancel         # Cancel shutdown" -ForegroundColor Gray
Write-Host ""
