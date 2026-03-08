# sync-todo.ps1 - Auto-sync task status to todo.md

$workspaceRoot = "C:\Users\12132\.openclaw\workspace"
$logFile = "$workspaceRoot\tasks\state-driven-log.md"
$todoFile = "$workspaceRoot\tasks\todo.md"

Write-Output "Syncing task status..."

if (-not (Test-Path $logFile)) {
    Write-Output "Log file not found"
    exit 1
}

$logContent = Get-Content $logFile -Raw -Encoding UTF8
$inProgressTasks = @()
$completedTasks = @()
$currentSection = ""

$lines = $logContent -split "`n"

foreach ($line in $lines) {
    if ($line -like '*Completed*' -or $line -like '*已完成*') {
        $currentSection = "completed"
    } elseif ($line -like '*Pending*' -or $line -like '*待执行*') {
        $currentSection = "pending"
    } elseif ($line -like '*Blocked*' -or $line -like '*阻塞*') {
        $currentSection = "blocked"
    }

    if ($line -like '- *') {
        $trimmedLine = $line.TrimStart('- ').TrimStart()
        
        if ($trimmedLine -like '*✅*' -and $currentSection -eq 'completed') {
            $task = $trimmedLine -replace '.*✅\s*', ''
            $completedTasks += $task
        }
        elseif (($trimmedLine -like '*⏳*' -or $trimmedLine -like '*🛑*') -and ($currentSection -eq 'pending' -or $currentSection -eq 'blocked')) {
            $task = $trimmedLine -replace '.*[⏳🛑]\s*', ''
            $inProgressTasks += $task
        }
    }
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"

$evolverStatus = "Unknown"
try {
    $proc = Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*evolver*" } | Select-Object -First 1
    if ($proc) {
        $evolverStatus = "Running (PID: $($proc.Id))"
    } else {
        $evolverStatus = "Not running"
    }
} catch {
    $evolverStatus = "Unknown"
}

# Build content line by line
$lines = @()
$lines += "# 待办事项"
$lines += ""
$lines += "> Last updated: $timestamp"
$lines += "> Auto-sync: Enabled (sync-todo.ps1)"
$lines += ""
$lines += "---"
$lines += ""
$lines += "## In Progress"
$lines += ""

if ($inProgressTasks.Count -gt 0) {
    foreach ($t in $inProgressTasks) { $lines += "- [ ] $t" }
} else {
    $lines += "_No tasks in progress_"
}

$lines += ""
$lines += "---"
$lines += ""
$lines += "## Completed"
$lines += ""

if ($completedTasks.Count -gt 0) {
    foreach ($t in $completedTasks) { $lines += "- [x] $t" }
} else {
    $lines += "_No completed tasks yet_"
}

$lines += ""
$lines += "---"
$lines += ""
$lines += "## Backlog"
$lines += ""
$lines += "_No planned tasks_"
$lines += ""
$lines += "---"
$lines += ""
$lines += "## System Status"
$lines += ""
$lines += "| System | Status |"
$lines += "|--------|--------|"
$lines += "| Evolver | $evolverStatus |"
$lines += "| Task Queue | Ready |"
$lines += "| Auto-Sync | Enabled |"
$lines += ""
$lines += "---"
$lines += ""
$lines += "## Commands"
$lines += ""
$lines += "```powershell"
$lines += "# Manual sync"
$lines += ".\tasks\sync-todo.ps1"
$lines += ""
$lines += "# View state log"
$lines += "Get-Content tasks\state-driven-log.md"
$lines += "```"
$lines += ""

$content = $lines -join "`r`n"
Set-Content -Path $todoFile -Value $content -Encoding UTF8

Write-Output "Sync complete!"
Write-Output "In progress: $($inProgressTasks.Count)"
Write-Output "Completed: $($completedTasks.Count)"
