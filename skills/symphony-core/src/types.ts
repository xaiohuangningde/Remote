/**
 * Symphony 核心类型定义
 */

// ============================================================================
// Issue (任务)
// ============================================================================

export interface Issue {
  /** Stable tracker-internal ID */
  id: string
  
  /** Human-readable ticket key (e.g., "GH-123") */
  identifier: string
  
  /** Issue title */
  title: string
  
  /** Issue description/body */
  description: string | null
  
  /** Priority (lower = higher priority, 1-4) */
  priority: number | null
  
  /** Current state (e.g., "open", "closed") */
  state: string
  
  /** Branch name from tracker */
  branch_name: string | null
  
  /** Issue URL */
  url: string | null
  
  /** Labels (lowercase) */
  labels: string[]
  
  /** Blocking issues */
  blocked_by: BlockerRef[]
  
  /** Creation timestamp */
  created_at: string | null
  
  /** Last update timestamp */
  updated_at: string | null
}

export interface BlockerRef {
  id: string | null
  identifier: string | null
  state: string | null
}

// ============================================================================
// Workflow Definition (WORKFLOW.md)
// ============================================================================

export interface WorkflowDefinition {
  /** YAML front matter config */
  config: Record<string, unknown>
  
  /** Markdown prompt template */
  prompt_template: string
}

// ============================================================================
// Service Config (Typed View)
// ============================================================================

export interface SymphonyConfig {
  tracker: TrackerConfig
  polling: PollingConfig
  workspace: WorkspaceConfig
  hooks: HooksConfig
  agent: AgentConfig
  codex: CodexConfig
}

export interface TrackerConfig {
  kind: 'github' | 'linear'
  endpoint: string
  api_key: string
  project_slug: string
  active_states: string[]
  terminal_states: string[]
}

export interface PollingConfig {
  interval_ms: number
}

export interface WorkspaceConfig {
  root: string
}

export interface HooksConfig {
  after_create: string | null
  before_run: string | null
  after_run: string | null
  before_remove: string | null
  timeout_ms: number
}

export interface AgentConfig {
  max_concurrent_agents: number
  max_turns: number
  max_retry_backoff_ms: number
  max_concurrent_agents_by_state: Record<string, number>
}

export interface CodexConfig {
  command: string
  approval_policy: string
  turn_timeout_ms: number
  stall_timeout_ms: number
}

// ============================================================================
// Workspace
// ============================================================================

export interface Workspace {
  path: string
  workspace_key: string
  created_now: boolean
}

// ============================================================================
// Run Attempt
// ============================================================================

export interface RunAttempt {
  issue_id: string
  issue_identifier: string
  attempt: number | null
  workspace_path: string
  started_at: number
  status: RunAttemptStatus
  error?: string
}

export type RunAttemptStatus =
  | 'preparing_workspace'
  | 'building_prompt'
  | 'launching_agent'
  | 'initializing_session'
  | 'streaming_turn'
  | 'finishing'
  | 'succeeded'
  | 'failed'
  | 'timed_out'
  | 'stalled'
  | 'canceled_by_reconciliation'

// ============================================================================
// Live Session (Agent Session Metadata)
// ============================================================================

export interface LiveSession {
  session_id: string
  thread_id: string
  turn_id: string
  codex_app_server_pid: string | null
  last_codex_event: string | null
  last_codex_timestamp: number | null
  last_codex_message: string | null
  codex_input_tokens: number
  codex_output_tokens: number
  codex_total_tokens: number
  turn_count: number
}

// ============================================================================
// Retry Entry
// ============================================================================

export interface RetryEntry {
  issue_id: string
  identifier: string
  attempt: number
  due_at_ms: number
  timer_handle?: unknown
  error: string | null
}

// ============================================================================
// Running Entry
// ============================================================================

export interface RunningEntry {
  issue_id: string
  issue_identifier: string
  workspace_path: string
  session_key: string
  started_at: number
  status: 'running' | 'paused' | 'stalled'
  last_event_at: number | null
  turn_count: number
  error?: string
}

// ============================================================================
// Orchestrator Runtime State
// ============================================================================

export interface OrchestratorState {
  poll_interval_ms: number
  max_concurrent_agents: number
  running: Map<string, RunningEntry>
  claimed: Set<string>
  retry_attempts: Map<string, RetryEntry>
  completed: Set<string>
  codex_totals: TokenTotals
}

export interface TokenTotals {
  input_tokens: number
  output_tokens: number
  total_tokens: number
  seconds_running: number
}

// ============================================================================
// Runtime Snapshot (for observability)
// ============================================================================

export interface RuntimeSnapshot {
  generated_at: string
  counts: {
    running: number
    retrying: number
  }
  running: Array<{
    issue_id: string
    issue_identifier: string
    state: string
    session_key: string
    turn_count: number
    started_at: string
    last_event_at: string | null
    tokens: {
      input_tokens: number
      output_tokens: number
      total_tokens: number
    }
  }>
  retrying: Array<{
    issue_id: string
    identifier: string
    attempt: number
    due_at: string
    error: string | null
  }>
  codex_totals: TokenTotals
}

// ============================================================================
// Validation
// ============================================================================

export interface ValidationResult {
  ok: true
} | {
  ok: false
  error: string
}

// ============================================================================
// Events
// ============================================================================

export type SymphonyEvent =
  | { type: 'session_started'; session_key: string; timestamp: number }
  | { type: 'turn_completed'; session_key: string; timestamp: number }
  | { type: 'turn_failed'; session_key: string; error: string; timestamp: number }
  | { type: 'notification'; session_key: string; message: string; timestamp: number }
  | { type: 'dispatch'; issue_id: string; timestamp: number }
  | { type: 'retry'; issue_id: string; attempt: number; timestamp: number }
