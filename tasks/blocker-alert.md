# 阻塞警报 ⚠️

## 问题：Docker Desktop 引擎无法启动

**发现时间**: 2026-03-07 08:58
**严重级别**: 🔴 高 - 阻塞整个语音功能攻坚

### 问题描述

Docker Desktop 已安装但引擎无法启动，导致无法部署 ASR 和 TTS 服务。

- Docker CLI 版本：28.5.1
- 错误：所有 Docker 命令返回 500 Internal Server Error
- 引擎状态：EngineStoppedState

### 已尝试的解决方案

1. 切换 Docker context (default ↔ desktop-linux) - ❌ 无效
2. 多次重启 Docker Desktop - ❌ 无效
3. 等待引擎初始化 (60+ 秒) - ❌ 无效
4. 检查 WSL2 状态 - ❌ WSL 可能存在编码/配置问题

### 需要的干预

**用户需要手动执行以下操作**:

1. 以管理员身份运行 PowerShell:
```powershell
# 启用 WSL2
wsl --install

# 启用 Hyper-V (需要重启)
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All

# 启用容器功能
Enable-WindowsOptionalFeature -Online -FeatureName Containers
```

2. 重启计算机
3. 检查 BIOS 中虚拟化技术是否启用
4. 重新启动 Docker Desktop

### 影响

- ❌ 无法启动 whisper-asr 服务 (端口 8000)
- ❌ 无法启动 qwen3-tts 服务 (端口 8080)
- ❌ 测试组无法进行后续测试
- ⏸️ 整个语音功能攻坚项目阻塞

### 备选方案

如果 Docker 问题无法快速解决，建议:

1. **使用现有 TTS 技能**: `meijutts`, `qwen3-tts` (已安装在技能库)
2. **本地安装 Whisper**: `pip install openai-whisper`
3. **使用云端 API**: 火山引擎语音服务 (已有配置)

### 详细报告

完整环境报告：`tasks/env-setup-report.md`

---

**通知**: 请主 Agent 协调用户解决 Docker 问题，或决定使用备选方案。
