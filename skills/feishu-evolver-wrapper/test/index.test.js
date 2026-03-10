/**
 * Feishu Evolver Wrapper 测试
 * 测试核心功能：生命周期管理、报告生成、错误处理
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

// 模拟 Evolver Wrapper 核心功能
class FeishuEvolverWrapper {
  constructor(workspace) {
    this.workspace = workspace || path.join(os.tmpdir(), 'feishu-evolver-test');
    this.memoryDir = path.join(this.workspace, 'memory', 'evolution');
    this.assetsDir = path.join(this.workspace, 'assets', 'gep');
    this.logsDir = path.join(this.workspace, 'logs');
    
    this.state = {
      isRunning: false,
      cycleCount: 0,
      lastCycleTime: null,
      errorCount: 0,
      reportCount: 0
    };
    
    this.init();
  }

  init() {
    [this.memoryDir, this.assetsDir, this.logsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    // 初始化 events.jsonl
    this.eventsFile = path.join(this.assetsDir, 'events.jsonl');
    if (!fs.existsSync(this.eventsFile)) {
      fs.writeFileSync(this.eventsFile, '');
    }
  }

  // 模拟周期标签生成
  nextCycleTag() {
    const cycleFile = path.join(this.memoryDir, 'cycle.txt');
    let cycleId = 1;
    
    try {
      if (fs.existsSync(cycleFile)) {
        const raw = fs.readFileSync(cycleFile, 'utf8').trim();
        if (raw && !isNaN(raw)) {
          cycleId = parseInt(raw, 10) + 1;
        }
      }
    } catch (e) {
      console.error('Cycle read error:', e.message);
    }
    
    try {
      fs.writeFileSync(cycleFile, cycleId.toString());
    } catch (e) {
      console.error('Cycle write error:', e.message);
    }
    
    this.state.cycleCount = cycleId;
    return String(cycleId).padStart(4, '0');
  }

  // 模拟睡眠（带唤醒检测）
  async sleepSeconds(seconds) {
    const wakeFile = path.join(this.memoryDir, 'evolver_wake.signal');
    const interval = 100; // 检查间隔
    const steps = Math.ceil(seconds * 1000 / interval);
    
    for (let i = 0; i < steps; i++) {
      if (fs.existsSync(wakeFile)) {
        try { fs.unlinkSync(wakeFile); } catch (e) {}
        return true; // 被唤醒
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    return false; // 自然完成
  }

  // 记录失败教训
  appendFailureLesson(cycleTag, reason, details) {
    const lessonsFile = path.join(this.memoryDir, 'failure_lessons.jsonl');
    try {
      const entry = {
        at: new Date().toISOString(),
        cycle: String(cycleTag),
        reason: String(reason || 'unknown'),
        details: String(details || '').slice(0, 1200)
      };
      fs.appendFileSync(lessonsFile, JSON.stringify(entry) + '\n');
      return true;
    } catch (e) {
      console.warn('Failed to write failure lesson:', e.message);
      return false;
    }
  }

  // 读取失败教训
  readRecentFailureLessons(limit = 5) {
    const lessonsFile = path.join(this.memoryDir, 'failure_lessons.jsonl');
    try {
      if (!fs.existsSync(lessonsFile)) return [];
      
      const lines = fs.readFileSync(lessonsFile, 'utf8').split('\n').filter(Boolean);
      return lines.slice(-limit).map(l => {
        try { return JSON.parse(l); } catch (_) { return null; }
      }).filter(Boolean);
    } catch (_) {
      return [];
    }
  }

  // 记录事件
  appendEvent(event) {
    try {
      const entry = {
        timestamp: new Date().toISOString(),
        ...event
      };
      fs.appendFileSync(this.eventsFile, JSON.stringify(entry) + '\n');
      return true;
    } catch (e) {
      console.error('Failed to append event:', e.message);
      return false;
    }
  }

  // 生成状态报告
  generateStatusReport() {
    return {
      generated_at: new Date().toISOString(),
      wrapper: 'feishu-evolver-wrapper-v1',
      state: {
        isRunning: this.state.isRunning,
        cycleCount: this.state.cycleCount,
        lastCycleTime: this.state.lastCycleTime,
        errorCount: this.state.errorCount,
        reportCount: this.state.reportCount
      },
      workspace: this.workspace
    };
  }

  // 模拟发送飞书卡片
  async sendFeishuCard(title, content) {
    // 模拟发送
    this.state.reportCount++;
    return {
      success: true,
      message_id: `msg_${Date.now()}`,
      timestamp: new Date().toISOString()
    };
  }

  // 启动进化循环
  async startEvolutionLoop() {
    this.state.isRunning = true;
    this.state.lastCycleTime = new Date().toISOString();
    
    const cycleTag = this.nextCycleTag();
    this.appendEvent({
      type: 'cycle_start',
      cycle: cycleTag,
      timestamp: this.state.lastCycleTime
    });
    
    return cycleTag;
  }

  // 停止进化循环
  async stopEvolutionLoop() {
    this.state.isRunning = false;
    this.appendEvent({
      type: 'cycle_stop',
      timestamp: new Date().toISOString()
    });
    return true;
  }

  // 获取状态
  getStatus() {
    return { ...this.state };
  }

  // 清理
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
  console.log('🚀 开始运行 Feishu Evolver Wrapper 测试\n');
  console.log('='.repeat(50));
  
  let passed = 0;
  let failed = 0;
  let wrapper;

  try {
    // 测试 1: 初始化
    console.log('\n🧪 测试 1: Wrapper 初始化');
    try {
      wrapper = new FeishuEvolverWrapper();
      
      if (fs.existsSync(wrapper.memoryDir) && 
          fs.existsSync(wrapper.assetsDir) &&
          fs.existsSync(wrapper.eventsFile)) {
        console.log('✅ 初始化成功，目录结构已创建');
        passed++;
      } else {
        console.log('❌ 目录结构未正确创建');
        failed++;
      }
    } catch (error) {
      console.log(`❌ 初始化失败：${error.message}`);
      failed++;
    }

    // 测试 2: 周期标签生成
    console.log('\n🧪 测试 2: 周期标签生成');
    try {
      const tag1 = wrapper.nextCycleTag();
      const tag2 = wrapper.nextCycleTag();
      const tag3 = wrapper.nextCycleTag();
      
      if (tag1 === '0001' && tag2 === '0002' && tag3 === '0003') {
        console.log('✅ 周期标签递增正确');
        passed++;
      } else {
        console.log(`❌ 周期标签错误：${tag1}, ${tag2}, ${tag3}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ 测试失败：${error.message}`);
      failed++;
    }

    // 测试 3: 启动进化循环
    console.log('\n🧪 测试 3: 启动进化循环');
    try {
      const cycleTag = await wrapper.startEvolutionLoop();
      const status = wrapper.getStatus();
      
      if (status.isRunning === true && 
          cycleTag && 
          status.lastCycleTime) {
        console.log('✅ 进化循环启动成功');
        passed++;
      } else {
        console.log('❌ 启动状态错误');
        failed++;
      }
    } catch (error) {
      console.log(`❌ 测试失败：${error.message}`);
      failed++;
    }

    // 测试 4: 停止进化循环
    console.log('\n🧪 测试 4: 停止进化循环');
    try {
      await wrapper.stopEvolutionLoop();
      const status = wrapper.getStatus();
      
      if (status.isRunning === false) {
        console.log('✅ 进化循环停止成功');
        passed++;
      } else {
        console.log('❌ 停止状态错误');
        failed++;
      }
    } catch (error) {
      console.log(`❌ 测试失败：${error.message}`);
      failed++;
    }

    // 测试 5: 记录失败教训
    console.log('\n🧪 测试 5: 记录失败教训');
    try {
      const result1 = wrapper.appendFailureLesson('0001', 'timeout', 'Connection timed out');
      const result2 = wrapper.appendFailureLesson('0002', 'api_error', 'Rate limit exceeded');
      
      if (result1 && result2) {
        const lessons = wrapper.readRecentFailureLessons();
        if (lessons.length === 2) {
          console.log('✅ 失败教训记录成功');
          passed++;
        } else {
          console.log(`❌ 读取失败教训数量错误：${lessons.length}`);
          failed++;
        }
      } else {
        console.log('❌ 记录失败教训失败');
        failed++;
      }
    } catch (error) {
      console.log(`❌ 测试失败：${error.message}`);
      failed++;
    }

    // 测试 6: 读取失败教训
    console.log('\n🧪 测试 6: 读取失败教训');
    try {
      const lessons = wrapper.readRecentFailureLessons(5);
      
      if (lessons.length >= 2 && 
          lessons[0].cycle === '0001' &&
          lessons[1].cycle === '0002') {
        console.log('✅ 失败教训读取正确');
        passed++;
      } else {
        console.log('❌ 失败教训内容错误');
        failed++;
      }
    } catch (error) {
      console.log(`❌ 测试失败：${error.message}`);
      failed++;
    }

    // 测试 7: 事件记录
    console.log('\n🧪 测试 7: 事件记录');
    try {
      wrapper.appendEvent({ type: 'test_event', data: 'test' });
      wrapper.appendEvent({ type: 'another_event', data: 'data' });
      
      const eventsContent = fs.readFileSync(wrapper.eventsFile, 'utf8');
      const events = eventsContent.split('\n').filter(line => line.trim()).map(l => JSON.parse(l));
      
      if (events.length >= 2) {
        console.log('✅ 事件记录成功');
        passed++;
      } else {
        console.log(`❌ 事件数量错误：${events.length}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ 测试失败：${error.message}`);
      failed++;
    }

    // 测试 8: 状态报告生成
    console.log('\n🧪 测试 8: 状态报告生成');
    try {
      const report = wrapper.generateStatusReport();
      
      if (report.generated_at && 
          report.wrapper === 'feishu-evolver-wrapper-v1' &&
          report.state &&
          report.workspace) {
        console.log('✅ 状态报告生成正确');
        passed++;
      } else {
        console.log('❌ 状态报告格式错误');
        failed++;
      }
    } catch (error) {
      console.log(`❌ 测试失败：${error.message}`);
      failed++;
    }

    // 测试 9: 飞书卡片发送（模拟）
    console.log('\n🧪 测试 9: 飞书卡片发送（模拟）');
    try {
      const result = await wrapper.sendFeishuCard('测试标题', '测试内容');
      
      if (result.success === true && result.message_id) {
        const status = wrapper.getStatus();
        if (status.reportCount >= 1) {
          console.log('✅ 飞书卡片发送成功');
          passed++;
        } else {
          console.log('❌ 报告计数未更新');
          failed++;
        }
      } else {
        console.log('❌ 发送响应错误');
        failed++;
      }
    } catch (error) {
      console.log(`❌ 测试失败：${error.message}`);
      failed++;
    }

    // 测试 10: 睡眠唤醒机制
    console.log('\n🧪 测试 10: 睡眠唤醒机制');
    try {
      const wakeFile = path.join(wrapper.memoryDir, 'evolver_wake.signal');
      
      // 启动睡眠
      const sleepPromise = wrapper.sleepSeconds(2);
      
      // 100ms 后发送唤醒信号
      await sleep(100);
      fs.writeFileSync(wakeFile, 'wake up!');
      
      // 等待睡眠结束
      const woken = await sleepPromise;
      
      if (woken === true) {
        console.log('✅ 唤醒机制工作正常');
        passed++;
      } else {
        console.log('❌ 唤醒机制未触发');
        failed++;
      }
    } catch (error) {
      console.log(`❌ 测试失败：${error.message}`);
      failed++;
    }

    // 测试 11: 多周期计数
    console.log('\n🧪 测试 11: 多周期计数');
    try {
      const wrapper2 = new FeishuEvolverWrapper(path.join(os.tmpdir(), 'feishu-evolver-test-11'));
      
      for (let i = 0; i < 5; i++) {
        wrapper2.nextCycleTag();
      }
      
      const status = wrapper2.getStatus();
      if (status.cycleCount === 5) {
        console.log('✅ 周期计数正确 (5 个周期)');
        passed++;
      } else {
        console.log(`❌ 周期计数错误：${status.cycleCount}`);
        failed++;
      }
      
      wrapper2.cleanup();
    } catch (error) {
      console.log(`❌ 测试失败：${error.message}`);
      failed++;
    }

    // 测试 12: 空状态处理
    console.log('\n🧪 测试 12: 空状态处理');
    try {
      const wrapper3 = new FeishuEvolverWrapper(path.join(os.tmpdir(), 'feishu-evolver-test-12'));
      const lessons = wrapper3.readRecentFailureLessons();
      
      if (Array.isArray(lessons) && lessons.length === 0) {
        console.log('✅ 空状态处理正确');
        passed++;
      } else {
        console.log('❌ 空状态处理错误');
        failed++;
      }
      
      wrapper3.cleanup();
    } catch (error) {
      console.log(`❌ 测试失败：${error.message}`);
      failed++;
    }

  } finally {
    // 清理测试文件
    if (wrapper) {
      wrapper.cleanup();
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
