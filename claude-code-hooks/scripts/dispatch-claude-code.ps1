# dispatch-claude-code.ps1 — Dispatch a task to Claude Code with auto-callback
#
# Usage:
#   .\dispatch-claude-code.ps1 -Prompt "your prompt here"
#
# Options:
#   -Prompt TEXT        Task prompt (required)
#   -Name NAME          Task name (for tracking)
#   -Group ID           Telegram group ID for result delivery
#   -Session KEY        Callback session key (AGI session to notify)
#   -Workdir DIR        Working directory for Claude Code
#   -AgentTeams         Enable Agent Teams (lead + sub-agents)
#   -TeammateMode MODE  Agent Teams display mode (auto/in-process/tmux)
#   -PermissionMode MODE Claude Code permission mode
#   -AllowedTools TOOLS Allowed tools string
#   -Model MODEL        Model override
#   -ClaudeBin PATH     Path to claude binary
#
# The script:
#   1. Writes task metadata to task-meta.json (hook reads this)
#   2. Runs Claude Code
#   3. When Claude Code finishes, Stop hook fires automatically
#   4. Hook reads meta, writes results, wakes OpenClaw
#   5. OpenClaw reads results and relays to Telegram group

param(
    [Parameter(Mandatory=$true)]
    [string]$Prompt,
    
    [string]$Name,
    
    [string]$Group = "",
    
    [string]$Session = "",
    
    [string]$Workdir = "",
    
    [switch]$AgentTeams,
    
    [string]$TeammateMode = "",
    
    [string]$PermissionMode = "",
    
    [string]$AllowedTools = "",
    
    [string]$Model = "",
    
    [string]$ClaudeBin = "claude"
)

$ErrorActionPreference = "Stop"

# Defaults
$ResultDir = "$env:USERPROFILE\clawd\data\claude-code-results"
$MetaFile = Join-Path $ResultDir "task-meta.json"
$OutputFile = Join-Path $env:TEMP "claude-code-output.txt"
$TaskOutput = Join-Path $ResultDir "task-output.txt"

if (-not $Name) {
    $Name = "adhoc-$(Get-Date -Format 'yyyyMMddHHmmss')"
}

if (-not $Workdir) {
    $Workdir = $env:USERPROFILE
}

# Ensure result directory exists
if (-not (Test-Path $ResultDir)) {
    New-Item -ItemType Directory -Path $ResultDir -Force | Out-Null
}

# ---- 1. Write task metadata ----
$Timestamp = Get-Date -Format "o"
$MetaJson = @{
    task_name = $Name
    telegram_group = $Group
    callback_session = $Session
    prompt = $Prompt
    workdir = $Workdir
    started_at = $Timestamp
    agent_teams = $AgentTeams.IsPresent
    status = "running"
} | ConvertTo-Json -Depth 3

$MetaJson | Out-File -FilePath $MetaFile -Force -Encoding UTF8

Write-Host "📋 Task metadata written: $MetaFile"
Write-Host "   Task: $Name"
Write-Host "   Group: $(
if ($Group) { $Group } else { 'none' }
)"
Write-Host "   Agent Teams: $(
if ($AgentTeams.IsPresent) { 'yes' } else { 'no' }
)"

# ---- 2. Clear previous output ----
"" | Out-File -FilePath $OutputFile -Force -Encoding UTF8
"" | Out-File -FilePath $TaskOutput -Force -Encoding UTF8

# ---- 3. Build command ----
$CmdArgs = @($ClaudeBin)

if ($PermissionMode) {
    $CmdArgs += @("--permission-mode", $PermissionMode)
}

# Prompt (headless mode)
$CmdArgs += @("-p", $Prompt)

if ($AllowedTools) {
    $CmdArgs += @("--allowedTools", $AllowedTools)
}

if ($AgentTeams.IsPresent) {
    $env:CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "1"
}

if ($TeammateMode) {
    $CmdArgs += @("--teammate-mode", $TeammateMode)
}

if ($Model) {
    $env:ANTHROPIC_MODEL = $Model
}

# Gateway settings (if needed)
if (-not $env:OPENCLAW_GATEWAY_TOKEN) {
    # Try to load from environment or skip
}

# ---- 4. Run Claude Code with Tee ----
Write-Host "🚀 Launching Claude Code..."
Write-Host "   Command: $($CmdArgs -join ' ')"
Write-Host ""

# Run and capture output
try {
    # Use PowerShell Tee-Object equivalent
    $process = Start-Process -FilePath $CmdArgs[0] -ArgumentList $CmdArgs[1..($CmdArgs.Length-1)] -WorkingDirectory $Workdir -NoNewWindow -Wait -PassThru -RedirectStandardOutput $TaskOutput -RedirectStandardError $OutputFile
    
    $exitCode = $process.ExitCode
}
catch {
    Write-Host "❌ Error running Claude Code: $_" -ForegroundColor Red
    $exitCode = 1
}

Write-Host ""
Write-Host "✅ Claude Code exited with code: $exitCode"
Write-Host "   Hook should have fired automatically."
Write-Host "   Results: $ResultDir\latest.json"

# ---- 5. Update meta with completion ----
if (Test-Path $MetaFile) {
    try {
        $Meta = Get-Content $MetaFile -Raw -Encoding UTF8 | ConvertFrom-Json
        $Meta | Add-Member -NotePropertyName "exit_code" -NotePropertyValue $exitCode -Force
        $Meta | Add-Member -NotePropertyName "completed_at" -NotePropertyValue (Get-Date -Format "o") -Force
        $Meta.status = "done"
        $Meta | ConvertTo-Json -Depth 3 | Out-File -FilePath $MetaFile -Force -Encoding UTF8
    }
    catch {
        Write-Log "Meta update failed: $_"
    }
}

exit $exitCode
