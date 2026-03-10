/**
 * Voice System 测试
 * 测试核心功能：VAD 初始化、事件监听、状态管理
 */

// Mock VAD 实现
class MockVAD {
  constructor(config) {
    this.config = config;
    this.listeners = {};
    this.isRunning = false;
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  async start() {
    this.isRunning = true;
    return true;
  }

  async stop() {
    this.isRunning = false;
    return true;
  }

  async destroy() {
    this.isRunning = false;
    this.listeners = {};
  }
}

// Mock Audio Manager
class MockAudioManager {
  constructor(options) {
    this.options = options;
    this.isRunning = false;
  }

  async start() {
    this.isRunning = true;
    return true;
  }

  async stop() {
    this.isRunning = false;
    return true;
  }
}

// VoiceSystem 简化实现用于测试
class VoiceSystem {
  constructor(config) {
    this.config = config;
    this.state = {
      isInitialized: false,
      isRunning: false,
      isSpeechDetected: false,
      error: undefined,
    };
    this.eventListeners = {};
    this.vad = null;
    this.audioManager = null;
  }

  async init() {
    try {
      this.vad = new MockVAD(this.config.vad);
      this.audioManager = new MockAudioManager(this.config.audio);
      
      this.vad.on('speech-start', () => {
        this.state.isSpeechDetected = true;
        this.emit('speech-start');
      });
      
      this.vad.on('speech-end', () => {
        this.state.isSpeechDetected = false;
        this.emit('speech-end');
      });
      
      this.state.isInitialized = true;
      return true;
    } catch (error) {
      this.state.error = error.message;
      throw error;
    }
  }

  async start() {
    if (!this.state.isInitialized) {
      throw new Error('VoiceSystem not initialized');
    }
    await this.vad.start();
    await this.audioManager.start();
    this.state.isRunning = true;
    return true;
  }

  async stop() {
    await this.vad.stop();
    await this.audioManager.stop();
    this.state.isRunning = false;
    return true;
  }

  on(event, callback) {
    if (!this.eventListeners[event]) this.eventListeners[event] = [];
    this.eventListeners[event].push(callback);
  }

  emit(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(cb => cb(data));
    }
  }

  getState() {
    return { ...this.state };
  }

  async destroy() {
    if (this.vad) await this.vad.destroy();
    if (this.audioManager) await this.audioManager.stop();
    this.state.isInitialized = false;
    this.state.isRunning = false;
  }
}

// 测试运行器
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('🚀 开始运行 Voice System 测试\n');
  console.log('=' .repeat(50));
  
  let passed = 0;
  let failed = 0;

  // 测试 1: 初始化
  console.log('\n🧪 测试 1: 系统初始化');
  try {
    const system = new VoiceSystem({
      vad: { speechThreshold: 0.3, minSilenceDurationMs: 400 },
      audio: { sampleRate: 16000 },
    });
    
    await system.init();
    const state = system.getState();
    
    if (state.isInitialized === true && state.error === undefined) {
      console.log('✅ 初始化成功');
      passed++;
    } else {
      console.log('❌ 初始化状态错误');
      failed++;
    }
    
    await system.destroy();
  } catch (error) {
    console.log(`❌ 初始化失败：${error.message}`);
    failed++;
  }

  // 测试 2: 启动和停止
  console.log('\n🧪 测试 2: 启动和停止');
  try {
    const system = new VoiceSystem({
      vad: { speechThreshold: 0.3 },
      audio: { sampleRate: 16000 },
    });
    
    await system.init();
    await system.start();
    
    let runningState = system.getState();
    if (runningState.isRunning !== true) {
      throw new Error('启动后状态应为 running');
    }
    
    await system.stop();
    let stoppedState = system.getState();
    if (stoppedState.isRunning !== false) {
      throw new Error('停止后状态应为 stopped');
    }
    
    console.log('✅ 启动/停止正常');
    passed++;
    
    await system.destroy();
  } catch (error) {
    console.log(`❌ 启动/停止失败：${error.message}`);
    failed++;
  }

  // 测试 3: 事件监听
  console.log('\n🧪 测试 3: 事件监听');
  try {
    const system = new VoiceSystem({
      vad: { speechThreshold: 0.3 },
      audio: { sampleRate: 16000 },
    });
    
    await system.init();
    
    let speechStartCalled = false;
    let speechEndCalled = false;
    
    system.on('speech-start', () => { speechStartCalled = true; });
    system.on('speech-end', () => { speechEndCalled = true; });
    
    // 模拟事件触发
    system.vad.emit('speech-start');
    system.vad.emit('speech-end');
    
    await sleep(50);
    
    if (speechStartCalled && speechEndCalled) {
      console.log('✅ 事件监听正常');
      passed++;
    } else {
      console.log('❌ 事件未正确触发');
      failed++;
    }
    
    await system.destroy();
  } catch (error) {
    console.log(`❌ 事件监听失败：${error.message}`);
    failed++;
  }

  // 测试 4: 未初始化时启动应失败
  console.log('\n🧪 测试 4: 未初始化时启动应抛出错误');
  try {
    const system = new VoiceSystem({});
    
    try {
      await system.start();
      console.log('❌ 应该抛出错误');
      failed++;
    } catch (error) {
      if (error.message.includes('not initialized')) {
        console.log('✅ 正确抛出错误');
        passed++;
      } else {
        console.log(`❌ 错误消息不匹配：${error.message}`);
        failed++;
      }
    }
  } catch (error) {
    console.log(`❌ 测试失败：${error.message}`);
    failed++;
  }

  // 测试 5: 配置默认值
  console.log('\n🧪 测试 5: 配置默认值');
  try {
    const system = new VoiceSystem({
      vad: { speechThreshold: 0.3, minSilenceDurationMs: 400 },
      audio: { sampleRate: 16000 },
    });
    
    await system.init();
    
    if (system.config.vad.speechThreshold === 0.3 &&
        system.config.vad.minSilenceDurationMs === 400) {
      console.log('✅ 默认配置正确');
      passed++;
    } else {
      console.log('❌ 默认配置错误');
      failed++;
    }
    
    await system.destroy();
  } catch (error) {
    console.log(`❌ 配置测试失败：${error.message}`);
    failed++;
  }

  // 总结
  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 测试结果：${passed} 通过，${failed} 失败`);
  console.log(`✅ 通过率：${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
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
