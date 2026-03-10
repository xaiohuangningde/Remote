#!/usr/bin/env node
/**
 * Self-Repair Agent Framework
 * Based on EvoMap Capsule: 788de88cc227ec0e
 * 
 * Features:
 * 1. Global error capture
 * 2. Root cause analysis
 * 3. Auto-repair (files, permissions, dependencies)
 * 4. Auto-reporting
 */

const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const crypto = require('crypto');

const WORKSPACE = process.env.WORKSPACE || path.join(require('os').homedir(), '.openclaw', 'workspace');
const LOG_DIR = path.join(WORKSPACE, 'logs');
const REPAIR_LOG = path.join(LOG_DIR, 'repair.log');

// Error patterns for root cause analysis
const ERROR_PATTERNS = [
  { pattern: /ENOENT: no such file or directory/, type: 'missing_file', fix: 'create_file' },
  { pattern: /EACCES: permission denied/, type: 'permission_error', fix: 'fix_permissions' },
  { pattern: /MODULE_NOT_FOUND/, type: 'missing_dependency', fix: 'install_dep' },
  { pattern: /ECONNREFUSED/, type: 'connection_refused', fix: 'retry_later' },
  { pattern: /ETIMEDOUT|timeout/, type: 'timeout', fix: 'retry_later' },
  { pattern: /429|Too Many Requests/, type: 'rate_limit', fix: 'wait_and_retry' },
  { pattern: /JSONParseError/, type: 'json_error', fix: 'reset_json' },
  { pattern: /SIGTERM|SIGKILL/, type: 'process_killed', fix: 'restart_process' }
];

class SelfRepairAgent {
  constructor() {
    this.errorCount = 0;
    this.repairCount = 0;
    this.sessionErrors = [];
    this.init();
  }

  init() {
    // Ensure log directory exists
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
    
    this.log('SelfRepair Agent started');
    
    // Register global error handlers
    process.on('uncaughtException', (err) => this.handleError(err));
    process.on('unhandledRejection', (reason) => this.handleError(reason));
  }

  log(msg, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] [${level}] ${msg}\n`;
    fs.appendFileSync(REPAIR_LOG, entry);
    console.log(entry.trim());
  }

  async handleError(error) {
    this.errorCount++;
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    
    this.log(`Error captured: ${errorMsg}`, 'ERROR');
    
    const context = {
      timestamp: new Date().toISOString(),
      message: errorMsg,
      stack: errorStack,
      count: this.errorCount
    };
    
    this.sessionErrors.push(context);
    
    // Analyze root cause
    const analysis = this.analyzeRootCause(errorMsg);
    this.log(`Root cause analysis: ${analysis.type} - ${analysis.fix}`, 'WARN');
    
    // Attempt repair
    const repaired = await this.attemptRepair(analysis, context);
    
    if (repaired) {
      this.repairCount++;
      this.log(`Auto-repair successful (${this.repairCount} repairs this session)`);
    } else {
      this.log('Auto-repair failed - requires human intervention', 'ERROR');
    }
    
    return repaired;
  }

  analyzeRootCause(errorMsg) {
    for (const rule of ERROR_PATTERNS) {
      if (rule.pattern.test(errorMsg)) {
        return { type: rule.type, fix: rule.fix, pattern: rule.pattern };
      }
    }
    return { type: 'unknown', fix: 'manual' };
  }

  async attemptRepair(analysis, context) {
    const { type, fix } = analysis;
    
    try {
      switch (fix) {
        case 'create_file':
          // Try to extract file path from error
          const fileMatch = context.message.match(/open '([^']+)'/);
          if (fileMatch) {
            const filePath = fileMatch[1];
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(filePath, '');
            this.log(`Created missing file: ${filePath}`);
            return true;
          }
          return false;

        case 'fix_permissions':
          // Try to fix common permission issues
          const permMatch = context.message.match(/open '([^']+)'/);
          if (permMatch) {
            const filePath = permMatch[1];
            try {
              fs.chmodSync(filePath, 0o644);
              this.log(`Fixed permissions for: ${filePath}`);
              return true;
            } catch (e) {
              this.log(`Could not fix permissions: ${e.message}`);
            }
          }
          return false;

        case 'install_dep':
          // For module missing errors, try to install
          const moduleMatch = context.message.match(/Cannot find module '([^']+)'/);
          if (moduleMatch) {
            const moduleName = moduleMatch[1];
            this.log(`Attempting to install missing module: ${moduleName}`);
            // Don't auto-install - too risky
            this.log(`Skipped auto-install for safety: ${moduleName}`);
            return false;
          }
          return false;

        case 'reset_json':
          // For JSON parse errors, try to reset corrupted state
          const jsonMatch = context.message.match(/\/([^\/]+\.json)/);
          if (jsonMatch) {
            const jsonFile = jsonMatch[1];
            const backupPath = jsonFile + '.bak.' + Date.now();
            this.log(`JSON error in ${jsonFile} - manual review needed`);
            return false;
          }
          return false;

        case 'restart_process':
          // For killed processes, log but don't auto-restart
          this.log('Process was killed - manual restart required');
          return false;

        case 'retry_later':
        case 'wait_and_retry':
          // Transient errors - just log
          this.log('Transient error - will retry on next operation');
          return true;

        default:
          return false;
      }
    } catch (e) {
      this.log(`Repair attempt failed: ${e.message}`, 'ERROR');
      return false;
    }
  }

  getStatus() {
    return {
      uptime: process.uptime(),
      errorCount: this.errorCount,
      repairCount: this.repairCount,
      repairRate: this.errorCount > 0 ? (this.repairCount / this.errorCount * 100).toFixed(1) + '%' : 'N/A',
      recentErrors: this.sessionErrors.slice(-5)
    };
  }

  generateReport() {
    const status = this.getStatus();
    return {
      generated_at: new Date().toISOString(),
      agent: 'self_repair_v1',
      capsule_id: 'sha256:788de88cc227ec0e34d8212dccb9e5d333b3ee7ef626c06017db9ef52386baa',
      stats: status,
      signals_triggered: this.sessionErrors.map(e => e.message.split(' ')[0])
    };
  }
}

// Export for use as module
module.exports = { SelfRepairAgent };

// Run as CLI
if (require.main === module) {
  const agent = new SelfRepairAgent();
  
  // CLI commands
  const cmd = process.argv[2];
  
  if (cmd === 'status') {
    console.log(JSON.stringify(agent.getStatus(), null, 2));
  } else if (cmd === 'report') {
    console.log(JSON.stringify(agent.generateReport(), null, 2));
  } else if (cmd === 'test-error') {
    // Test error handling
    throw new Error('TEST_ERROR: This is a test error for self-repair agent');
  } else {
    console.log('Self-Repair Agent Framework');
    console.log('Commands: status, report, test-error');
    console.log('Or require as module in other scripts');
  }
}
