# claude-code-hooks (Windows Port)

PowerShell implementation of claude-code-hooks for Windows environments.

## Files

| File | Description |
|------|-------------|
| `hooks/notify-agi.ps1` | Stop Hook script |
| `scripts/dispatch-claude-code.ps1` | Task dispatcher |

## Requirements

- OpenClaw installed (`openclaw` in PATH)
- Claude Code CLI (`claude` in PATH)
- PowerShell 5.1+

## Usage

### Dispatch a Task

```powershell
.\scripts\dispatch-claude-code.ps1 -Prompt "Implement a Python scraper" -Name "my-scraper" -Group "-5189558203" -Workdir "C:\Projects\scraper"
```

### Parameters

| Parameter | Description |
|-----------|-------------|
| `-Prompt` | Task prompt (required) |
| `-Name` | Task name for tracking |
| `-Group` | Telegram group ID for result delivery |
| `-Session` | Callback session key |
| `-Workdir` | Working directory |
| `-AgentTeams` | Enable Agent Teams |
| `-TeammateMode` | Agent Teams mode (auto/in-process/tmux) |
| `-PermissionMode` | Claude Code permission mode |
| `-AllowedTools` | Allowed tools list |
| `-Model` | Model override |
| `-ClaudeBin` | Path to claude binary |

### Hook Configuration

Register the hook in Claude Code settings:

```json
{
  "hooks": {
    "Stop": [{"hooks": [{"type": "command", "command": "powershell -File C:\\Users\\12132\\.openclaw\\workspace\\claude-code-hooks\\hooks\\notify-agi.ps1", "timeout": 10}]}],
    "SessionEnd": [{"hooks": [{"type": "command", "command": "powershell -File C:\\Users\\12132\\.openclaw\\workspace\\claude-code-hooks\\hooks\\notify-agi.ps1", "timeout": 10}]}]
  }
}
```

## Original Project

See: https://github.com/win4r/claude-code-hooks
