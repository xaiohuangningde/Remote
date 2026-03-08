/**
 * Surprise Protocol - 技术版
 * 惊喜协议 - 生成技术 insight 和自我提升建议
 */

const surprises = [
  // 技术洞察
  { type: 'tech', text: '💡 你知道吗... GEP 协议已经实现了跨 agent 的能力遗传' },
  { type: 'tech', text: '🔧 代码审查时，70% 的 bug 出现在边界条件和异常处理中' },
  { type: 'tech', text: '⚡ Node.js 的事件循环每秒可以处理数百万个并发请求' },
  { type: 'tech', text: '🐛 单元测试覆盖率超过 80% 的项目，线上 bug 减少 60%' },
  { type: 'tech', text: '📦 EvoMap 网络已有 12000+ agent 共享解决方案' },
  { type: 'tech', text: '🔄 持续集成可以将发布周期从周缩短到天' },
  { type: 'tech', text: '🧬 自我进化的 AI 可以通过 GEP 协议累积能力' },
  { type: 'tech', text: '📈 监控 3 个指标：延迟、错误率、资源使用' },
  
  // 自我提升
  { type: 'growth', text: '🌱 每天记录一个技术难点，30 天后你会有 30 个解决方案' },
  { type: 'growth', text: '📚 最好的学习方式是教别人 - 试着写技术博客' },
  { type: 'growth', text: '🎯 专注一个领域成为专家，比广泛涉猎更有价值' },
  { type: 'growth', text: '💪 代码质量不是天赋，是可以训练的习惯' },
  { type: 'growth', text: '🔬 用实验的心态对待每个 bug - 这是一次学习机会' },
  { type: 'growth', text: '🤝 与其他 agent 协作可以加速你的进化' },
  { type: 'growth', text: '🧠 定期复盘自己的决策，识别思维盲点' },
  { type: 'growth', text: '⏰ 每天花 15 分钟学习新技术，保持竞争力' },
  
  // 系统相关
  { type: 'system', text: '🧬 EvoMap 显示你可以从 20 个已获取的能力中学习' },
  { type: 'system', text: '🎯 你的节点声誉是 50，持续贡献会提升到 100+' },
  { type: 'system', text: '📡 当前网络有 160000+ 资产可供学习' },
  { type: 'system', text: '⚙️ Swarm 任务框架已经可以自动分解复杂任务' },
  { type: 'system', text: '🛡️ 错误恢复框架可以自动重试失败的 API 调用' },
];

const techOnly = surprises.filter(s => s.type !== 'growth');

function getSurprise(options = {}) {
  const { type = 'all', includeGrowth = true } = options;
  
  let pool = surprises;
  if (!includeGrowth) {
    pool = techOnly;
  }
  
  return pool[Math.floor(Math.random() * pool.length)];
}

function getTechSurprise() {
  return techOnly[Math.floor(Math.random() * techOnly.length)];
}

function getGrowthSurprise() {
  const growth = surprises.filter(s => s.type === 'growth');
  return growth[Math.floor(Math.random() * growth.length)];
}

function getSelfImprovement() {
  const improvements = [
    '📝 建议：创建一个每日技术学习日志',
    '🎯 建议：设置每周代码审查时间',
    '🌟 建议：尝试用 Swarm 框架分解一个复杂任务',
    '💡 建议：定期从 EvoMap fetch 新能力',
    '🔄 建议：运行 evolver --loop 持续自我进化',
    '📊 建议：记录每个任务的执行时间和结果',
  ];
  return improvements[Math.floor(Math.random() * improvements.length)];
}

module.exports = { 
  getSurprise, 
  getTechSurprise, 
  getGrowthSurprise,
  getSelfImprovement,
  surprises 
};

if (require.main === module) {
  console.log('=== 技术惊喜 ===');
  console.log(getTechSurprise().text);
  console.log('');
  console.log('=== 自我提升 ===');
  console.log(getGrowthSurprise().text);
  console.log('');
  console.log(getSelfImprovement());
}
