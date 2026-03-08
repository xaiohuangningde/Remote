/**
 * Stream-Queue 测试用例
 * 运行：node --loader ts-node/esm test/queue.test.ts
 */

import { createQueue } from '../src/queue.ts'

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function test1_basicQueue() {
  console.log('🧪 测试 1: 基本队列功能')
  
  const queue = createQueue<number>({
    handlers: [async (ctx) => ctx.data * 2]
  })

  const results: number[] = []
  queue.on('result', (_, result) => results.push(result))

  queue.enqueue(1)
  queue.enqueue(2)
  queue.enqueue(3)

  await sleep(100)
  
  if (results.length === 3 && results[0] === 2 && results[1] === 4 && results[2] === 6) {
    console.log('✅ 测试 1 通过')
  } else {
    console.error('❌ 测试 1 失败:', results)
  }
}

async function test2_errorHandling() {
  console.log('🧪 测试 2: 错误处理')
  
  const errorQueue = createQueue<number>({
    handlers: [
      async (ctx) => {
        if (ctx.data < 0) throw new Error('Negative number')
        return ctx.data
      }
    ]
  })

  let errorCount = 0
  errorQueue.on('error', () => errorCount++)

  errorQueue.enqueue(-1)
  errorQueue.enqueue(1)
  errorQueue.enqueue(-2)

  await sleep(100)
  
  if (errorCount === 2) {
    console.log('✅ 测试 2 通过')
  } else {
    console.error('❌ 测试 2 失败: errorCount =', errorCount)
  }
}

async function test3_handlerChain() {
  console.log('🧪 测试 3: 多处理器链')
  
  const chainQueue = createQueue<number>({
    handlers: [
      async (ctx) => ctx.data + 1,
      async (ctx) => ctx.data * 2,
      async (ctx) => ctx.data - 3
    ]
  })

  let finalResult: number | undefined
  chainQueue.on('result', (_, result) => { finalResult = result })

  chainQueue.enqueue(5) // (5+1)*2-3 = 9

  await sleep(100)
  
  if (finalResult === 9) {
    console.log('✅ 测试 3 通过')
  } else {
    console.error('❌ 测试 3 失败: finalResult =', finalResult)
  }
}

async function test4_customEvents() {
  console.log('🧪 测试 4: 自定义事件')
  
  const eventQueue = createQueue<string>({
    handlers: [
      async (ctx) => {
        ctx.emit('uppercase', ctx.data.toUpperCase())
        return ctx.data
      }
    ]
  })

  let uppercaseResult: string | undefined
  eventQueue.onHandlerEvent('uppercase', (val) => { uppercaseResult = val })

  eventQueue.enqueue('hello')

  await sleep(100)
  
  if (uppercaseResult === 'HELLO') {
    console.log('✅ 测试 4 通过')
  } else {
    console.error('❌ 测试 4 失败: uppercaseResult =', uppercaseResult)
  }
}

async function test5_drainEvent() {
  console.log('🧪 测试 5: drain 事件')
  
  const drainQueue = createQueue<number>({
    handlers: [async (ctx) => ctx.data]
  })

  let drainCalled = false
  drainQueue.on('drain', () => { drainCalled = true })

  drainQueue.enqueue(1)
  drainQueue.enqueue(2)

  await sleep(100)
  
  if (drainCalled) {
    console.log('✅ 测试 5 通过')
  } else {
    console.error('❌ 测试 5 失败: drain not called')
  }
}

async function test6_queueLength() {
  console.log('🧪 测试 6: 队列长度')
  
  const queue = createQueue<number>({
    handlers: [async (ctx) => { await sleep(50); return ctx.data }]
  })

  queue.enqueue(1)
  queue.enqueue(2)
  queue.enqueue(3)
  
  const lengthDuring = queue.length()
  
  await sleep(200)
  
  const lengthAfter = queue.length()
  
  if (lengthDuring === 3 && lengthAfter === 0) {
    console.log('✅ 测试 6 通过')
  } else {
    console.error('❌ 测试 6 失败:', { lengthDuring, lengthAfter })
  }
}

async function runAllTests() {
  console.log('🚀 开始运行 Stream-Queue 测试\n')
  
  await test1_basicQueue()
  await test2_errorHandling()
  await test3_handlerChain()
  await test4_customEvents()
  await test5_drainEvent()
  await test6_queueLength()
  
  console.log('\n✅ 所有测试完成')
}

runAllTests().catch(console.error)
