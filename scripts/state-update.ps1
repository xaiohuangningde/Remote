# State Update Utility
# Update state files when tasks complete or get blocked

param(
    [Parameter(Mandatory=$true)]
    [string]$StateFile,
    
    [Parameter(Mandatory=$true)]
    [ValidateSet("complete", "block", "update", "start")]
    [string]$Action,
    
    [string]$Message,
    [string]$NextAction
)

$ErrorActionPreference = "Stop"

# Read state file
$state = Get-Content $StateFile -Raw -Encoding UTF8 | ConvertFrom-Json
$now = Get-Date -Format "yyyy-MM-ddTHH:mm:ss+08:00"

switch ($Action) {
    "complete" {
        # Move current phase from inProgress to completed
        if ($state.currentPhase) {
            $state.phases.completed += $state.currentPhase
            $state.phases.inProgress = $state.phases.inProgress | Where-Object { $_ -ne $state.currentPhase }
        }
        
        # Start next pending task
        if ($state.phases.pending.Count -gt 0) {
            $next = $state.phases.pending[0]
            $state.phases.inProgress += "P$($next.id)-$($next.name)"
            $state.phases.pending = $state.phases.pending[1..($state.phases.pending.Count-1)]
            $state.currentPhase = "P$($next.id)-$($next.name)"
            $state.nextAction = $next.description
            $state.status = "running"
            Write-Host "Started next phase: $($state.currentPhase)" -ForegroundColor Green
        } else {
            $state.currentPhase = "All phases complete"
            $state.nextAction = $null
            $state.status = "done"
            Write-Host "All phases complete!" -ForegroundColor Green
        }
        
        # Add to deliverables if message provided
        if ($Message) {
            $state.deliverables += $Message
        }
        
        Write-Host "Phase completed: $($state.phases.completed[-1])" -ForegroundColor Green
    }
    
    "block" {
        $state.status = "blocked"
        $state.blocker = @{
            issue = $Message
            attempts = @()
            since = $now
        }
        Write-Host "Phase blocked: $Message" -ForegroundColor Red
    }
    
    "update" {
        # Just update timestamp and optionally nextAction
        if ($NextAction) {
            $state.nextAction = $NextAction
        }
        Write-Host "State updated" -ForegroundColor Cyan
    }
    
    "start" {
        $state.status = "running"
        $state.currentPhase = $Message
        if ($NextAction) {
            $state.nextAction = $NextAction
        }
        Write-Host "Phase started: $Message" -ForegroundColor Cyan
    }
}

# Update timestamp
$state.updatedAt = $now

# Write back
$state | ConvertTo-Json -Depth 10 | Set-Content $StateFile -Encoding UTF8

Write-Host "State file updated: $StateFile" -ForegroundColor Gray

# Output new state
return $state
