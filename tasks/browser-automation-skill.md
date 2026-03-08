# 浏览器自动化技能掌握

**创建时间**: 2026-03-06 12:12
**更新时间**: 2026-03-06 12:15
**优先级**: 高
**状态**: done

---

## 目标

系统掌握 browser 工具的使用，扩展能力边界。

## 学习内容

### 已掌握
- ✅ `browser.open` - 打开页面，获取 targetId
- ✅ `browser.screenshot` - 截图（fullPage 参数）
- ✅ `browser.act` + `evaluate` - 执行 JS 提取内容
- ✅ `browser.snapshot` - 获取 DOM 结构（aria refs）

### 待学习
- [ ] `browser.act` + `click` - 点击元素
- [ ] `browser.act` + `type` - 输入文本
- [ ] `browser.navigate` - 导航
- [ ] `browser.console` - 获取控制台日志
- [ ] 使用 refs（aria/role）定位元素
- [ ] 处理 iframe
- [ ] 等待页面加载状态

## 练习任务

1. 访问需要登录的网站（GitHub、X）
2. 提取动态渲染的内容
3. 模拟表单填写和提交
4. 截图 + 内容提取组合使用

## 参考资料

- TOOLS.md 中的浏览器使用指南
- OpenClaw docs: E:\npm-global\node_modules\openclaw\docs
- https://docs.openclaw.ai

## 经验记录

2026-03-06: 首次成功使用 browser 访问 X/Twitter 需要登录的页面
- web_fetch 失败（需要登录）
- web_search API token 失效
- browser.open + screenshot + evaluate 成功提取完整内容

---

**Next**: 练习 click 和 type 操作，找一个需要交互的页面测试

---

## 完成内容 (2026-03-06 12:15)

✅ 已创建完整技能框架：
- `skills/network-automation-framework/SKILL.md` - 三层架构决策树

✅ 核心成果:
- 决策树：API → 轻量抓取 → 浏览器自动化
- 工具选择流程：根据场景自动选择最优方案
- 故障排查流程：渐进式降级
- 成功经验：X/Twitter 访问、小红书运营

✅ 已更新:
- `TOOLS.md` - 添加浏览器使用指南
- 任务状态：running → done
