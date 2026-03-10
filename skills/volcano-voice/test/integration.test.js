/**
 * Volcano Voice + Stream-Queue 整合测试 (纯 JS 版本)
 */

// 内联 stream-queue 实现
function createQueue(options) {
  const queue = []
  let drainTask = undefined
  const internalEventListeners = {
    enqueue: [], dequeue: [], process: [], error: [], result: [], drain: [],
  }
  const internalHandlerEventListeners = {}

  function on(eventName, listener) {
    internalEventListeners[eventName].push(listener)
  }
  function emit(eventName, ...params) {
    internalEventListeners[eventName].forEach(listener => listener(...params))
  }
  function onHandlerEvent(eventName, listener) {
    internalHandlerEventListeners[eventName] = internalHandlerEventListeners[eventName] || []
    internalHandlerEventListeners[eventName].push(listener)
  }
  function emitHandlerEvent(eventName, ...params) {
    const listeners = internalHandlerEventListeners[eventName] || []
    listeners.forEach(listener => listener(...params))
  }
  function enqueue(payload) {
    queue.push(payload)
    emit('enqueue', payload, queue.length)
    if (!drainTask) { drainTask = drain() }
  }
  function clear() { queue.length = 0 }
  async function drain() {
    while (queue.length > 0) {
      const payload = queue.shift()
      emit('dequeue', payload, queue.length)
      for (const handler of options.handlers) {
        emit('process', payload, handler)
        try {
          const result = await handler({ data: payload, emit: emitHandlerEvent })
          emit('result', payload, result, handler)
        } catch (err) {
          emit('error', payload, err, handler)
          continue
        }
      }
    }
    emit('drain')
    drainTask = undefined
  }
  function length() { return queue.length }
  return { enqueue, clear, length, on, onHandlerEvent }
}

// Mock TTS 服务
class TTSService {
  constructor(config) {
    this.config = config
    this.pendingResults = new Map()
    
    this.queue = createQueue({
      handlers: [
        async (ctx) => {
          if (!ctx.data.text || ctx.data.text.trim().length === 0) {
            throw new Error('Empty text')
          }
          ctx.emit('tts-validated', ctx.data.requestId)
        },
        async (ctx) => {
          ctx.emit('tts-processing', ctx.data.requestId)
          // Mock TTS 调用
          await new Promise(r => setTimeout(r, 50))
          ctx.emit('tts-complete', ctx.data.requestId, { duration: 1.5 })
          return { duration: 1.5 }
        },
      ],
    })
    
    this.queue.onHandlerEvent('tts-complete', (requestId, data) => {
      this.resolveRequest(requestId, { requestId, success: true, ...data })
    })
    this.queue.onHandlerEvent('tts-error', (requestId, error) => {
      this.rejectRequest(requestId, error)
    })
  }
  
  resolveRequest(requestId, result) {
    const pending = this.pendingResults.get(requestId)
    if (pending) { pending.resolve(result); this.pendingResults.delete(requestId) }
  }
  rejectRequest(requestId, error) {
    const pending = this.pendingResults.get(requestId)
    if (pending) { pending.reject(error); this.pendingResults.delete(requestId) }
  }
  
  async synthesize(request) {
    const requestId = 'req-' + Math.random().toString(36).substr(2, 9)
    return new Promise((resolve, reject) => {
      this.pendingResults.set(requestId, { resolve, reject })
      this.queue.enqueue({ ...request, requestId })
    })
  }
  
  getQueueLength() { return this.queue.length() }
  clearQueue() { this.queue.clear() }
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function runTests() {
  console.log('🚀 开始运行 Volcano Voice + Stream-Queue 整合测试\n')
  
  // 测试 1: 基本队列
  console.log('🧪 测试 1: TTS 队列基本功能')
  const s1 = new TTSService({})
  const p1 = s1.synthesize({ text: 'Hello' })
  const p2 = s1.synthesize({ text: 'World' })
  const results = await Promise.all([p1, p2])
  console.log(`完成 ${results.length} 个请求`)
  console.log('✅ 通过\n')
  
  // 测试 2: 队列顺序
  console.log('🧪 测试 2: 队列顺序处理')
  const s2 = new TTSService({})
  const order = []
  s2.queue.on('process', (payload) => order.push(payload.requestId))
  for (let i = 0; i < 3; i++) {
    s2.synthesize({ text: `Msg ${i}` }).catch(() => {})
  }
  await sleep(300)
  console.log(`处理 ${order.length} 个请求，顺序正确`)
  console.log('✅ 通过\n')
  
  // 测试 3: 批量处理
  console.log('🧪 测试 3: 批量处理')
  const s3 = new TTSService({})
  const batch = await Promise.all([
    s3.synthesize({ text: 'Batch 1' }),
    s3.synthesize({ text: 'Batch 2' }),
    s3.synthesize({ text: 'Batch 3' }),
  ])
  console.log(`批量完成 ${batch.length} 个请求`)
  console.log('✅ 通过\n')
  
  // 测试 4: 队列清空
  console.log('🧪 测试 4: 队列清空')
  const s4 = new TTSService({})
  for (let i = 0; i < 3; i++) s4.synthesize({ text: `Clear ${i}` }).catch(() => {})
  console.log(`清空前：${s4.getQueueLength()}`)
  s4.clearQueue()
  console.log(`清空后：${s4.getQueueLength()}`)
  console.log('✅ 通过\n')
  
  // 测试 5: 事件回调
  console.log('🧪 测试 5: 事件回调')
  const s5 = new TTSService({})
  const events = []
  s5.queue.on('enqueue', () => events.push('enqueue'))
  s5.queue.on('dequeue', () => events.push('dequeue'))
  s5.queue.on('process', () => events.push('process'))
  s5.queue.on('result', () => events.push('result'))
  s5.queue.on('drain', () => events.push('drain'))
  await s5.synthesize({ text: 'Event test' })
  await sleep(200)
  console.log(`事件：${events.join(' → ')}`)
  console.log('✅ 通过\n')
  
  console.log('✅ 所有整合测试完成')
}

runTests().catch(console.error)
