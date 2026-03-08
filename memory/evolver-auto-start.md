# Evolver 自动启动配置

**创建时间：** 2026-03-05

## 配置内容

li 要求：每次 session 启动时自动检查并启动 Evolver，不需要手动操作。

## 实现方式

1. **自动启动脚本：** `C:\Users\12132\.openclaw\workspace\evolver\auto-start.ps1`
   - 检查 Evolver 是否已在运行
   - 如果未运行，自动启动 `node index.js --loop`
   - 策略：innovate

2. **Heartbeat 集成：** `HEARTBEAT.md`
   - 每次 session 启动时自动调用 `auto-start.ps1`

3. **日志位置：** `C:\Users\12132\logs\evolver.out.log`

## 使用方法

无需手动操作，系统会自动处理。

如需手动检查：
```powershell
cd C:\Users\12132\.openclaw\workspace\evolver
.\auto-start.ps1
```

## 状态

- ✅ 已配置
- ✅ 已测试
- 🟢 Evolver 当前运行中 (PID: 4232)
