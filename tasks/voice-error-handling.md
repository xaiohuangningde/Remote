# 语音系统错误处理与降级方案

**制定时间**: 2026-03-07 09:43
**基于验证结果**: ONNX ✅ | PyAudio+Asyncio ✅ | OpenClaw API ⚠️

## 1. 错误场景与降级方案

| 错误场景 | 触发条件 | 降级方案 | 用户感知 |
|---------|---------|---------|---------|
| **OpenClaw 不可用** | CLI 返回非 0 / RPC 连接失败 | 本地简单回复 + 日志 | "离线模式，功能受限" |
| **Whisper ASR 失败** | 超时/模型错误/音频格式错误 | 返回空文本 + 重试 (3 次) | 无语音输入 |
| **TTS 失败** | 服务不可用/合成错误 | 文字输出到控制台/日志 | 文字代替语音 |
| **VAD 异常** | ONNX 推理错误/状态异常 | 重置 VAD 状态 + 使用固定阈值 | 可能误检测 |
| **PyAudio 设备错误** | 无麦克风/设备被占用 | 使用文件输入模式 | 需要录音文件 |
| **网络超时** | LLM API 超时 | 本地缓存回复/简单响应 | 回复延迟或简化 |

## 2. 详细实现方案

### 2.1 OpenClaw 不可用

```python
class OpenClawClient:
    def __init__(self):
        self.available = True
        self.last_error = None
        self.fallback_mode = False
    
    async def chat(self, message: str) -> str:
        if self.fallback_mode:
            return self._fallback_response(message)
        
        try:
            result = await self._call_agent(message)
            self.available = True
            return result
        except Exception as e:
            self.last_error = e
            self.fallback_mode = True
            logger.warning(f"OpenClaw 不可用，切换到降级模式：{e}")
            return self._fallback_response(message)
    
    def _fallback_response(self, message: str) -> str:
        """本地简单回复"""
        # 简单的关键词匹配回复
        if "你好" in message or "hello" in message:
            return "你好！我现在处于离线模式，功能受限。"
        elif "再见" in message or "bye" in message:
            return "再见！"
        else:
            return "我现在无法连接到 OpenClaw，请稍后再试。"
```

### 2.2 Whisper ASR 失败

```python
class WhisperASR:
    def __init__(self, max_retries=3):
        self.max_retries = max_retries
    
    async def transcribe(self, audio: np.ndarray) -> str:
        for attempt in range(self.max_retries):
            try:
                return await self._transcribe_once(audio)
            except Exception as e:
                logger.warning(f"Whisper 转录失败 (尝试 {attempt+1}/{self.max_retries}): {e}")
                if attempt == self.max_retries - 1:
                    logger.error("Whisper 转录最终失败")
                    return ""  # 返回空文本
                await asyncio.sleep(0.5 * (attempt + 1))  # 指数退避
        
        return ""
    
    async def _transcribe_once(self, audio: np.ndarray) -> str:
        # 实际转录逻辑
        pass
```

### 2.3 TTS 失败

```python
class TTSService:
    def __init__(self):
        self.text_fallback = True
    
    async def synthesize(self, text: str) -> Optional[bytes]:
        try:
            audio_data = await self._synthesize_audio(text)
            return audio_data
        except Exception as e:
            logger.error(f"TTS 合成失败：{e}")
            if self.text_fallback:
                # 文字输出
                print(f"[TTS 失败] 文字内容：{text}")
                return None
            raise
    
    def speak_or_print(self, text: str):
        """自动降级：语音失败则打印文字"""
        audio = asyncio.run(self.synthesize(text))
        if audio:
            self._play_audio(audio)
        else:
            print(text)
```

### 2.4 VAD 异常

```python
class SileroVAD:
    def __init__(self, model_path: str):
        self.session = ort.InferenceSession(model_path)
        self.state = np.zeros((2, 1, 128), dtype=np.float32)
        self.threshold = 0.5
        self.error_count = 0
        self.max_errors = 5
    
    def detect_speech(self, audio: np.ndarray) -> bool:
        try:
            outputs = self.session.run(None, {
                'input': audio,
                'state': self.state,
                'sr': np.array([16000], dtype=np.int64)
            })
            
            # 更新状态
            self.state = outputs[1]
            speech_prob = outputs[0][0, 0]
            
            # 重置错误计数
            self.error_count = 0
            
            return speech_prob > self.threshold
            
        except Exception as e:
            self.error_count += 1
            logger.warning(f"VAD 推理错误 ({self.error_count}): {e}")
            
            if self.error_count >= self.max_errors:
                logger.error("VAD 连续错误，重置状态")
                self.reset_state()
            
            # 降级：使用固定阈值
            return False
    
    def reset_state(self):
        """重置 VAD 状态"""
        self.state = np.zeros((2, 1, 128), dtype=np.float32)
        self.error_count = 0
```

### 2.5 PyAudio 设备错误

```python
class AudioInput:
    def __init__(self, use_file_fallback=True):
        self.use_file_fallback = use_file_fallback
        self.file_mode = False
        self.file_path = None
    
    def start_capture(self) -> bool:
        try:
            self.p = pyaudio.PyAudio()
            self.stream = self.p.open(
                format=pyaudio.paFloat32,
                channels=1,
                rate=16000,
                input=True,
                frames_per_buffer=512
            )
            return True
        except Exception as e:
            logger.error(f"PyAudio 启动失败：{e}")
            
            if self.use_file_fallback:
                logger.warning("切换到文件输入模式")
                self.file_mode = True
                return True
            return False
    
    def read_audio(self) -> np.ndarray:
        if self.file_mode:
            return self._read_from_file()
        else:
            return self._read_from_stream()
```

## 3. 错误监控与恢复

### 3.1 健康检查

```python
class HealthMonitor:
    def __init__(self):
        self.error_counts = defaultdict(int)
        self.last_success = {}
    
    def record_success(self, component: str):
        self.last_success[component] = time.time()
        self.error_counts[component] = 0
    
    def record_error(self, component: str, error: Exception):
        self.error_counts[component] += 1
        logger.warning(f"{component} 错误计数：{self.error_counts[component]}")
        
        # 自动恢复尝试
        if self.error_counts[component] >= 10:
            logger.critical(f"{component} 连续错误，尝试自动恢复")
            asyncio.create_task(self._auto_recovery(component))
    
    async def _auto_recovery(self, component: str):
        """自动恢复逻辑"""
        if component == "vad":
            await self._reset_vad()
        elif component == "asr":
            await self._restart_asr()
        elif component == "tts":
            await self._switch_tts_provider()
```

### 3.2 降级状态机

```
正常模式 ──→ 降级模式 ──→ 恢复模式
   ↑            │            │
   │            ↓            ↓
   └────────  错误消除    手动触发
```

## 4. 日志与调试

```python
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[
        logging.FileHandler('voice_system.log'),
        logging.StreamHandler()
    ]
)

# 关键事件日志
logger.info("VAD 初始化成功")
logger.warning("Whisper 转录超时，重试中...")
logger.error("TTS 服务不可用，切换到文字输出")
logger.critical("OpenClaw 连接失败，进入离线模式")
```

## 5. 配置示例

```yaml
# config/voice_config.yaml
error_handling:
  max_retries: 3
  retry_delay_ms: 500
  
  vad:
    threshold: 0.5
    max_errors_before_reset: 5
    
  asr:
    timeout_seconds: 10
    model: "whisper-base"
    
  tts:
    fallback_to_text: true
    provider: "volcengine"
    
  openclaw:
    cli_path: "openclaw"
    timeout_seconds: 30
    fallback_mode: true
```

## 6. 测试用例

```python
async def test_error_handling():
    """测试错误处理"""
    
    # 测试 1: OpenClaw 不可用
    with patch('openclaw_cli', side_effect=Exception("Connection refused")):
        response = await client.chat("你好")
        assert "离线模式" in response
    
    # 测试 2: Whisper 失败
    with patch('whisper.transcribe', side_effect=TimeoutError()):
        text = await asr.transcribe(audio)
        assert text == ""
    
    # 测试 3: TTS 失败
    with patch('tts.synthesize', side_effect=Exception()):
        result = await tts.speak_or_print("测试")
        # 应该打印文字
```

## 7. 总结

**设计原则**:
1. **优雅降级**: 每个组件都有后备方案
2. **自动恢复**: 错误计数触发自动恢复
3. **用户透明**: 尽量不让用户感知错误
4. **日志完整**: 所有错误都有详细日志

**实现优先级**:
1. ✅ VAD 异常处理 (高优先级 - 实时性要求)
2. ✅ ASR 失败重试 (高优先级 - 核心功能)
3. ✅ TTS 文字降级 (中优先级 - 用户体验)
4. ✅ OpenClaw 离线模式 (中优先级 - 依赖外部)
5. ⏳ PyAudio 文件模式 (低优先级 - 特殊情况)
