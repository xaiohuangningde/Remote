# TTS 方案状态

**时间**: 2026-03-07 12:40

---

## 方案对比

| 方案 | 状态 | 问题 | 决策 |
|------|------|------|------|
| **Qwen3-TTS** | ✅ 可用 | transformers 版本冲突 | 使用桥接脚本隔离 |
| **CosyVoice 3.0** | ⏸️ 阻塞 | gradio==5.4.0 不存在 | 暂不使用 |

---

## CosyVoice 3.0 问题

**错误**:
```
ERROR: No matching distribution found for gradio==5.4.0
```

**原因**:
- CosyVoice requirements.txt 指定 `gradio==5.4.0`
- PyPI 上 gradio 最新版本是 5.x，但没有 5.4.0
- 这是 CosyVoice 的依赖配置问题

**可用 gradio 版本**:
```
3.x, 4.x, 5.0.0-5.23.1 (最新)
```

**解决方案**:
1. 修改 requirements.txt (可能破坏其他功能)
2. 使用简化版推理 (跳过 gradio)
3. 等待官方修复

**决策**: 暂时使用 Qwen3-TTS，CosyVoice 作为备选

---

## Qwen3-TTS 状态

**模型路径**: `E:\TuriX-CUA-Windows\models\Qwen3-TTS\Qwen\Qwen3-TTS-12Hz-1___7B-CustomVoice`

**依赖问题**:
- 需要 `transformers==4.57.3`
- 当前环境是 4.x 最新版 (不兼容)

**解决方案**: ✅ 已创建桥接脚本
- `src/tts/qwen3_tts_bridge.py`
- 子进程调用独立环境
- 避免依赖冲突

---

## 推荐方案

**当前**: 使用 Qwen3-TTS 桥接

**未来优化**:
1. 创建独立 conda 环境专用于 TTS
2. 或等待 CosyVoice 修复依赖
3. 或手动修改 CosyVoice requirements

---

**记录者**: 小黄 🐤
