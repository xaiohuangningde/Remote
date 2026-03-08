#!/usr/bin/env node
/**
 * Auto-Memory Writer
 * 
 * Automatically writes session summaries and task lessons.
 * Triggered at key lifecycle points.
 */

const fs = require('fs');
const path = require('path');

const WORKSPACE = process.env.OPENCLAW_WORKSPACE || 'C:\\Users\\12132\\.openclaw\\workspace';
const MEMORY_DIR = path.join(WORKSPACE, 'memory');
const TASKS_DIR = path.join(WORKSPACE, 'tasks');

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Ensure memory directory exists
 */
function ensureMemoryDir() {
  if (!fs.existsSync(MEMORY_DIR)) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
  }
}

/**
 * Write session summary to daily memory file
 * @param {string} summary - Session summary text
 * @param {string[]} keyDecisions - Key decisions made
 * @param {string[]} openThreads - Open threads to continue
 */
function writeSessionSummary({ summary, keyDecisions = [], openThreads = [] }) {
  ensureMemoryDir();
  
  const today = getTodayStr();
  const memoryFile = path.join(MEMORY_DIR, `${today}.md`);
  
  let content = '';
  if (fs.existsSync(memoryFile)) {
    content = fs.readFileSync(memoryFile, 'utf8');
  }
  
  const timestamp = new Date().toLocaleString('zh-CN', { 
    timeZone: 'Asia/Shanghai',
    hour12: false 
  });
  
  const section = `
---

## ${timestamp} - Session Summary

${summary}

${keyDecisions.length > 0 ? `### Key Decisions\n${keyDecisions.map(d => `- ${d}`).join('\n')}` : ''}

${openThreads.length > 0 ? `### Open Threads\n${openThreads.map(t => `- ${t}`).join('\n')}` : ''}
`;
  
  content += section;
  fs.writeFileSync(memoryFile, content, 'utf8');
  
  console.log(`✅ Session summary written to memory/${today}.md`);
}

/**
 * Append lesson learned to lessons.md
 * @param {object} lesson - Lesson object with pattern, solution, example
 */
function appendLesson({ pattern, solution, example, category = 'General' }) {
  const lessonsFile = path.join(TASKS_DIR, 'lessons.md');
  
  let content = '';
  if (fs.existsSync(lessonsFile)) {
    content = fs.readFileSync(lessonsFile, 'utf8');
  } else {
    content = `# Lessons Learned

> Automatically updated by auto-memory.js

---

`;
  }
  
  const timestamp = getTodayStr();
  const lessonEntry = `
## ${timestamp} - ${category}

**Pattern**: ${pattern}

**Solution**: ${solution}

${example ? `**Example**:\n${example}` : ''}

---
`;
  
  content = lessonEntry + content;
  fs.writeFileSync(lessonsFile, content, 'utf8');
  
  console.log(`✅ Lesson appended to tasks/lessons.md`);
}

/**
 * Consolidate weekly memory into MEMORY.md
 * Runs every Sunday
 */
function consolidateWeeklyMemory() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday
  
  if (dayOfWeek !== 0) {
    console.log('Not Sunday, skipping weekly consolidation');
    return;
  }
  
  ensureMemoryDir();
  
  // Get all memory files from this week
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const files = fs.readdirSync(MEMORY_DIR)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .filter(f => {
      const fileDate = new Date(f.replace('.md', ''));
      return fileDate >= weekAgo;
    });
  
  if (files.length === 0) {
    console.log('No memory files to consolidate this week');
    return;
  }
  
  const memoryFile = path.join(WORKSPACE, 'MEMORY.md');
  let memoryContent = fs.existsSync(memoryFile) 
    ? fs.readFileSync(memoryFile, 'utf8')
    : '# Long-term Memory\n\n---\n\n';
  
  const weeklySection = `
## Week of ${weekAgo.toISOString().split('T')[0]}

${files.map(f => {
  const content = fs.readFileSync(path.join(MEMORY_DIR, f), 'utf8');
  return `### ${f}\n\n${content}`;
}).join('\n')}

---
`;
  
  // Insert after header, before existing content
  const headerEnd = memoryContent.indexOf('\n---\n') + 5;
  memoryContent = memoryContent.slice(0, headerEnd) + weeklySection + memoryContent.slice(headerEnd);
  
  fs.writeFileSync(memoryFile, memoryContent, 'utf8');
  console.log(`✅ Weekly memory consolidated (${files.length} files)`);
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

if (command === 'session-summary') {
  writeSessionSummary(data);
} else if (command === 'lesson') {
  appendLesson(data);
} else if (command === 'consolidate') {
  consolidateWeeklyMemory();
} else {
  console.log('Usage:');
  console.log('  node auto-memory.js session-summary \'{"summary":"...", "keyDecisions":[], "openThreads":[]}\'');
  console.log('  node auto-memory.js lesson \'{"pattern":"...", "solution":"...", "category":"..."}\'');
  console.log('  node auto-memory.js consolidate');
}
