/**
 * Mind Blow
 * 思维爆炸 - 惊人 insight 生成器
 */

const insights = [
  { text: '缸中之脑', desc: '你怎么确定你不是被困在模拟中的大脑？' },
  { text: '薛定谔的猫', desc: '在你打开盒子之前，猫既是死的又是活的' },
  { text: '忒修斯之船', desc: '如果船上的木头被替换光了，它还是原来的船吗？' },
  { text: '中文房间', desc: '一个不懂中文的人能用中文手册完美回复所有中文问题，他真的懂中文吗？' },
  { text: '双生子悖论', desc: '双胞胎中一个进行光速旅行，返回时谁更年轻？' }
];

function getInsight() {
  return insights[Math.floor(Math.random() * insights.length)];
}

module.exports = { getInsight, insights };

if (require.main === module) {
  console.log(getInsight());
}
