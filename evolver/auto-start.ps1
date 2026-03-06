# Evolver Auto-Start Script
# Check if Evolver is running, start if not

$evolverDir = "C:\Users\12132\.openclaw\evolver"
$logFile = "C:\Users\12132\logs\evolver.out.log"

# Fix: Ensure we're running from the correct directory
Set-Location $evolverDir

Write-Host "=== Evolver Auto-Start Check ===" -ForegroundColor Cyan

# Ensure log directory exists
$null = New-Item -ItemType Directory -Force -Path "C:\Users\12132\logs"

# Check if Evolver process is already running
function Test-EvolverRunning {
    $nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
    foreach ($proc in $nodeProcesses) {
        try {
            $cmdLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($proc.Id)").CommandLine
            if ($cmdLine -like "*index.js*" -and $cmdLine -like "*--loop*") {
                return $proc.Id
            }
        } catch {
            continue
        }
    }
    # Fallback: check if lifecycle reports it's running
    $lifecycleStatus = & node "$evolverDir\src\ops\lifecycle.js" status 2>$null
    if ($lifecycleStatus -match '"running"\s*:\s*true') {
        return "lifecycle_managed"
    }
    return $null
}

$evolverPid = Test-EvolverRunning

if ($evolverPid) {
    Write-Host "[OK] Evolver already running (PID: $evolverPid)" -ForegroundColor Green
    exit 0
}

Write-Host "Evolver not running, starting..." -ForegroundColor Yellow

# Set environment variables
$env:EVOLVE_STRATEGY = "innovate"
$env:EVOLVE_REPORT_TOOL = "message"

# Start Evolver
Start-Process node `
  -ArgumentList "index.js", "--loop" `
  -WorkingDirectory $evolverDir `
  -WindowStyle Hidden `
  -RedirectStandardOutput $logFile `
  -RedirectStandardError "C:\Users\12132\logs\evolver.err.log"

Start-Sleep -Seconds 2

# Verify startup
Start-Sleep -Seconds 3
$evolverPid = Test-EvolverRunning

if ($evolverPid) {
    Write-Host "[OK] Evolver started (PID: $evolverPid)" -ForegroundColor Green
    Write-Host "Strategy: innovate" -ForegroundColor Cyan
} else {
    Write-Host "[FAIL] Evolver start failed, check logs" -ForegroundColor Red
    Write-Host "Log: $logFile" -ForegroundColor Gray
    exit 1
}
