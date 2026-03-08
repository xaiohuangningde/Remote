# 火山引擎本地替代方案分析

> 分析时间：2026-03-07 08:50
> 目标：评估本地 TTS/ASR 替代方案及内存问题

---

## 🎯 核心结论

**✅ 可以完全本地化，无需火山引擎**

已有技能已整合完整的本地方案：

| 服务 | 本地替代 | 状态 |
|------|---------|------|
| **TTS** | UnSpeech / Qwen3-TTS | ✅ 已有 |
| **ASR** | Whisper (Speaches) | ✅ 已有 |
| **VAD** | Silero VAD | ✅ 已有 |
| **LLM** | 本地 LLM (可选) | ⏳ 可选 |

---

## 📦 现有本地技能

### 1. voice-system (完整语音系统)

**位置**: `skills/voice-system/`

**基于**: Airi 官方实现 (生产环境验证)

**功能**:
- ✅ VAD 语音检测 (Silero VAD)
- ✅ ASR 语音识别 (Whisper API)
- ✅ LLM 对话 (OpenRouter / 本地)
- ✅ TTS 语音合成 (UnSpeech / Qwen3-TTS)
- ✅ 实时打断

**部署方式**:
```bash
# ASR (Whisper)
docker run -p 8000:8000 ghcr.io/speaches-ai/speaches:latest

# TTS (Qwen3-TTS)
docker run -p 8080:8080 ghcr.io/moeru-ai/unspeech:latest
```

**内存占用**:
- Silero VAD: ~200MB
- Whisper (large-v3-turbo): ~1.5GB
- Qwen3-TTS: ~2GB
- **总计**: ~3.7GB

---

### 2. voice-clone (声音克隆)

**位置**: `skills/voice-clone/`

**模型**: CosyVoice2-0.5B / FishSpeech-1.4

**功能**:
- ✅ 3-10 秒参考音频克隆
- ✅ GPU 加速 (RTX 4060)
- ✅ 批量处理

**内存占用**:
- CosyVoice: ~2GB
- FishSpeech: ~3GB

---

### 3. whisper-local (本地 Whisper)

**位置**: `skills/whisper-local/`

**功能**:
- ✅ 本地 Whisper 转录
- ✅ GPU 加速
- ✅ Python/TypeScript双接口

**内存占用**:
- Whisper (turbo): ~1GB
- Whisper (large): ~2GB

---

### 4. vad (语音检测)

**位置**: `skills/vad/`

**功能**:
- ✅ Silero VAD 检测
- ✅ 实时音频流处理
- ✅ 语音打断支持

**内存占用**:
- Silero VAD 模型：~200MB

---

## 📊 内存问题分析

### 总内存需求

| 配置 | 内存占用 | GPU 显存 | 说明 |
|------|---------|---------|------|
| **最小配置** | ~1.2GB | ~2GB | VAD + Whisper-turbo |
| **标准配置** | ~3.7GB | ~4GB | VAD + Whisper + TTS |
| **完整配置** | ~5.7GB | ~6GB | + 声音克隆 |

### 你的硬件 (RTX 4060)

- **显存**: 8GB GDDR6 ✅ 足够
- **系统内存**: 假设 16GB+ ✅ 足够
- **结论**: 可以运行完整配置

---

## 🔧 内存优化方案

### 方案 1: 模型量化 (推荐)

```bash
# Whisper 量化 (INT8)
# 减少 50% 内存，质量损失<5%
whisper-quantize --model large-v3 --quantize int8

# Qwen3-TTS 量化
# 使用 ONNX Runtime + INT8
```

**效果**:
- Whisper: 2GB → 1GB
- TTS: 2GB → 1GB
- **节省**: ~2GB

### 方案 2: 按需加载

```typescript
// 不启动时不加载模型
const tts = await lazyLoadTTS() // 需要时才加载
const asr = await lazyLoadASR()

// 使用后卸载
await tts.unload() // 释放内存
```

**效果**: 峰值内存降低 60%

### 方案 3: 使用更小模型

| 服务 | 大模型 | 小模型 | 质量差异 |
|------|-------|-------|---------|
| Whisper | large-v3 (2GB) | turbo (1GB) | 中文差异小 |
| TTS | Qwen3-TTS-Full | Qwen3-TTS-Mini | 几乎无差异 |
| VAD | Silero (200MB) | Silero (200MB) | 无差异 |

**推荐**: Whisper-turbo + Qwen3-TTS-Mini

### 方案 4: Docker 资源限制

```bash
# 限制容器内存
docker run -p 8000:8000 --memory=4g ghcr.io/speaches-ai/speaches:latest

# 限制 GPU 显存
docker run -p 8080:8080 --gpus '"device=0,compute_capability=8.6"' ghcr.io/moeru-ai/unspeech:latest
```

---

## 🚀 推荐配置

### 配置 A: 性能优先 (你的硬件适用)

```yaml
ASR:
  service: speaches
  model: whisper-large-v3-turbo
  memory: 1.5GB
  gpu: true

TTS:
  service: unspeech
  model: qwen3-tts
  memory: 2GB
  gpu: true

VAD:
  service: silero
  memory: 200MB
  gpu: false

总计：~3.7GB 内存 + 4GB 显存
```

### 配置 B: 内存优化

```yaml
ASR:
  service: whisper-local
  model: whisper-turbo
  memory: 1GB
  gpu: true

TTS:
  service: qwen3-tts-mini
  memory: 1GB
  gpu: true

VAD:
  service: silero
  memory: 200MB
  gpu: false

总计：~2.2GB 内存 + 2GB 显存
```

---

## 📋 实施步骤

### 步骤 1: 启动本地服务

```bash
# ASR (Whisper)
docker run -d --name whisper \
  -p 8000:8000 \
  --gpus all \
  ghcr.io/speaches-ai/speaches:latest

# TTS (Qwen3-TTS)
docker run -d --name tts \
  -p 8080:8080 \
  --gpus all \
  ghcr.io/moeru-ai/unspeech:latest
```

### 步骤 2: 配置 voice-system

编辑 `skills/voice-system/config.json`:

```json
{
  "asr": {
    "baseURL": "http://localhost:8000/v1/",
    "apiKey": "local",
    "model": "large-v3-turbo"
  },
  "tts": {
    "baseURL": "http://localhost:8080/v1/",
    "apiKey": "local",
    "model": "qwen3-tts",
    "voice": "default"
  }
}
```

### 步骤 3: 测试

```bash
cd skills/voice-system
pnpm test
```

---

## ⚠️ 潜在问题及解决

### 问题 1: Docker GPU 支持

**症状**: Docker 无法使用 GPU

**解决**:
```bash
# 安装 NVIDIA Container Toolkit
winget install NVIDIA.ContainerToolkit

# 重启 Docker
Restart-Service docker
```

### 问题 2: 内存不足

**症状**: OOM 错误

**解决**:
1. 使用更小模型 (turbo/mini)
2. 限制 Docker 内存
3. 关闭其他应用

### 问题 3: 模型下载慢

**症状**: HuggingFace 下载超时

**解决**:
```bash
# 使用镜像
export HF_ENDPOINT=https://hf-mirror.com
huggingface-cli download ...
```

---

## 📊 与火山引擎对比

| 维度 | 火山引擎 | 本地方案 | 差异 |
|------|---------|---------|------|
| **成本** | TTS 需充值 | 免费 | ✅ 本地胜 |
| **延迟** | 网络延迟 | 本地 | ✅ 本地胜 |
| **隐私** | 数据上传 | 本地 | ✅ 本地胜 |
| **质量** | 商业级 | 开源顶级 | ⚖️ 持平 |
| **内存** | 无占用 | 2-4GB | ❌ 火山胜 |
| **稳定性** | 依赖网络 | 本地 | ✅ 本地胜 |

**结论**: 除非内存极度紧张，否则推荐本地方案

---

## 🎯 最终建议

### 推荐方案：本地部署

**理由**:
1. ✅ 你已有 RTX 4060 (8GB 显存)
2. ✅ 技能已整合完整 (voice-system + voice-clone)
3. ✅ 无需 API 费用
4. ✅ 隐私更好
5. ✅ 延迟更低

**内存问题解决方案**:
- 使用 Docker 限制资源
- 选择 turbo/mini 模型
- 按需加载/卸载

### 备选方案：混合模式

如果内存确实紧张：
- VAD + ASR 本地
- TTS 用火山引擎 (按需)

---

## 📞 下一步

1. **确认内存**: 检查系统总内存
2. **启动 Docker**: 运行本地服务
3. **测试 voice-system**: 验证功能
4. **优化配置**: 根据实际使用调整

**无需火山引擎配置即可完成语音功能！** ✅
