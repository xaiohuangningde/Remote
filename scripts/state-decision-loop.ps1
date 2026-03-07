# State-Driven Decision Loop
# Read all state files -> Calculate priority -> Output next actions

$ErrorActionPreference = "Stop"
$WorkspaceRoot = "C:\Users\12132\.openclaw\workspace"
$TasksDir = Join-Path $WorkspaceRoot "tasks"
$MemoryDir = Join-Path $WorkspaceRoot "memory"

# Scan state files
function Get-AllStateFiles {
    $states = @()
    
    # Scan tasks/*-STATE.json (project states)
    Get-ChildItem -Path $TasksDir -Filter "*-STATE.json" -ErrorAction SilentlyContinue | ForEach-Object {
        $content = Get-Content $_.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
        $states += [PSCustomObject]@{
            Source = $_.FullName
            Type = "project"
            State = $content
        }
    }
    
    # Scan memory/*-STATE.json (other states)
    Get-ChildItem -Path $MemoryDir -Filter "*-STATE.json" -ErrorAction SilentlyContinue | ForEach-Object {
        $content = Get-Content $_.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
        $states += [PSCustomObject]@{
            Source = $_.FullName
            Type = "memory"
            State = $content
        }
    }
    
    return $states
}

# Calculate priority score
function Calculate-Priority {
    param($state)
    
    $score = 0
    
    # Base score by status
    if ($state.status -eq "blocked") { $score += 100 }
    elseif ($state.status -eq "running") { $score += 50 }
    elseif ($state.status -eq "pending") { $score += 20 }
    
    # Blocked duration increases priority
    if ($state.blocker -and $state.blocker.since) {
        try {
            $blockedSince = [DateTime]::Parse($state.blocker.since)
            $hoursBlocked = (Get-Date) - $blockedSince
            $score += [Math]::Min($hoursBlocked.TotalHours * 2, 50)
        } catch {}
    }
    
    # Running tasks not updated for >4h need check
    if ($state.status -eq "running" -and $state.updatedAt) {
        try {
            $lastUpdated = [DateTime]::Parse($state.updatedAt)
            $hoursSince = (Get-Date) - $lastUpdated
            if ($hoursSince.TotalHours -gt 4) {
                $score += 30
            }
        } catch {}
    }
    
    return $score
}

# Generate action recommendations
function Generate-Actions {
    param($states)
    
    $actions = @()
    
    foreach ($item in $states) {
        $state = $item.State
        
        # Blocked tasks
        if ($state.status -eq "blocked" -and $state.blocker) {
            $actions += [PSCustomObject]@{
                Type = "alert"
                Priority = "high"
                Project = $state.project
                Message = "BLOCKED: $($state.project) - $($state.blocker.issue)"
                Suggestion = "Need help: $($state.nextAction)"
            }
        }
        
        # Running but stale (>4h no update)
        if ($state.status -eq "running" -and $state.updatedAt) {
            try {
                $lastUpdated = [DateTime]::Parse($state.updatedAt)
                $hoursSince = (Get-Date) - $lastUpdated
                if ($hoursSince.TotalHours -gt 4) {
                    $actions += [PSCustomObject]@{
                        Type = "check"
                        Priority = "medium"
                        Project = $state.project
                        Message = "STALE: $($state.project) no update for $($hoursSince.TotalHours.ToString("0"))h"
                        Suggestion = "Continue? Next: $($state.nextAction)"
                    }
                }
            } catch {}
        }
        
        # Pending tasks (suggest starting)
        if ($state.status -eq "pending" -and $state.nextAction) {
            $actions += [PSCustomObject]@{
                Type = "suggest"
                Priority = "low"
                Project = $state.project
                Message = "PENDING: $($state.project)"
                Suggestion = "Can start: $($state.nextAction)"
            }
        }
    }
    
    # Sort by priority (high first)
    $priorityOrder = @{ "high" = 3; "medium" = 2; "low" = 1 }
    return $actions | Sort-Object -Property @{Expression={ $priorityOrder[$_.Priority] }} -Descending
}

# Main loop
function Invoke-DecisionLoop {
    Write-Host "=== State-Driven Decision Loop ===" -ForegroundColor Cyan
    
    $states = Get-AllStateFiles
    Write-Host "Found $($states.Count) state files"
    
    $actions = Generate-Actions -states $states
    
    if ($actions.Count -eq 0) {
        Write-Host "No actions needed. All systems nominal." -ForegroundColor Green
        return @{ Status = "ok"; Actions = @() }
    }
    
    Write-Host "Generated $($actions.Count) actions:" -ForegroundColor Yellow
    foreach ($action in $actions) {
        Write-Host "  [$($action.Priority)] $($action.Type): $($action.Message)"
        Write-Host "    -> $($action.Suggestion)" -ForegroundColor Gray
    }
    
    return @{ Status = "actions"; Actions = $actions }
}

# Execute
$result = Invoke-DecisionLoop

# Output JSON for other tools
$result | ConvertTo-Json -Depth 10
