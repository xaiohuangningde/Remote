#!/usr/bin/env node
/**
 * Auto Todo Sync
 * 
 * Automatically syncs todo.md state based on task lifecycle events.
 * Triggered when tasks start, complete, or get blocked.
 */

const fs = require('fs');
const path = require('path');

const WORKSPACE = process.env.OPENCLAW_WORKSPACE || 'C:\\Users\\12132\\.openclaw\\workspace';
const TODO_FILE = path.join(WORKSPACE, 'tasks', 'todo.md');

/**
 * Get current timestamp in ISO format with timezone
 */
function getTimestamp() {
  return new Date().toISOString().replace('Z', '+08:00');
}

/**
 * Read and parse todo.md
 */
function readTodo() {
  if (!fs.existsSync(TODO_FILE)) {
    return {
      header: '',
      inProgress: [],
      completed: [],
      backlog: [],
      footer: ''
    };
  }
  
  const content = fs.readFileSync(TODO_FILE, 'utf8');
  const lines = content.split('\n');
  
  const result = {
    header: '',
    inProgress: [],
    completed: [],
    backlog: [],
    footer: ''
  };
  
  let currentSection = 'header';
  let sectionContent = [];
  
  for (const line of lines) {
    if (line.startsWith('## In Progress')) {
      result.header = sectionContent.join('\n');
      currentSection = 'inProgress';
      sectionContent = [];
    } else if (line.startsWith('## Completed')) {
      result.inProgress = sectionContent;
      currentSection = 'completed';
      sectionContent = [];
    } else if (line.startsWith('## Backlog')) {
      result.completed = sectionContent;
      currentSection = 'backlog';
      sectionContent = [];
    } else if (line.startsWith('## System Status')) {
      result.backlog = sectionContent;
      currentSection = 'footer';
      sectionContent = [line];
    } else {
      sectionContent.push(line);
    }
  }
  
  result.footer = sectionContent.join('\n');
  return result;
}

/**
 * Write todo.md from parsed structure
 */
function writeTodo(todo) {
  const content = [
    todo.header,
    '',
    '## In Progress',
    '',
    todo.inProgress.length > 0 ? todo.inProgress.join('\n') : '_No tasks in progress_',
    '',
    '## Completed',
    '',
    todo.completed.length > 0 ? todo.completed.join('\n') : '_No completed tasks_',
    '',
    '## Backlog',
    '',
    todo.backlog.length > 0 ? todo.backlog.join('\n') : '_No planned tasks_',
    '',
    todo.footer
  ].join('\n');
  
  fs.writeFileSync(TODO_FILE, content, 'utf8');
}

/**
 * Add task to In Progress
 */
function startTask({ title, id, startedAt, details = '' }) {
  const todo = readTodo();
  
  const taskBlock = [
    `### 🔄 ${title}`,
    '',
    `> ID: ${id}`,
    `> Started: ${startedAt || getTimestamp()}`,
    `> Status: running`,
    '',
    details || '',
    ''
  ].join('\n');
  
  todo.inProgress.push(taskBlock);
  writeTodo(todo);
  
  console.log(`✅ Task started: ${title}`);
  return true;
}

/**
 * Move task from In Progress to Completed
 */
function completeTask({ id, completedAt, summary = '' }) {
  const todo = readTodo();
  
  // Find and remove from inProgress
  const taskIndex = todo.inProgress.findIndex(block => 
    block.includes(`> ID: ${id}`) || block.includes(id)
  );
  
  if (taskIndex === -1) {
    console.log(`⚠️ Task not found in progress: ${id}`);
    return false;
  }
  
  const taskBlock = todo.inProgress[taskIndex];
  todo.inProgress.splice(taskIndex, 1);
  
  // Update status and add completion info
  const updatedBlock = taskBlock
    .replace('> Status: running', `> Status: done\n> Completed: ${completedAt || getTimestamp()}`)
    .replace('### 🔄', '### ✅');
  
  const completedBlock = summary 
    ? `${updatedBlock}\n**Summary**: ${summary}\n`
    : updatedBlock;
  
  todo.completed.unshift(completedBlock);
  writeTodo(todo);
  
  console.log(`✅ Task completed: ${id}`);
  return true;
}

/**
 * Mark task as blocked
 */
function blockTask({ id, reason, attempts = 1 }) {
  const todo = readTodo();
  
  // Find task in inProgress
  const taskIndex = todo.inProgress.findIndex(block => 
    block.includes(`> ID: ${id}`) || block.includes(id)
  );
  
  if (taskIndex === -1) {
    console.log(`⚠️ Task not found in progress: ${id}`);
    return false;
  }
  
  const taskBlock = todo.inProgress[taskIndex];
  
  // Update status
  const updatedBlock = taskBlock
    .replace('> Status: running', `> Status: blocked\n> Blocked: ${getTimestamp()}\n> Attempts: ${attempts}`)
    .replace('### 🔄', '### ⚠️');
  
  // Add block reason
  const blockedBlock = `${updatedBlock}\n**Block Reason**: ${reason}\n`;
  
  todo.inProgress[taskIndex] = blockedBlock;
  writeTodo(todo);
  
  console.log(`⚠️ Task blocked: ${id} - ${reason}`);
  return true;
}

/**
 * Unblock task (return to running)
 */
function unblockTask({ id }) {
  const todo = readTodo();
  
  const taskIndex = todo.inProgress.findIndex(block => 
    block.includes(`> ID: ${id}`) || block.includes(id)
  );
  
  if (taskIndex === -1) {
    console.log(`⚠️ Task not found: ${id}`);
    return false;
  }
  
  const taskBlock = todo.inProgress[taskIndex]
    .replace('> Status: blocked', '> Status: running')
    .replace(/### ⚠️/, '### 🔄');
  
  todo.inProgress[taskIndex] = taskBlock;
  writeTodo(todo);
  
  console.log(`✅ Task unblocked: ${id}`);
  return true;
}

/**
 * Add task to backlog
 */
function addToBacklog({ title, id, priority = 'medium', details = '' }) {
  const todo = readTodo();
  
  const taskBlock = [
    `### 📋 ${title}`,
    '',
    `> ID: ${id}`,
    `> Priority: ${priority}`,
    `> Added: ${getTimestamp()}`,
    '',
    details || '',
    ''
  ].join('\n');
  
  todo.backlog.push(taskBlock);
  writeTodo(todo);
  
  console.log(`📋 Task added to backlog: ${title}`);
  return true;
}

// CLI interface
const command = process.argv[2];
let dataStr = process.argv[3] || '{}';

// Handle PowerShell quote stripping - comprehensive fix
function fixJsonString(str) {
  if (!str.startsWith('{')) return str;
  
  // Add quotes around unquoted property names
  str = str.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
  
  // Fix array values FIRST - quote all unquoted strings inside arrays
  str = str.replace(/\[([^\[\]]*?)\]/g, (match, arrContent) => {
    // Split by comma, quote each item, rejoin
    const items = arrContent.split(',').map(item => {
      const trimmed = item.trim();
      if (!trimmed) return trimmed;
      if (/^\d+$/.test(trimmed) || ['true', 'false', 'null'].includes(trimmed)) return trimmed;
      if (trimmed.startsWith('"')) return trimmed;
      return `"${trimmed}"`;
    });
    return `[${items.join(',')}]`;
  });
  
  // Add quotes around unquoted string values (between : and , or })
  str = str.replace(/:\s*([^",{}\[\]\d][^,{}\[\]]*?)(\s*[,}])/g, (match, value, end) => {
    // Skip if it looks like a number or boolean
    if (/^\d+$/.test(value.trim()) || ['true', 'false', 'null'].includes(value.trim())) {
      return match;
    }
    return `:"${value.trim()}"${end}`;
  });
  
  return str;
}

if (dataStr.startsWith('{') && !dataStr.startsWith('{"')) {
  dataStr = fixJsonString(dataStr);
}

const data = JSON.parse(dataStr);

switch (command) {
  case 'start':
    startTask(data);
    break;
  case 'complete':
    completeTask(data);
    break;
  case 'block':
    blockTask(data);
    break;
  case 'unblock':
    unblockTask(data);
    break;
  case 'backlog':
    addToBacklog(data);
    break;
  default:
    console.log('Usage:');
    console.log('  node auto-todo-sync.js start \'{"title":"...", "id":"...", "details":"..."}\'');
    console.log('  node auto-todo-sync.js complete \'{"id":"...", "summary":"..."}\'');
    console.log('  node auto-todo-sync.js block \'{"id":"...", "reason":"...", "attempts":1}\'');
    console.log('  node auto-todo-sync.js unblock \'{"id":"..."}\'');
    console.log('  node auto-todo-sync.js backlog \'{"title":"...", "id":"...", "priority":"medium"}\'');
}
