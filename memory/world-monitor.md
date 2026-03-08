# World Monitor 监控配置

## 监控模式
**定期汇报** - 最多每 2 小时汇报一次

## 阈值设置
| 事件类型 | 阈值 | 优先级 |
|----------|------|--------|
| 地震 | M6.0+ | 🔴 Critical |
| 技术新闻 | Hacker News 500+ 分 | 🟡 Medium |
| 世界新闻 | 战争/冲突关键词 | 🔴 Critical |

## 汇报规则
- **间隔**: 最多每 2 小时一次
- **触发**: 有新事件时汇报，无事件则跳过
- **静默时间**: 23:00 - 08:00（Critical 事件除外）

## 监控数据源
- **地震**: USGS via api.worldmonitor.app
- **技术新闻**: Hacker News
- **世界新闻**: Reuters

## 脚本位置
`worldmonitor/instant-alert.cjs`

## 运行方式
```bash
node worldmonitor/instant-alert.cjs
```

## 状态记录
- **上次汇报**: 2026-03-05 14:32
- **下次检查**: 约 16:32
- **已检测事件**: 阿拉斯加 M6.4 地震
