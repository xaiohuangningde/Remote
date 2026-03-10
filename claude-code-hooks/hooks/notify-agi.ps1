# Claude Code Stop Hook: Notify OpenClaw on Task Complete
# Trigger: Stop (task generation) + SessionEnd (session close)
# Supports Agent Teams: fires after lead completes

param(
    [string]$LogFile = "$env:USERPROFILE\clawd\data\claude-code-results\hook.log",
    [string]$ResultDir = "$env:USERPROFILE\clawd\data\claude-code-results",
    [string]$MetaFile,
    [string]$OpenclawBin = "openclaw"
)

# Allow meta file override (for testing)
if (-not $MetaFile) {
    $MetaFile = Join-Path $ResultDir "task-meta.json"
}

$ErrorActionPreference = "Continue"

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "o"
    "$timestamp $Message" | Out-File -FilePath $LogFile -Append -Encoding UTF8
}

# Ensure result directory exists
if (-not (Test-Path $ResultDir)) {
    New-Item -ItemType Directory -Path $ResultDir -Force | Out-Null
}

Write-Log "=== Hook fired ==="

# ---- Read stdin ----
$InputContent = ""
if ($Host.UI.RawUI.KeyAvailable) {
    Write-Log "stdin is tty, skip"
}
else {
    try {
        $InputContent = [Console]::In.ReadToEnd()
    }
    catch {
        Write-Log "stdin read failed: $_"
    }
}

# Parse stdin JSON
$SessionId = "unknown"
$Cwd = ""
$Event = "unknown"

if ($InputContent -match '\S') {
    try {
        $InputObj = $InputContent | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($InputObj) {
            $SessionId = if ($InputObj.session_id) { $InputObj.session_id } else { "unknown" }
            $Cwd = if ($InputObj.cwd) { $InputObj.cwd } else { "" }
            $Event = if ($InputObj.hook_event_name) { $InputObj.hook_event_name } else { "unknown" }
        }
    }
    catch {
        Write-Log "stdin parse failed: $_"
    }
}

Write-Log "session=$SessionId cwd=$Cwd event=$Event"

# ---- Dedupe: Only process first event (Stop), skip SessionEnd ----
$LockFile = Join-Path $ResultDir ".hook-lock"
$LockAgeLimit = 30  # seconds

if (Test-Path $LockFile) {
    $LockTime = (Get-Item $LockFile).LastWriteTime
    $Age = ((Get-Date) - $LockTime).TotalSeconds
    if ($Age -lt $LockAgeLimit) {
        Write-Log "Duplicate hook within ${Age}s, skipping"
        exit 0
    }
}
# Create/update lock file
"" | Out-File -FilePath $LockFile -Force -Encoding UTF8

# ---- Read Claude Code output ----
$Output = ""

# Wait for tee pipe flush
Start-Sleep -Milliseconds 1000

# Source 1: task-output.txt (dispatch script tee writes)
$TaskOutput = Join-Path $ResultDir "task-output.txt"
if ((Test-Path $TaskOutput) -and ((Get-Item $TaskOutput).Length -gt 0)) {
    $Output = Get-Content $TaskOutput -Raw -Encoding UTF8
    if ($Output.Length -gt 4000) { $Output = $Output.Substring($Output.Length - 4000) }
    Write-Log "Output from task-output.txt ($($Output.Length) chars)"
}

# Source 2: $env:TEMP\claude-code-output.txt
if ([string]::IsNullOrEmpty($Output)) {
    $TempOutput = Join-Path $env:TEMP "claude-code-output.txt"
    if ((Test-Path $TempOutput) -and ((Get-Item $TempOutput).Length -gt 0)) {
        $Output = Get-Content $TempOutput -Raw -Encoding UTF8
        if ($Output.Length -gt 4000) { $Output = $Output.Substring($Output.Length - 4000) }
        Write-Log "Output from temp fallback ($($Output.Length) chars)"
    }
}

# Source 3: Working directory listing
if ([string]::IsNullOrEmpty($Output) -and $Cwd -and (Test-Path $Cwd)) {
    try {
        $Files = Get-ChildItem $Cwd -File | Sort-Object LastWriteTime -Descending | Select-Object -First 20 | ForEach-Object { $_.Name } -Join ", "
        $Output = "Working dir: ${Cwd}`nFiles: ${Files}"
        Write-Log "Output from dir listing"
    }
    catch {
        Write-Log "Dir listing failed: $_"
    }
}

# ---- Read task metadata ----
$TaskName = "unknown"
$TelegramGroup = ""

if (Test-Path $MetaFile) {
    try {
        $Meta = Get-Content $MetaFile -Raw -Encoding UTF8 | ConvertFrom-Json
        $TaskName = if ($Meta.task_name) { $Meta.task_name } else { "unknown" }
        $TelegramGroup = if ($Meta.telegram_group) { $Meta.telegram_group } else { "" }
        Write-Log "Meta: task=$TaskName group=$TelegramGroup"
    }
    catch {
        Write-Log "Meta read failed: $_"
    }
}

# ---- Write results JSON ----
$Timestamp = Get-Date -Format "o"
$ResultJson = @{
    session_id = $SessionId
    timestamp = $Timestamp
    cwd = $Cwd
    event = $Event
    output = if ($Output) { $Output } else { "" }
    task_name = $TaskName
    telegram_group = $TelegramGroup
    status = "done"
} | ConvertTo-Json -Depth 3 -Compress

$ResultJson | Out-File -FilePath (Join-Path $ResultDir "latest.json") -Force -Encoding UTF8
Write-Log "Wrote latest.json"

# ---- Method 1: Send message via OpenClaw (webchat) ----
# If TelegramGroup is set, send to that target; otherwise just log completion
if ((Get-Command $OpenclawBin -ErrorAction SilentlyContinue)) {
    $Summary = if ($Output) {
        if ($Output.Length -gt 1000) { $Output.Substring($Output.Length - 1000) } else { $Output }
    } else { "" }
    $Summary = $Summary -replace "`n", " "
    
    $Msg = @"
🤖 *Claude Code Task Complete*
📋 Task: ${TaskName}
📝 Result:
``````$($Summary.Substring(0, [Math]::Min(800, $Summary.Length)))``````
"@

    try {
        if ($TelegramGroup) {
            # Send to specific target (group or user)
            & $OpenclawBin message send --target "$TelegramGroup" --message $Msg 2>$null
        } else {
            # No target - result saved to JSON, log only
            Write-Log "No target group specified, result saved to JSON"
        }
        Write-Log "Message send attempted"
    }
    catch {
        Write-Log "Message send failed: $_"
    }
}

# ---- Method 2: Write wake file for AGI heartbeat ----
$WakeFile = Join-Path $ResultDir "pending-wake.json"
$Summary = if ($Output) {
    if ($Output.Length -gt 500) { $Output.Substring(0, 500) } else { $Output }
} else { "" }
$Summary = $Summary -replace "`n", " "

$WakeJson = @{
    task_name = $TaskName
    telegram_group = $TelegramGroup
    timestamp = $Timestamp
    summary = $Summary
    processed = $false
} | ConvertTo-Json -Depth 2 -Compress

$WakeJson | Out-File -FilePath $WakeFile -Force -Encoding UTF8
Write-Log "Wrote pending-wake.json"

Write-Log "=== Hook completed ==="
exit 0
