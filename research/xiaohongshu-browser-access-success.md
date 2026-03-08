# 小红书访问成功案例

**测试时间**: 2026-03-06 12:19
**测试者**: xiaoxiaohuang 🐤
**状态**: ✅ 成功

---

## 🎯 目标

使用浏览器自动化工具访问小红书，提取完整页面内容。

---

## 📋 执行流程

### 步骤 1: 打开页面

```javascript
browser.open({
  url: "https://www.xiaohongshu.com/explore"
})
// 返回 targetId: BD4ACC1728DDADB22AA1429047279C8E
```

**结果**: ✅ 页面成功打开

---

### 步骤 2: 获取页面结构 (snapshot)

```javascript
browser.snapshot({
  targetId: "BD4ACC1728DDADB22AA1429047279C8E",
  refs: "aria"
})
```

**结果**: ✅ 获取到完整的 DOM 结构

**关键发现**:
- 左侧导航：发现、发布、通知、我
- 顶部搜索框："搜索小红书"
- 分类标签：推荐、穿搭、美食、彩妆、影视、职场、情感、家居、游戏、旅行、健身
- 笔记卡片列表（多个 listitem）

---

### 步骤 3: 截图验证

```javascript
browser.screenshot({
  targetId: "BD4ACC1728DDADB22AA1429047279C8E",
  fullPage: true
})
```

**结果**: ✅ 成功截图，显示完整的推荐流页面

**截图位置**: `C:\Users\12132\.openclaw\media\browser\207cac5a-3e88-4d33-bf18-e662624e3003.jpg`

---

### 步骤 4: 提取页面内容 (evaluate)

```javascript
browser.act({
  targetId: "BD4ACC1728DDADB22AA1429047279C8E",
  kind: "evaluate",
  fn: "() => document.body.innerText.substring(0, 3000)"
})
```

**结果**: ✅ 成功提取文本内容

**提取到的内容**:
```
推荐、穿搭、美食、彩妆、影视、职场、情感、家居、游戏、旅行、健身
【开源】OpenClaw‑RL 是一个开源的强化学习扩展模块 - 无糖 AI (11 赞)
用上帝视角查看这个世界... - 猿叔碎碎念 (3714 赞)
低功耗摄像头技术 - 一切随缘随缘的 (6 赞)
PaperBrain 开源啦🔥 - 沧浪剑客 (53 赞)
以防你没听过松鼠叫🐿️ - 瑠生 (21 赞)
MedgeClaw 可以写论文了 - 北大橙子博士 (86 赞)
蘑菇云开放夜 过去一年 机器人开发全程记录 - Rex 陈正翔
莫斯科地铁真的很像末日列车！ - 辛夷欧拉 (2 赞)
Run Anywhere - 全新 WorkSpace 即将上线 - OpenCode 官方社区 (38 赞)
中国土狗 天生就比外国狗不一样 - Charles 绍 (2.7 万赞)
用 Claude Code skills 告别浅层 Paper 阅读 - 问号 (134 赞)
它已经打包好行李了 - 仓鼠七七 (1097 赞)
见过长毛的小蛤蟆么？🤣 - 土拨小滚滚 (181 赞)
openclaw 实现 QQ 邮箱自动化 - Loving (12 赞)
？？？不是哥们？ - 渡鸦的飞羽 (36 赞)
GPT-5.4 发布，AI 首次超越人类操作电脑 - Neo. (194 赞)
【巴厘岛】这趟值了！被淡水鱼征服 - Miko (1074 赞)
约克夏上床到底脏不脏？ - 深圳细姐姐奢宠 (94 赞)
```

---

## 🎉 成功要素

### 1. 工具选择正确

| 工具 | 是否可用 | 原因 |
|------|----------|------|
| web_fetch | ❌ | 小红书需要登录/JS 渲染 |
| r.jina.ai | ⚠️ | 可能只能抓取静态内容 |
| **browser** | ✅ | 完整渲染，可交互 |

### 2. 流程标准化

```
open → snapshot → screenshot → evaluate
```

这个流程经过 X/Twitter 和小红书两次验证，完全可行！

### 3. 关键技巧

- ✅ 复用 `targetId` 保持在同一个标签页
- ✅ 先用 `snapshot` 了解页面结构
- ✅ 用 `screenshot` 验证人类可见内容
- ✅ 用 `evaluate` + JS 提取机器可读内容

---

## 📊 与 MCP 方式对比

| 维度 | 小红书 MCP | Browser 自动化 |
|------|-----------|---------------|
| **速度** | 快 (<1s) | 慢 (10-30s) |
| **稳定性** | 高 | 中 |
| **功能** | 发布、搜索、评论 | 浏览、提取、截图 |
| **配置** | 需要登录获取 cookies | 无需配置 |
| **适用场景** | 日常运营 | 临时访问、内容分析 |

**结论**: 
- 日常运营 → 用 MCP (快且稳定)
- 临时访问/分析 → 用 Browser (无需配置)

---

## 💡 改进建议

### 内容提取优化

当前提取方式比较简单，可以改进：

```javascript
// 更精确的笔记卡片提取
const notes = [];
const cards = document.querySelectorAll('[role="listitem"]');

cards.forEach(card => {
  const link = card.querySelector('[role="link"]');
  const title = link?.innerText;
  const url = link?.href;
  
  // 提取点赞数
  const likeText = card.innerText.match(/(\d+(万)?)/)?.[0];
  
  if (title && title.length > 5) {
    notes.push({
      title: title.trim(),
      url: url,
      likes: likeText
    });
  }
});

return JSON.stringify(notes, null, 2);
```

### 访问单篇笔记

```javascript
// 访问具体笔记
browser.open({
  url: "https://www.xiaohongshu.com/explore/69a8420e000000001a0221bf"
})

// 提取笔记正文
browser.act({
  kind: "evaluate",
  fn: "() => document.querySelector('article')?.innerText"
})
```

---

## 📝 经验教训

### ✅ 做对的事情

1. **先 snapshot 再操作** - 了解页面结构
2. **截图验证** - 确保人类可见内容正确
3. **简单 JS 提取** - `document.body.innerText` 最可靠

### ⚠️ 需要注意

1. **页面加载时间** - 小红书需要等待内容加载
2. **反爬机制** - 频繁访问可能需要验证码
3. **登录状态** - 某些内容需要登录才能查看

---

## 🔗 相关文件

- `skills/network-automation-framework/SKILL.md` - 网络自动化框架
- `TOOLS.md` - 浏览器使用指南
- `tasks/browser-automation-skill.md` - 技能学习任务

---

## 📋 下一步

- [ ] 测试访问单篇笔记详情
- [ ] 测试搜索功能
- [ ] 优化内容提取（结构化 JSON）
- [ ] 尝试自动滚动加载更多

---

**总结**: 小红书访问成功！流程已验证，经验已记录！🐤

**创建时间**: 2026-03-06 12:20
**最后更新**: 2026-03-06 12:20
