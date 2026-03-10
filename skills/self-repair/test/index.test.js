/**
 * Self-Repair Agent 测试
 * 测试核心功能：错误捕获、根因分析、自动修复
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// 模拟 SelfRepairAgent 实现（简化版用于测试）
class SelfRepairAgent {
  constructor(workspace) {
    this.workspace = workspace || path.join(os.tmpdir(), 'self-repair-test');
    this.logDir = path.join(this.workspace, 'logs');
    this.logFile = path.join(this.logDir, 'repair.log');
    this.errorCount = 0;
    this.repairCount = 0;
    this.sessionErrors = [];
    this.init();
  }

  init() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    if (fs.existsSync(this.logFile)) {
      fs.unlinkSync(this.logFile);
    }
  }

  log(msg, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] [${level}] ${msg}\n`;
    fs.appendFileSync(this.logFile, entry);
  }

  analyzeRootCause(errorMsg) {
    const ERROR_PATTERNS = [
      { pattern: /ENOENT: no such file or directory/, type: 'missing_file', fix: 'create_file' },
      { pattern: /EACCES: permission denied/, type: 'permission_error', fix: 'fix_permissions' },
      { pattern: /MODULE_NOT_FOUND/, type: 'missing_dependency', fix: 'install_dep' },
      { pattern: /ECONNREFUSED/, type: 'connection_refused', fix: 'retry_later' },
      { pattern: /ETIMEDOUT|timeout/, type: 'timeout', fix: 'retry_later' },
      { pattern: /429|Too Many Requests/, type: 'rate_limit', fix: 'wait_and_retry' },
      { pattern: /JSONParseError/, type: 'json_error', fix: 'reset_json' },
    ];

    for (const rule of ERROR_PATTERNS) {
      if (rule.pattern.test(errorMsg)) {
        return { type: rule.type, fix: rule.fix, pattern: rule.pattern };
      }
    }
    return { type: 'unknown', fix: 'manual' };
  }

  async attemptRepair(analysis, context) {
    const { fix } = analysis;
    
    switch (fix) {
      case 'create_file':
        const fileMatch = context.message.match(/open '([^']+)'/);
        if (fileMatch) {
          const filePath = fileMatch[1];
          const dir = path.dirname(filePath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(filePath, '');
          return true;
        }
        return false;

      case 'retry_later':
      case 'wait_and_retry':
        return true;

      default:
        return false;
    }
  }

  async handleError(error) {
    this.errorCount++;
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    const context = {
      timestamp: new Date().toISOString(),
      message: errorMsg,
      count: this.errorCount
    };
    
    this.sessionErrors.push(context);
    const analysis = this.analyzeRootCause(errorMsg);
    const repaired = await this.attemptRepair(analysis, context);
    
    if (repaired) {
      this.repairCount++;
    }
    
    return repaired;
  }

  getStatus() {
    return {
      errorCount: this.errorCount,
      repairCount: this.repairCount,
      repairRate: this.errorCount > 0 ? (this.repairCount / this.errorCount * 100).toFixed(1) + '%' : 'N/A',
      recentErrors: this.sessionErrors.slice(-5)
    };
  }

  generateReport() {
    return {
      generated_at: new Date().toISOString(),
      agent: 'self_repair_v1',
      stats: this.getStatus()
    };
  }

  cleanup() {
    if (fs.existsSync(this.workspace)) {
      fs.rmSync(this.workspace, { recursive: true, force: true });
    }
  }
}

// 测试运行器
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('🚀 开始运行 Self-Repair Agent 测试\n');
  console.log('='.repeat(50));
  
  let passed = 0;
  let failed = 0;
  let agent;

  try {
    // 测试 1: 初始化
    console.log('\n🧪 测试 1: Agent 初始化');
    try {
      agent = new SelfRepairAgent();
      if (fs.existsSync(agent.logDir)) {
        console.log('✅ 初始化成功，日志目录已创建');
        passed++;
      } else {
        console.log('❌ 日志目录未创建');
        failed++;
      }
    } catch (error) {
      console.log(`❌ 初始化失败：${error.message}`);
      failed++;
    }

    // 测试 2: 错误模式识别 - 文件缺失
    console.log('\n🧪 测试 2: 错误模式识别 - 文件缺失 (ENOENT)');
    try {
      const analysis = agent.analyzeRootCause("ENOENT: no such file or directory, open 'test.txt'");
      if (analysis.type === 'missing_file' && analysis.fix === 'create_file') {
        console.log('✅ 正确识别文件缺失错误');
        passed++;
      } else {
        console.log(`❌ 识别错误：${analysis.type}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ 测试失败：${error.message}`);
      failed++;
    }

    // 测试 3: 错误模式识别 - 权限问题
    console.log('\n🧪 测试 3: 错误模式识别 - 权限问题 (EACCES)');
    try {
      const analysis = agent.analyzeRootCause("EACCES: permission denied, open '/root/secret.txt'");
      if (analysis.type === 'permission_error' && analysis.fix === 'fix_permissions') {
        console.log('✅ 正确识别权限错误');
        passed++;
      } else {
        console.log(`❌ 识别错误：${analysis.type}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ 测试失败：${error.message}`);
      failed++;
    }

    // 测试 4: 错误模式识别 - 依赖缺失
    console.log('\n🧪 测试 4: 错误模式识别 - 依赖缺失 (MODULE_NOT_FOUND)');
    try {
      const analysis = agent.analyzeRootCause("Error: Cannot find module 'express'\nMODULE_NOT_FOUND\nRequire stack: index.js");
      if (analysis.type === 'missing_dependency' && analysis.fix === 'install_dep') {
        console.log('✅ 正确识别依赖缺失');
        passed++;
      } else {
        console.log(`❌ 识别错误：${analysis.type}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ 测试失败：${error.message}`);
      failed++;
    }

    // 测试 5: 错误模式识别 - 连接拒绝
    console.log('\n🧪 测试 5: 错误模式识别 - 连接拒绝 (ECONNREFUSED)');
    try {
      const analysis = agent.analyzeRootCause("connect ECONNREFUSED 127.0.0.1:8080");
      if (analysis.type === 'connection_refused' && analysis.fix === 'retry_later') {
        console.log('✅ 正确识别连接错误');
        passed++;
      } else {
        console.log(`❌ 识别错误：${analysis.type}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ 测试失败：${error.message}`);
      failed++;
    }

    // 测试 6: 错误模式识别 - JSON 解析错误
    console.log('\n🧪 测试 6: 错误模式识别 - JSON 解析错误');
    try {
      const analysis = agent.analyzeRootCause("JSONParseError: Unexpected token 'a' in JSON at position 0");
      if (analysis.type === 'json_error' && analysis.fix === 'reset_json') {
        console.log('✅ 正确识别 JSON 错误');
        passed++;
      } else {
        console.log(`❌ 识别错误：${analysis.type}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ 测试失败：${error.message}`);
      failed++;
    }

    // 测试 7: 自动修复 - 创建缺失文件
    console.log('\n🧪 测试 7: 自动修复 - 创建缺失文件');
    try {
      const testFile = path.join(agent.workspace, 'test', 'missing.txt');
      const error = new Error(`ENOENT: no such file or directory, open '${testFile}'`);
      
      const repaired = await agent.handleError(error);
      
      if (repaired && fs.existsSync(testFile)) {
        console.log('✅ 成功创建缺失文件');
        passed++;
      } else {
        console.log('❌ 文件创建失败');
        failed++;
      }
    } catch (error) {
      console.log(`❌ 测试失败：${error.message}`);
      failed++;
    }

    // 测试 8: 自动修复 - 临时错误可重试
    console.log('\n🧪 测试 8: 自动修复 - 临时错误标记为可重试');
    try {
      const error = new Error("connect ECONNREFUSED 127.0.0.1:8080");
      const repaired = await agent.handleError(error);
      
      if (repaired) {
        console.log('✅ 临时错误正确标记为可重试');
        passed++;
      } else {
        console.log('❌ 临时错误处理失败');
        failed++;
      }
    } catch (error) {
      console.log(`❌ 测试失败：${error.message}`);
      failed++;
    }

    // 测试 9: 状态报告
    console.log('\n🧪 测试 9: 状态报告生成');
    try {
      const status = agent.getStatus();
      
      if (status.errorCount >= 0 && 
          status.repairCount >= 0 && 
          typeof status.repairRate === 'string') {
        console.log(`✅ 状态报告正常 (错误：${status.errorCount}, 修复：${status.repairCount})`);
        passed++;
      } else {
        console.log('❌ 状态报告格式错误');
        failed++;
      }
    } catch (error) {
      console.log(`❌ 测试失败：${error.message}`);
      failed++;
    }

    // 测试 10: 修复报告生成
    console.log('\n🧪 测试 10: 修复报告生成');
    try {
      const report = agent.generateReport();
      
      if (report.generated_at && 
          report.agent === 'self_repair_v1' &&
          report.stats) {
        console.log('✅ 修复报告生成正常');
        passed++;
      } else {
        console.log('❌ 修复报告格式错误');
        failed++;
      }
    } catch (error) {
      console.log(`❌ 测试失败：${error.message}`);
      failed++;
    }

    // 测试 11: 日志记录
    console.log('\n🧪 测试 11: 日志记录功能');
    try {
      agent.log('Test message', 'INFO');
      const logContent = fs.readFileSync(agent.logFile, 'utf8');
      
      if (logContent.includes('Test message') && logContent.includes('INFO')) {
        console.log('✅ 日志记录正常');
        passed++;
      } else {
        console.log('❌ 日志内容不正确');
        failed++;
      }
    } catch (error) {
      console.log(`❌ 测试失败：${error.message}`);
      failed++;
    }

    // 测试 12: 未知错误类型
    console.log('\n🧪 测试 12: 未知错误类型处理');
    try {
      const analysis = agent.analyzeRootCause("Some random unknown error");
      if (analysis.type === 'unknown' && analysis.fix === 'manual') {
        console.log('✅ 未知错误正确标记为需人工处理');
        passed++;
      } else {
        console.log(`❌ 未知错误处理错误：${analysis.type}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ 测试失败：${error.message}`);
      failed++;
    }

  } finally {
    // 清理测试文件
    if (agent) {
      agent.cleanup();
    }
  }

  // 总结
  console.log('\n' + '='.repeat(50));
  const total = passed + failed;
  console.log(`\n📊 测试结果：${passed} 通过，${failed} 失败`);
  console.log(`✅ 通过率：${((passed / total) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 所有测试通过！');
  } else {
    console.log('\n⚠️  部分测试失败，请检查实现');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('测试运行失败:', error);
  process.exit(1);
});
