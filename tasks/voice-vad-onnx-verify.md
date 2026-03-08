# Silero VAD ONNX 模型验证报告

**验证时间**: 2026-03-07 09:40
**模型文件**: `skills/vad/models/silero_vad.onnx`

## 1. 输入 Tensors

| 名称 | Shape | Type |
|------|-------|------|
| `input` | `[None, None]` | `tensor(float)` |
| `state` | `[2, None, 128]` | `tensor(float)` |
| `sr` | `[]` (scalar) | `tensor(int64)` |

**说明**:
- `input`: 音频数据，动态 shape，实际测试使用 `(1, 512)` 即 512 采样点
- `state`: RNN 隐藏状态，shape 为 `(2, batch, 128)`，2 表示双向 LSTM 的两层
- `sr`: 采样率，标量值如 `16000`

## 2. 输出 Tensors

| 名称 | Shape | Type |
|------|-------|------|
| `output` | `[None, 1]` | `tensor(float)` |
| `stateN` | `[None, None, None]` | `tensor(float)` |

**说明**:
- `output`: 语音概率，shape `(batch, 1)`，值域 [0, 1]
- `stateN`: 新的隐藏状态，传递给下一次推理

## 3. 推理测试结果

```python
audio = np.zeros((1, 512), dtype=np.float32)  # 512 采样点 @ 16kHz = 32ms
state = np.zeros((2, 1, 128), dtype=np.float32)
sr = np.array([16000], dtype=np.int64)

outputs = session.run(None, {
    'input': audio,
    'state': state,
    'sr': sr
})
```

**结果**:
- 输出数量：2
- 输出 0 (speech prob): `shape=(1, 1)`, `dtype=float32`
- 输出 1 (new state): `shape=(2, 1, 128)`, `dtype=float32`

## 4. 关键发现

1. **State shape 确认**: `[2, 1, 128]` 是正确的
   - 第一维 `2`: 双向 LSTM 的两层
   - 第二维 `1`: batch size
   - 第三维 `128`: 隐藏层维度

2. **音频输入**: 使用 `(1, 512)` shape，即每次处理 512 个采样点
   - @ 16kHz = 32ms 音频片段
   - 符合实时 VAD 的低延迟需求

3. **推理正常**: 模型可以成功加载并执行推理

## 5. 结论

**验证结果**: ✅ **通过**

**可用于开发**: 是

**注意事项**:
- State tensor 需要在多次推理之间传递和更新
- 音频输入必须是 float32 类型，归一化到 [-1, 1] 范围
- 采样率参数必须与模型训练时一致 (16kHz)
