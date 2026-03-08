# Evolver + Agent 团队定时任务配置脚本
# 运行前确保已完成：
# 1. Evolver 安装
# 2. Agent 注册
# 3. Telegram Bot 配置

Write-Host "=== 配置 Evolver + Agent 团队定时任务 ===" -ForegroundColor Cyan

# 1. Scout 每日 AI 日报（每天早上 8 点）
Write-Host "`n[1/4] 配置 Scout 每日 AI 日报..." -ForegroundColor Yellow
openclaw cron add --name "daily-news" --cron "0 8 * * *" --command "openclaw agents run scout --task '搜索今天的 AI 新闻，输出结构化简报'"

# 2. Architect 每日系统巡检（每天下午 2 点）
Write-Host "`n[2/4] 配置 Architect 每日系统巡检..." -ForegroundColor Yellow
openclaw cron add --name "daily-check" --cron "0 14 * * *" --command "openclaw agents run architect --task '系统巡检，输出健康报告'"

# 3. Evolver 进化循环（每天凌晨 2 点）
Write-Host "`n[3/4] 配置 Evolver 进化循环..." -ForegroundColor Yellow
openclaw cron add --name "evolver-loop" --cron "0 2 * * *" --command "node C:/Users/12132/.openclaw/evolver/index.js --loop"

# 4. Captain 每日摘要（每天晚上 8 点）
Write-Host "`n[4/4] 配置 Captain 每日摘要..." -ForegroundColor Yellow
openclaw cron add --name "daily-summary" --cron "0 20 * * *" --command "openclaw agents run captain --task '汇总今天的任务完成情况，输出日报'"

Write-Host "`n=== 配置完成！ ===" -ForegroundColor Green
Write-Host "`n查看已配置的任务：" -ForegroundColor Cyan
Write-Host "  openclaw cron list" -ForegroundColor Gray
Write-Host "`n手动触发任务：" -ForegroundColor Cyan
Write-Host "  openclaw cron run <job-id>" -ForegroundColor Gray
Write-Host "`n禁用/启用任务：" -ForegroundColor Cyan
Write-Host "  openclaw cron disable <job-id>" -ForegroundColor Gray
Write-Host "  openclaw cron enable <job-id>" -ForegroundColor Gray
