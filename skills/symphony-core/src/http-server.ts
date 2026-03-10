/**
 * HTTP API 服务器
 * 
 * 提供运行时快照和调试接口
 */

import http from 'http'
import type { RuntimeSnapshot } from './types.ts'
import type { SymphonyLogger } from './logger.ts'

export interface HttpServerConfig {
  port: number
  host?: string
}

export interface HttpServer {
  start(): Promise<void>
  stop(): Promise<void>
  updateSnapshot(snapshot: RuntimeSnapshot): void
}

/**
 * 创建 HTTP 服务器
 */
export function createHttpServer(
  config: HttpServerConfig,
  logger?: SymphonyLogger
): HttpServer {
  let server: http.Server | null = null
  let currentSnapshot: RuntimeSnapshot | null = null
  
  const host = config.host ?? '127.0.0.1'
  const port = config.port
  
  function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const url = new URL(req.url ?? '/', `http://${host}:${port}`)
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Content-Type', 'application/json')
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }
    
    // Routes
    if (url.pathname === '/api/v1/state' && req.method === 'GET') {
      // 获取运行时状态
      if (currentSnapshot) {
        res.writeHead(200)
        res.end(JSON.stringify(currentSnapshot, null, 2))
      } else {
        res.writeHead(404)
        res.end(JSON.stringify({ error: 'No snapshot available' }))
      }
    } else if (url.pathname === '/api/v1/health' && req.method === 'GET') {
      // 健康检查
      res.writeHead(200)
      res.end(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      }))
    } else if (url.pathname === '/' && req.method === 'GET') {
      // HTML Dashboard
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(generateDashboard(currentSnapshot))
    } else {
      // 404
      res.writeHead(404)
      res.end(JSON.stringify({ error: 'Not found' }))
    }
  }
  
  return {
    async start(): Promise<void> {
      return new Promise((resolve, reject) => {
        server = http.createServer(handleRequest)
        
        server.listen(port, host, () => {
          logger?.info(`HTTP server started on http://${host}:${port}`)
          resolve()
        })
        
        server.on('error', (err) => {
          logger?.error('HTTP server error', err)
          reject(err)
        })
      })
    },
    
    async stop(): Promise<void> {
      return new Promise((resolve) => {
        if (server) {
          server.close(() => {
            logger?.info('HTTP server stopped')
            server = null
            resolve()
          })
        } else {
          resolve()
        }
      })
    },
    
    updateSnapshot(snapshot: RuntimeSnapshot): void {
      currentSnapshot = snapshot
    },
  }
}

/**
 * 生成 HTML Dashboard
 */
function generateDashboard(snapshot: RuntimeSnapshot | null): string {
  const now = new Date().toLocaleString('zh-CN')
  
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Symphony Runtime Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #333; margin-bottom: 20px; }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .stat-value { font-size: 32px; font-weight: bold; color: #007bff; }
    .stat-label { color: #666; margin-top: 5px; }
    .section {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    h2 { color: #333; margin-bottom: 15px; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 600; }
    .status-running { color: #28a745; }
    .status-retry { color: #ffc107; }
    .empty { color: #999; text-align: center; padding: 40px; }
    .timestamp { color: #999; font-size: 14px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎹 Symphony Runtime Dashboard</h1>
    
    <div class="stats">
      <div class="stat-card">
        <div class="stat-value">${snapshot?.counts.running ?? 0}</div>
        <div class="stat-label">运行中任务</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${snapshot?.counts.retrying ?? 0}</div>
        <div class="stat-label">重试队列</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${(snapshot?.codex_totals.total_tokens ?? 0).toLocaleString()}</div>
        <div class="stat-label">总 Token 消耗</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${Math.round(snapshot?.codex_totals.seconds_running ?? 0)}s</div>
        <div class="stat-label">运行时长</div>
      </div>
    </div>
    
    <div class="section">
      <h2>📋 运行中任务</h2>
      ${snapshot?.running && snapshot.running.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Issue</th>
              <th>会话 Key</th>
              <th>Turns</th>
              <th>Tokens</th>
              <th>开始时间</th>
            </tr>
          </thead>
          <tbody>
            ${snapshot.running.map(task => `
              <tr>
                <td><strong>${task.issue_identifier}</strong></td>
                <td><code>${task.session_key}</code></td>
                <td>${task.turn_count}</td>
                <td>${task.tokens.total_tokens.toLocaleString()}</td>
                <td>${new Date(task.started_at).toLocaleString('zh-CN')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<div class="empty">暂无运行中任务</div>'}
    </div>
    
    <div class="section">
      <h2>🔄 重试队列</h2>
      ${snapshot?.retrying && snapshot.retrying.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Issue</th>
              <th>尝试次数</th>
              <th>重试时间</th>
              <th>错误原因</th>
            </tr>
          </thead>
          <tbody>
            ${snapshot.retrying.map(retry => `
              <tr>
                <td><strong>${retry.identifier}</strong></td>
                <td>${retry.attempt}</td>
                <td>${new Date(retry.due_at).toLocaleString('zh-CN')}</td>
                <td>${retry.error ?? '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<div class="empty">暂无重试任务</div>'}
    </div>
    
    <div class="timestamp">
      最后更新：${snapshot?.generated_at ?? now}
    </div>
  </div>
</body>
</html>
`
}
