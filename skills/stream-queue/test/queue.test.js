/**
 * Stream-Queue 简单测试 (纯 JS 版本)
 */

// 内联队列实现（从 queue.ts 复制）
function createQueue(options) {
  const queue = []
  let drainTask = undefined

  const internalEventListeners = {
    enqueue: [],
    dequeue: [],
    process: [],
    error: [],
    result: [],
    drain: [],
  }
  const internalHandlerEventListeners = {}

  function on(eventName, listener) {
    internalEventListeners[eventName].push(listener)
  }

  function emit(eventName, ...params) {
    const listeners = internalEventListeners[eventName]
    listeners.forEach(listener => listener(...params))
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
    if (!drainTask) {
      drainTask = drain()
    }
  }

  function clear() {
    queue.length = 0
  }

  async function drain() {
    while (queue.length > 0) {
      const payload = queue.shift()
      emit('dequeue', payload, queue.length)
      for (const handler of options.handlers) {
        emit('process', payload, handler)
        try {
          const result = await handler({ data: payload, emit: emitHandlerEvent })
          emit('result', payload, result, handler)
        }
        catch (err) {
          emit('error', payload, err, handler)
          continue
        }
      }
    }

    emit('drain')
    drainTask = undefined
  }

  function length() {
    return queue.length
  }

  return { enqueue, clear, length, on, onHandlerEvent }
}

// 测试工具
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function runTests() {
  console.log('🚀 开始运行 Stream-Queue 测试\n')
  
  // 测试 1: 基本队列
  console.log('🧪 测试 1: 基本队列功能')
  const q1 = createQueue({
    handlers: [async (ctx) => ctx.data * 2]
  })
  const results = []
  q1.on('result', (_, result) => results.push(result))
  q1.enqueue(1)
  q1.enqueue(2)
  q1.enqueue(3)
  await sleep(100)
  console.log(results.length === 3 && results[0] === 2 ? '✅ 通过' : '❌ 失败')
  
  // 测试 2: 错误处理
  console.log('🧪 测试 2: 错误处理')
  const q2 = createQueue({
    handlers: [async (ctx) => { if (ctx.data < 0) throw new Error('Neg'); return ctx.data }]
  })
  let errorCount = 0
  q2.on('error', () => errorCount++)
  q2.enqueue(-1)
  q2.enqueue(1)
  q2.enqueue(-2)
  await sleep(100)
  console.log(errorCount === 2 ? '✅ 通过' : '❌ 失败')
  
  // 测试 3: 处理器链（每个处理器独立处理原始数据）
  console.log('🧪 测试 3: 多处理器链')
  const q3 = createQueue({
    handlers: [
      async (ctx) => ctx.data + 1,  // 5+1=6
      async (ctx) => ctx.data * 2,  // 5*2=10
      async (ctx) => ctx.data - 3   // 5-3=2
    ]
  })
  const results3 = []
  q3.on('result', (_, result) => { results3.push(result) })
  q3.enqueue(5)
  await sleep(100)
  // 每个处理器独立处理，返回各自的结果
  console.log(results3.length === 3 && results3[0] === 6 && results3[1] === 10 && results3[2] === 2 ? '✅ 通过' : '❌ 失败：' + JSON.stringify(results3))
  
  // 测试 4: 自定义事件
  console.log('🧪 测试 4: 自定义事件')
  const q4 = createQueue({
    handlers: [async (ctx) => { ctx.emit('upper', ctx.data.toUpperCase()); return ctx.data }]
  })
  let upperResult
  q4.onHandlerEvent('upper', (val) => { upperResult = val })
  q4.enqueue('hello')
  await sleep(100)
  console.log(upperResult === 'HELLO' ? '✅ 通过' : '❌ 失败')
  
  // 测试 5: drain 事件
  console.log('🧪 测试 5: drain 事件')
  const q5 = createQueue({
    handlers: [async (ctx) => ctx.data]
  })
  let drainCalled = false
  q5.on('drain', () => { drainCalled = true })
  q5.enqueue(1)
  q5.enqueue(2)
  await sleep(100)
  console.log(drainCalled ? '✅ 通过' : '❌ 失败')
  
  console.log('\n✅ 所有测试完成')
}

runTests().catch(console.error)
