# 配置更新报告

**时间**: 2026-03-07 13:30
**操作者**: 小黄 (自主执行)

---

## ✅ 已完成的配置修改

### 1. VAD 阈值调整 (低音量优化)

**文件**: `src/vad/silero_vad.py`, `src/core.py`

**修改前**:
```python
speech_threshold: float = 0.3
exit_threshold: float = 0.1
```

**修改后**:
```python
speech_threshold: float = 0.005  # 降低 60 倍适应低音量麦克风
exit_threshold: float = 0.001    # 降低 100 倍
```

**原因**: 麦克风音量测试显示最大仅 0.0128，原阈值 0.3 无法触发

---

### 2. CosyVoice 依赖修复

**文件**: `models/CosyVoice/requirements.txt`

**修改前**:
```
gradio==5.4.0
```

**修改后**:
```
gradio>=4.0.0
```

**已安装**: gradio==4.44.1

**原因**: 
- gradio 5.4.0 不存在
- gradio 5.x 需要 Python 3.10+
- 当前 Python 3.9.13

---

## 📊 当前状态

| 组件 | 状态 | 配置 |
|------|------|------|
| VAD (Silero) | ✅ 优化 | 阈值 0.005/0.001 |
| CosyVoice | ✅ 依赖修复 | gradio 4.44.1 |
| Qwen3-TTS | ✅ 桥接 | 子进程隔离 |

---

## 🧪 下一步测试

1. 测试 VAD 低音量检测
2. 测试 CosyVoice 推理
3. 端到端测试

---

**记录者**: 小黄 🐤
