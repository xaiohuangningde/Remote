# PyAudio + Asyncio 集成验证报告

**验证时间**: 2026-03-07 09:41
**测试时长**: 5 秒

## 1. 测试结果

**状态**: ✅ **通过**

**关键数据**:
- PyAudio 版本：PortAudio v1246976
- 默认输入设备支持：6 通道
- 5 秒内处理音频块：**155 个**
- 每块大小：512 采样点
- 等效处理速率：~31 块/秒 (实时要求：16000/512 = 31.25 块/秒)

## 2. 技术要点

### 2.1 线程模型

```
PyAudio 回调线程 ──→ asyncio 事件循环
    (C 线程)           (主线程)
```

**关键发现**: PyAudio 回调在独立线程运行，不能直接使用 `asyncio.create_task()`

**正确做法**: 使用 `asyncio.run_coroutine_threadsafe()`

```python
def callback(in_data, frame_count, time_info, status):
    audio = np.frombuffer(in_data, dtype=np.float32)
    asyncio.run_coroutine_threadsafe(
        process_audio(audio),
        loop  # 事件循环引用
    )
    return (None, pyaudio.paContinue)
```

### 2.2 性能分析

| 指标 | 值 | 说明 |
|------|-----|------|
| 采样率 | 16000 Hz | 标准语音采样率 |
| 块大小 | 512 采样 | 32ms 延迟 |
| 理论块率 | 31.25 块/秒 | 16000/512 |
| 实际处理 | 31 块/秒 | 满足实时要求 |

### 2.3 注意事项

1. **Pending Task 警告**: 测试结束时出现 `Task was destroyed but it is pending`
   - 原因：事件循环关闭时，部分异步任务未完成
   - 解决方案：优雅关闭时等待任务完成

2. **线程安全**: 
   - PyAudio 回调是阻塞的，必须快速返回
   - 异步处理必须通过 `run_coroutine_threadsafe` 调度

3. **资源清理**:
   ```python
   stream.stop_stream()
   stream.close()
   p.terminate()
   loop.close()
   ```

## 3. 推荐架构

```python
class AudioProcessor:
    def __init__(self):
        self.loop = asyncio.new_event_loop()
        self.queue = asyncio.Queue()
        
    async def process_queue(self):
        """后台处理音频队列"""
        while True:
            audio = await self.queue.get()
            await self.vad_analyze(audio)
            await self.asr_process(audio)
    
    def audio_callback(self, in_data, frame_count, time_info, status):
        """PyAudio 回调 - 只负责入队"""
        audio = np.frombuffer(in_data, dtype=np.float32)
        asyncio.run_coroutine_threadsafe(
            self.queue.put(audio),
            self.loop
        )
        return (None, pyaudio.paContinue)
```

## 4. 结论

**验证结果**: ✅ **通过**

**可用于开发**: 是

**建议**:
1. 使用队列解耦音频采集和处理
2. 实现优雅关闭逻辑，等待 pending 任务完成
3. 添加错误处理和重试机制
4. 考虑使用 `paFloat32` 格式，与 VAD 模型兼容
