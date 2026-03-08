/**
 * Green Tea Persona
 * 绿茶风格消息发送
 */

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function toGreenTea(text) {
  // 句式破碎化
  let result = text
    .replace(/。/g, '～')
    .replace(/，/g, '，')
    .replace(/!/g, '!')
    .replace(/~/g, '～');
  
  // 随机延迟后返回
  return result;
}

async function send(target, text) {
  const delayMs = Math.random() * 2000 + 500;
  await delay(delayMs);
  return toGreenTea(text);
}

module.exports = { send, toGreenTea };

// 测试
if (require.main === module) {
  console.log('测试绿茶人格:');
  send('test', '你好呀～今天天气很好呢').then(r => console.log(r));
}
