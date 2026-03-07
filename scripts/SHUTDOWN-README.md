# ⏰ 自动关机脚本工具

## 快速开始

### 1. 简单关机（推荐新手）

```powershell
# 30 分钟后关机
.\auto-shutdown.ps1 -Minutes 30

# 指定时间关机（晚上 11 点 30 分）
.\auto-shutdown.ps1 -Time "23:30"

# 取消关机计划
.\auto-shutdown.ps1 -Cancel

# 查看关机计划状态
.\auto-shutdown.ps1 -Status
```

### 2. 定时任务（每天自动）

```powershell
# 创建每天午夜关机任务
.\schedule-shutdown.ps1 -Name "DailyShutdown" -Time "00:00"

# 创建一次性任务（2 小时后）
.\schedule-shutdown.ps1 -Name "NapShutdown" -Minutes 120

# 查看所有任务
.\schedule-shutdown.ps1 -List

# 删除任务
.\schedule-shutdown.ps1 -Name "DailyShutdown" -Remove

# 禁用/启用任务
.\schedule-shutdown.ps1 -Name "DailyShutdown" -Disable
.\schedule-shutdown.ps1 -Name "DailyShutdown" -Enable
```

### 3. 智能关机（高级）

```powershell
# 空闲 30 分钟后自动关机
.\smart-shutdown.ps1 -IdleMinutes 30

# 监控特定进程（运行时不关机）
.\smart-shutdown.ps1 -IdleMinutes 60 -WatchProcesses "chrome","code"

# 试运行（不实际关机）
.\smart-shutdown.ps1 -IdleMinutes 30 -DryRun
```

## 脚本说明

### auto-shutdown.ps1 - 基础关机

最简单的关机脚本，适合临时使用。

**功能**:
- ✅ 按分钟倒计时关机
- ✅ 按指定时间关机
- ✅ 取消关机计划
- ✅ 查看关机状态

**示例**:
```powershell
# 1 小时后关机
.\auto-shutdown.ps1 -Minutes 60

# 晚上 11 点关机
.\auto-shutdown.ps1 -Time "23:00"

# 取消
.\auto-shutdown.ps1 -Cancel

# 查看状态
.\auto-shutdown.ps1 -Status
```

**输出示例**:
```
========================================
⏰ 设置自动关机
========================================

关机时间：2026-03-07 23:30:00
剩余时间：00:45:30

🔧 注册 Windows 关机任务...
✅ 关机计划已设置

💡 提示：运行 .\auto-shutdown.ps1 -Cancel 可取消关机
```

---

### schedule-shutdown.ps1 - 定时任务管理

使用 Windows 任务计划程序创建持久化关机任务。

**功能**:
- ✅ 创建每日定时任务
- ✅ 创建一次性任务
- ✅ 查看/删除/启用/禁用任务

**示例**:
```powershell
# 每天午夜关机
.\schedule-shutdown.ps1 -Name "Midnight" -Time "00:00"

# 工作日晚上 11 点关机（需要手动修改触发器）
.\schedule-shutdown.ps1 -Name "Weekday" -Time "23:00"

# 2 小时后关机（一次性）
.\schedule-shutdown.ps1 -Minutes 120

# 查看所有任务
.\schedule-shutdown.ps1 -List
```

**任务列表输出**:
```
========================================
📋 定时关机任务列表
========================================

任务名：Midnight
  状态：Ready
  路径：\OpenClaw\
  触发器：CimClass: MSFT_TaskTrigger
  时间：2026-03-07T00:00:00
```

---

### smart-shutdown.ps1 - 智能关机

监控系统状态，安全时自动关机。

**功能**:
- ✅ 检测用户空闲时间
- ✅ 检测 CPU/内存使用率
- ✅ 检测特定进程
- ✅ 日志记录
- ✅ 试运行模式

**示例**:
```powershell
# 空闲 30 分钟后关机
.\smart-shutdown.ps1 -IdleMinutes 30

# 监控 Chrome 和 VSCode（运行时不关机）
.\smart-shutdown.ps1 -IdleMinutes 60 -WatchProcesses "chrome","code"

# CPU>50% 或内存>80% 时不关机
.\smart-shutdown.ps1 -IdleMinutes 30 -MaxCpuPercent 50 -MaxMemPercent 80

# 试运行（不实际关机）
.\smart-shutdown.ps1 -IdleMinutes 30 -DryRun
```

**监控日志**:
```
========================================
🌙 智能自动关机监控
========================================

配置:
  空闲时间：30 分钟
  检查间隔：5 分钟
  监控进程：无
  CPU 阈值：50%
  内存阈值：80%

按 Ctrl+C 停止监控

[2026-03-07 23:00:00] [INFO] === 检查点：23:00:00 ===
[2026-03-07 23:00:00] [INFO] CPU: 15% | 内存：45%
[2026-03-07 23:00:00] [INFO] 用户不活跃
[2026-03-07 23:00:00] [SUCCESS] 所有条件满足，准备关机
[2026-03-07 23:00:00] [INFO] 发送关机通知...
[2026-03-07 23:00:00] [INFO] 执行关机...
[2026-03-07 23:00:00] [SUCCESS] 关机命令已发送，60 秒后执行
```

---

## 使用场景

### 场景 1：下载完成后关机

```powershell
# 估计下载需要 2 小时
.\auto-shutdown.ps1 -Minutes 120
```

### 场景 2：每天固定时间关机

```powershell
# 每天午夜自动关机
.\schedule-shutdown.ps1 -Name "Daily" -Time "00:00"
```

### 场景 3：挂机下载，完成后智能关机

```powershell
# 监控下载进程，空闲 30 分钟后关机
.\smart-shutdown.ps1 -IdleMinutes 30 -WatchProcesses "aria2c","qbittorrent"
```

### 场景 4：睡前关机

```powershell
# 30 分钟后关机（足够入睡）
.\auto-shutdown.ps1 -Minutes 30
```

### 场景 5：周末挂机任务

```powershell
# 创建周末任务，周日晚上 11 点关机
.\schedule-shutdown.ps1 -Name "Weekend" -Time "23:00"
# 然后手动修改触发器为仅周日
```

---

## 常见问题

### Q: 脚本无法运行？

**A**: 可能是执行策略限制，运行以下命令：
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Q: 如何取消关机？

**A**: 
```powershell
# 方法 1：使用脚本
.\auto-shutdown.ps1 -Cancel

# 方法 2：使用 Windows 命令
shutdown /a
```

### Q: 智能关机如何集成通知？

**A**: 编辑 `smart-shutdown.ps1`，在关机前添加通知：
```powershell
# Telegram 通知
Invoke-RestMethod -Uri "https://api.telegram.org/bot<TOKEN>/sendMessage" `
  -Method POST `
  -Body @{ chat_id = "<CHAT_ID>"; text = "系统将在 60 秒后关机" } | ConvertTo-Json
```

### Q: 任务计划程序提示权限不足？

**A**: 以管理员身份运行 PowerShell：
1. 右键 PowerShell → "以管理员身份运行"
2. 再执行创建任务命令

---

## 文件结构

```
scripts/
├── auto-shutdown.ps1          # 基础关机脚本
├── smart-shutdown.ps1         # 智能关机脚本
├── schedule-shutdown.ps1      # 定时任务管理
├── SHUTDOWN-README.md         # 本文档
├── auto-shutdown-state.json   # 状态文件（自动生成）
└── smart-shutdown.log         # 日志文件（自动生成）
```

---

## 高级用法

### 集成到 OpenClaw Evolver

在 evolver 的 heartbeat 或 cron 任务中添加关机检查：

```powershell
# 在 HEARTBEAT.md 中添加
# 每天 23:00 检查是否需要关机
if ((Get-Date).Hour -eq 23 -and (Get-Date).Minute -eq 0) {
  .\scripts\auto-shutdown.ps1 -Time "23:30"
}
```

### 集成到 Windows 启动

创建快捷方式，开机自动启动智能关机监控：

1. 创建快捷方式：`powershell.exe -File "C:\path\to\smart-shutdown.ps1 -IdleMinutes 60"`
2. 放入启动文件夹：`shell:startup`

### 多条件组合

```powershell
# 工作日晚上 11 点关机
$dayOfWeek = (Get-Date).DayOfWeek
if ($dayOfWeek -eq "Monday" -or $dayOfWeek -eq "Tuesday" -or ...) {
  .\auto-shutdown.ps1 -Time "23:00"
}
```

---

## 安全提示

⚠️ **注意**:
- 关机前请保存所有工作
- 智能关机脚本会检测系统负载，但不会检测未保存的文件
- 建议先使用 `-DryRun` 模式测试
- 重要任务运行时请使用 `-WatchProcesses` 监控

---

## 参考资料

- Windows shutdown 命令：`shutdown /?`
- 任务计划程序：`Get-ScheduledTask -?`
- [Microsoft Docs: Scheduled Tasks](https://docs.microsoft.com/en-us/powershell/module/scheduledtasks/)
