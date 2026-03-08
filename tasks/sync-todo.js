#!/usr/bin/env node
// sync-todo.js - Auto-sync task status to todo.md

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const workspaceRoot = path.join(process.env.USERPROFILE, '.openclaw', 'workspace');
const logFile = path.join(workspaceRoot, 'tasks', 'state-driven-log.md');
const todoFile = path.join(workspaceRoot, 'tasks', 'todo.md');

console.log('🔄 Syncing task status...');

// Read state log
if (!fs.existsSync(logFile)) {
    console.error('❌ Log file not found:', logFile);
    process.exit(1);
}

const logContent = fs.readFileSync(logFile, 'utf8');
const lines = logContent.split('\n');

const inProgressTasks = [];
const completedTasks = [];
let currentSection = '';

for (const line of lines) {
    // Detect section
    if (line.includes('**Completed**') || line.includes('**已完成**')) {
        currentSection = 'completed';
    } else if (line.includes('**Pending**') || line.includes('**待执行**')) {
        currentSection = 'pending';
    } else if (line.includes('**Blocked**') || line.includes('**阻塞**')) {
        currentSection = 'blocked';
    }

    // Parse task lines starting with "- "
    if (line.trim().startsWith('-')) {
        const trimmedLine = line.replace(/^-+\s*/, '').trim();
        
        // Check for completed marker
        if (trimmedLine.includes('✅') && currentSection === 'completed') {
            const task = trimmedLine.replace(/.*✅\s*/, '').trim();
            completedTasks.push(task);
        }
        // Check for pending/blocked marker
        else if ((trimmedLine.includes('⏳') || trimmedLine.includes('🛑')) && 
                 (currentSection === 'pending' || currentSection === 'blocked')) {
            const task = trimmedLine.replace(/.*[⏳🛑]\s*/, '').trim();
            inProgressTasks.push(task);
        }
    }
}

// Get timestamp
const timestamp = new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
}).replace(/\//g, '-');

// Check evolver status
let evolverStatus = 'Unknown';
try {
    const output = execSync('powershell -Command "Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like \\"*evolver*\\" } | Select-Object -First 1 -ExpandProperty Id"', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore']
    }).trim();
    if (output) {
        evolverStatus = `Running (PID: ${output})`;
    } else {
        evolverStatus = 'Not running';
    }
} catch (e) {
    evolverStatus = 'Not running';
}

// Build todo.md content
const content = [
    '# 待办事项',
    '',
    `> Last updated: ${timestamp}`,
    '> Auto-sync: Enabled (sync-todo.js)',
    '',
    '---',
    '',
    '## In Progress',
    ''
];

if (inProgressTasks.length > 0) {
    inProgressTasks.forEach(t => content.push(`- [ ] ${t}`));
} else {
    content.push('_No tasks in progress_');
}

content.push('', '---', '', '## Completed', '');

if (completedTasks.length > 0) {
    completedTasks.forEach(t => content.push(`- [x] ${t}`));
} else {
    content.push('_No completed tasks yet_');
}

content.push(
    '',
    '---',
    '',
    '## Backlog',
    '',
    '_No planned tasks_',
    '',
    '---',
    '',
    '## System Status',
    '',
    '| System | Status |',
    '|--------|--------|',
    `| Evolver | ${evolverStatus} |`,
    '| Task Queue | Ready |',
    '| Auto-Sync | Enabled |',
    '',
    '---',
    '',
    '## Commands',
    '',
    '```powershell',
    '# Manual sync',
    'node tasks\\sync-todo.js',
    '',
    '# View state log',
    'Get-Content tasks\\state-driven-log.md',
    '```',
    ''
);

// Write todo.md
fs.writeFileSync(todoFile, content.join('\n'), 'utf8');

console.log('✅ Sync complete!');
console.log(`   In progress: ${inProgressTasks.length}`);
console.log(`   Completed: ${completedTasks.length}`);
console.log(`   File: ${todoFile}`);
