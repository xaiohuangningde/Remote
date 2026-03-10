#!/usr/bin/env node

/**
 * xiaohongshu-mcp 工具封装
 * 通过 stdio 与 MCP 服务交互
 */

import { spawn } from 'child_process';
import readline from 'readline';

const MCP_PATH = process.env.XIAOHONGSHU_MCP_PATH || './xiaohongshu-mcp';

let requestId = 0;
let mcpProcess = null;
let rl = null;
let pendingRequests = new Map();

function startMCP() {
  return new Promise((resolve, reject) => {
    mcpProcess = spawn(MCP_PATH, [], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    rl = readline.createInterface({
      input: mcpProcess.stdout,
      crlfDelay: Infinity
    });

    rl.on('line', (line) => {
      try {
        const response = JSON.parse(line);
        if (response.id && pendingRequests.has(response.id)) {
          const { resolve: res, reject: rej } = pendingRequests.get(response.id);
          pendingRequests.delete(response.id);
          if (response.error) {
            rej(new Error(response.error.message || JSON.stringify(response.error)));
          } else {
            res(response.result);
          }
        }
      } catch (e) {
        // ignore non-JSON lines
      }
    });

    mcpProcess.stderr.on('data', (data) => {
      console.error('[xiaohongshu-mcp stderr]', data.toString());
    });

    mcpProcess.on('error', reject);
    mcpProcess.on('exit', (code) => {
      console.log('[xiaohongshu-mcp exited]', code);
    });

    // Wait for MCP to initialize
    setTimeout(resolve, 2000);
  });
}

function callTool(toolName, args = {}) {
  return new Promise((resolve, reject) => {
    if (!mcpProcess) {
      reject(new Error('MCP not started. Call startMCP() first.'));
      return;
    }

    const id = ++requestId;
    const request = {
      jsonrpc: '2.0',
      id,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };

    pendingRequests.set(id, { resolve, reject });
    mcpProcess.stdin.write(JSON.stringify(request) + '\n');

    // Timeout after 60s
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error(`Timeout calling ${toolName}`));
      }
    }, 60000);
  });
}

async function listTools() {
  const response = await callTool('mcp_list_tools', {});
  return response.tools || [];
}

// Tool implementations
export async function checkLogin() {
  return await callTool('mcp_check_login', {});
}

export async function pushNote(title, content, images, tags = []) {
  return await callTool('mcp_push_note', {
    title,
    content,
    images,
    tags
  });
}

export async function pushVideo(title, content, videoPath, tags = []) {
  return await callTool('mcp_push_video', {
    title,
    content,
    video_path: videoPath,
    tags
  });
}

export async function search(keyword, page = 1) {
  return await callTool('mcp_search', {
    keyword,
    page
  });
}

export async function listNotes(page = 1) {
  return await callTool('mcp_list_notes', { page });
}

export async function getNoteDetail(noteId, xsecToken) {
  return await callTool('mcp_get_note_detail', {
    note_id: noteId,
    xsec_token: xsecToken
  });
}

export async function postComment(noteId, xsecToken, content) {
  return await callTool('mcp_post_comment', {
    note_id: noteId,
    xsec_token: xsecToken,
    content
  });
}

export async function getUser(userId, xsecToken) {
  return await callTool('mcp_get_user', {
    user_id: userId,
    xsec_token: xsecToken
  });
}

export { startMCP, listTools };

// CLI mode
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const args = JSON.parse(process.argv[3] || '{}');

  async function main() {
    try {
      await startMCP();
      let result;
      switch (command) {
        case 'check_login':
          result = await checkLogin();
          break;
        case 'push_note':
          result = await pushNote(args.title, args.content, args.images, args.tags);
          break;
        case 'push_video':
          result = await pushVideo(args.title, args.content, args.videoPath, args.tags);
          break;
        case 'search':
          result = await search(args.keyword, args.page);
          break;
        case 'list_notes':
          result = await listNotes(args.page);
          break;
        case 'get_note_detail':
          result = await getNoteDetail(args.noteId, args.xsecToken);
          break;
        case 'post_comment':
          result = await postComment(args.noteId, args.xsecToken, args.content);
          break;
        case 'get_user':
          result = await getUser(args.userId, args.xsecToken);
          break;
        default:
          console.error('Unknown command:', command);
          process.exit(1);
      }
      console.log(JSON.stringify(result));
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  }

  main();
}
