# 语音功能测试脚本

## 测试清单

### 1. VAD 测试
- [ ] 模型加载成功
- [ ] 实时检测延迟 < 50ms
- [ ] 误检率 < 5%

### 2. Whisper ASR 测试
- [ ] 模型加载成功
- [ ] 转录准确率 > 90%
- [ ] GPU 推理速度 < 1s (10 秒音频)

### 3. TTS 测试
- [ ] API 连接成功
- [ ] 生成速度 < 2s (100 字)
- [ ] 队列管理正常

### 4. VAD 打断测试
- [ ] TTS 播放中说话能检测
- [ ] 检测到后能暂停

### 5. 完整流程测试
- [ ] 说话 → 转录 → 回复 → 播放
- [ ] 端到端延迟 < 3s

## 环境检查

```bash
# GPU 状态
nvidia-smi

# Python 版本
python --version

# Node 版本
node --version

# 依赖检查
pip list | grep -E "whisper|cosyvoice|fishspeech"
npm list onnxruntime-node
```
