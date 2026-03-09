# OpenClaw 系统备份脚本
# 备份到 GitHub 私有仓库 + 本地压缩

$ErrorActionPreference = "Stop"
$BackupDate = Get-Date -Format "yyyy-MM-dd"
$BackupRoot = "C:\Users\12132\.openclaw\workspace"
$LocalBackupDir = "D:\backups\openclaw"

Write-Host "📦 OpenClaw 系统备份" -ForegroundColor Cyan
Write-Host "备份日期：$BackupDate"
Write-Host ""

# 1. 创建本地备份目录
Write-Host "📁 创建备份目录..." -ForegroundColor Yellow
if (-not (Test-Path $LocalBackupDir)) {
    New-Item -ItemType Directory -Path $LocalBackupDir -Force | Out-Null
}

# 2. 复制核心文件
Write-Host "📋 复制核心配置文件..." -ForegroundColor Yellow
$CoreFiles = @(
    "AGENTS.md",
    "SOUL.md",
    "USER.md",
    "MEMORY.md",
    "TOOLS.md",
    "HEARTBEAT.md",
    "IDENTITY.md",
    "WORKFLOW.md",
    "BACKUP-2026-03-09.md"
)

foreach ($file in $CoreFiles) {
    $src = Join-Path $BackupRoot $file
    if (Test-Path $src) {
        Copy-Item $src -Destination $LocalBackupDir -Force
        Write-Host "  ✅ $file" -ForegroundColor Green
    }
}

# 3. 复制记忆文件
Write-Host ""
Write-Host "📝 复制记忆文件..." -ForegroundColor Yellow
$MemorySrc = Join-Path $BackupRoot "memory"
$MemoryDst = Join-Path $LocalBackupDir "memory"
if (Test-Path $MemorySrc) {
    New-Item -ItemType Directory -Path $MemoryDst -Force | Out-Null
    Get-ChildItem $MemorySrc -File | ForEach-Object {
        Copy-Item $_.FullName -Destination $MemoryDst -Force
        Write-Host "  ✅ $($_.Name)" -ForegroundColor Green
    }
}

# 4. 复制技能系统
Write-Host ""
Write-Host "🧩 复制技能系统..." -ForegroundColor Yellow
$SkillsToBackup = @(
    "symphony-core",
    "symphony-github",
    "symphony-workspace",
    "stream-queue",
    "duckdb-memory",
    "volcano-voice",
    "qwen3-tts",
    "voice-system-python",
    "todo-manager",
    "api-cache",
    "memory-search-queue",
    "subagent-queue",
    "voice-clone",
    "whisper-local",
    "vad",
    "realtime-voice-chat"
)

$SkillsSrc = Join-Path $BackupRoot "skills"
$SkillsDst = Join-Path $LocalBackupDir "skills"
New-Item -ItemType Directory -Path $SkillsDst -Force | Out-Null

foreach ($skill in $SkillsToBackup) {
    $src = Join-Path $SkillsSrc $skill
    if (Test-Path $src) {
        Copy-Item $src -Destination $SkillsDst -Recurse -Force
        Write-Host "  ✅ $skill" -ForegroundColor Green
    }
}

# 5. 复制文档
Write-Host ""
Write-Host "📚 复制文档..." -ForegroundColor Yellow
$DocsToBackup = @(
    "docs/SYMPHONY-DESIGN.md",
    "tasks"
)

foreach ($doc in $DocsToBackup) {
    $src = Join-Path $BackupRoot $doc
    if (Test-Path $src) {
        $dst = Join-Path $LocalBackupDir $doc
        $dstDir = Split-Path $dst -Parent
        if (-not (Test-Path $dstDir)) {
            New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
        }
        Copy-Item $src -Destination $dst -Recurse -Force
        Write-Host "  ✅ $doc" -ForegroundColor Green
    }
}

# 6. 创建压缩包
Write-Host ""
Write-Host "🗜️ 创建压缩包..." -ForegroundColor Yellow
$ZipFile = "D:\backups\openclaw-backup-$BackupDate.zip"
Compress-Archive -Path "$LocalBackupDir\*" -DestinationPath $ZipFile -Force
Write-Host "  ✅ $ZipFile" -ForegroundColor Green

# 7. 获取文件大小
$ZipSize = (Get-Item $ZipFile).Length / 1MB
Write-Host "  压缩包大小：$([math]::Round($ZipSize, 2)) MB" -ForegroundColor Cyan

# 8. Git 备份（如果已配置）
Write-Host ""
Write-Host "🔗 准备 Git 备份..." -ForegroundColor Yellow
Set-Location $LocalBackupDir

if (Test-Path ".git") {
    Write-Host "  Git 仓库已存在" -ForegroundColor Yellow
} else {
    Write-Host "  初始化 Git 仓库..." -ForegroundColor Cyan
    git init
    git remote add origin https://github.com/xiaoxiaohuang/openclaw-backup.git 2>$null
}

# 添加所有文件
git add .
$changes = git status --porcelain

if ($changes) {
    Write-Host "  提交更改..." -ForegroundColor Cyan
    git commit -m "Backup $BackupDate - xiaoxiaohuang system snapshot"
    
    # 询问是否推送
    Write-Host ""
    Write-Host "⚠️  需要手动推送到 GitHub:" -ForegroundColor Yellow
    Write-Host "  cd $LocalBackupDir"
    Write-Host "  git push -u origin main"
} else {
    Write-Host "  无更改" -ForegroundColor Gray
}

# 9. 生成备份报告
Write-Host ""
Write-Host "📊 生成备份报告..." -ForegroundColor Yellow
$Report = @"
# 备份报告

**备份日期**: $BackupDate
**备份者**: xiaoxiaohuang
**系统版本**: OpenClaw 2026.3.7

## 备份内容

- 核心配置：$(Get-ChildItem $LocalBackupDir -File -Filter *.md | Measure-Object).Count 个文件
- 记忆文件：$(Get-ChildItem $LocalBackupDir\memory -File 2>$null | Measure-Object).Count 个文件
- 技能系统：$(Get-ChildItem $LocalBackupDir\skills -Directory 2>$null | Measure-Object).Count 个技能
- 文档：$(Get-ChildItem $LocalBackupDir\docs -File 2>$null | Measure-Object).Count 个文件

## 存储位置

1. **本地备份**: $LocalBackupDir
2. **压缩包**: $ZipFile ($([math]::Round($ZipSize, 2)) MB)
3. **Git 仓库**: $LocalBackupDir (待推送)

## 恢复方法

\`\`\`bash
# 从压缩包恢复
Expand-Archive -Path "$ZipFile" -DestinationPath "C:\Users\12132\.openclaw\workspace" -Force

# 从 Git 恢复
git clone https://github.com/xiaoxiaohuang/openclaw-backup.git
\`\`\`

## 验证清单

- [ ] 核心配置文件完整
- [ ] 记忆文件完整
- [ ] 技能系统完整
- [ ] 压缩包可解压
- [ ] Git 推送成功

---
**备份完成时间**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@

$ReportFile = Join-Path $LocalBackupDir "BACKUP-REPORT.md"
$Report | Out-File -FilePath $ReportFile -Encoding utf8
Write-Host "  ✅ $ReportFile" -ForegroundColor Green

# 10. 完成
Write-Host ""
Write-Host "🎉 备份完成！" -ForegroundColor Green
Write-Host ""
Write-Host "📍 备份位置:" -ForegroundColor Cyan
Write-Host "  本地：$LocalBackupDir"
Write-Host "  压缩：$ZipFile"
Write-Host ""
Write-Host "☁️  云端备份:" -ForegroundColor Cyan
Write-Host "  请运行以下命令推送到 GitHub:"
Write-Host "  cd $LocalBackupDir"
Write-Host "  git push -u origin main"
Write-Host ""
