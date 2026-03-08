#!/usr/bin/env node
/**
 * Auto-Memory Wrapper
 * 
 * Simple wrapper for easy integration with session flow.
 * Call this from your main agent code.
 */

const { exec } = require('child_process');
const path = require('path');

const WORKSPACE = process.env.OPENCLAW_WORKSPACE || 'C:\\Users\\12132\\.openclaw\\workspace';
const SCRIPTS_DIR = path.join(WORKSPACE, 'scripts');

/**
 * Execute auto-memory command
 */
function runCommand(command, data) {
  return new Promise((resolve, reject) => {
    const jsonStr = JSON.stringify(data);
    const cmd = `node "${path.join(SCRIPTS_DIR, command)}" ${jsonStr}`;
    
    exec(cmd, { cwd: WORKSPACE }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error running ${command}:`, error);
        reject(error);
        return;
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }
      console.log(stdout);
      resolve(stdout);
    });
  });
}

/**
 * Start a task
 */
async function startTask(title, id, details = '') {
  return runCommand('auto-todo-sync.js', {
    _: 'start',
    title,
    id,
    details
  });
}

/**
 * Complete a task
 */
async function completeTask(id, summary = '') {
  return runCommand('auto-todo-sync.js', {
    _: 'complete',
    id,
    summary
  });
}

/**
 * Block a task
 */
async function blockTask(id, reason, attempts = 2) {
  return runCommand('auto-todo-sync.js', {
    _: 'block',
    id,
    reason,
    attempts
  });
}

/**
 * Unblock a task
 */
async function unblockTask(id) {
  return runCommand('auto-todo-sync.js', {
    _: 'unblock',
    id
  });
}

/**
 * Write a lesson learned
 */
async function writeLesson(pattern, solution, category = 'General') {
  return runCommand('auto-memory.js', {
    _: 'lesson',
    pattern,
    solution,
    category
  });
}

/**
 * Write session summary
 */
async function writeSessionSummary(summary, keyDecisions = [], openThreads = []) {
  return runCommand('auto-memory.js', {
    _: 'session-summary',
    summary,
    keyDecisions,
    openThreads
  });
}

/**
 * Consolidate weekly memory (Sundays)
 */
async function consolidateWeekly() {
  return runCommand('auto-memory.js', {
    _: 'consolidate'
  });
}

// Export for use as module
module.exports = {
  startTask,
  completeTask,
  blockTask,
  unblockTask,
  writeLesson,
  writeSessionSummary,
  consolidateWeekly
};

// CLI interface - for testing only, use direct scripts in production
const command = process.argv[2];
if (command === 'test') {
  // Quick test
  writeSessionSummary('Test summary', ['Test decision'], ['Test thread'])
    .then(() => console.log('✅ Test passed'))
    .catch(err => console.error('❌ Test failed:', err));
} else if (command === 'help') {
  console.log('Usage:');
  console.log('  node auto-memory-wrapper.js test - Run quick test');
  console.log('  node auto-memory-wrapper.js help - Show this help');
  console.log('');
  console.log('For production use, import as module:');
  console.log('  const auto = require("./auto-memory-wrapper");');
  console.log('  await auto.startTask("Task", "id-123");');
} else {
  console.log('Auto-memory wrapper loaded.');
  console.log('Use as module: const auto = require("./auto-memory-wrapper")');
  console.log('Or use direct scripts: node scripts/auto-memory.js lesson \'{"pattern":"..."}\'');
}
