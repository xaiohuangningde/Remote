# 模块测试报告

**测试时间**: 2026-03-07 08:55
**执行者**: subagent-2 (测试组)
**测试环境**: Windows 10, Node.js v22.17.1

---

## TTS 测试

| 用例 | 状态 | 耗时 | 输出 |
|------|------|------|------|
| 单句测试 | ❌ | N/A | 配置缺失 |
| 批量测试 | ⏭️ | N/A | 跳过 (配置缺失) |

**问题**: 火山引擎配置为空
- 配置文件：`ai-companion/config/volcengine.json`
- 缺失字段：`accessKeyId`, `accessKeySecret`, `tts.appId`, `tts.accessToken`
- 解决方案：需用户填入火山引擎凭据

**测试脚本状态**: ✅ 脚本逻辑正常，配置检测功能正常工作

---

## ASR 测试

| 用例 | 状态 | 耗时 | 准确率 |
|------|------|------|--------|
| Whisper | ❌ | N/A | N/A |

**问题 1**: Whisper 未安装
```
❌ Whisper 未安装
💡 安装方法：pip install openai-whisper
```

**问题 2**: 火山引擎 ASR 配置缺失
- 配置文件：`ai-companion/config/volcengine.json`
- 缺失字段：`asr.accessToken`

**亮点**: ✅ 测试音频生成成功
- 使用 Windows 系统 TTS 生成测试音频
- 文件位置：`skills/whisper-local/output/test-speech.wav`
- 文件大小：272.33 KB

---

## VAD 测试

| 用例 | 状态 | 说明 |
|------|------|------|
| 模型存在 | ✅ | silero_vad.onnx (已验证) |
| 功能测试 | ⏭️ | 跳过 (无独立测试脚本) |

**VAD 模块状态**:
- ✅ 模型文件存在：`skills/vad/models/silero_vad.onnx`
- ✅ 源代码存在：`skills/vad/src/index.ts`
- ⚠️ 无独立测试脚本 (需创建 `vad.test.js`)

**VAD 实现特性**:
- 基于 Silero VAD 模型 (ONNX Runtime GPU)
- 支持语音开始/结束回调
- 可配置阈值、最小语音/静音长度

---

## 问题记录

### 1. 火山引擎配置缺失
**影响**: TTS 和 ASR 测试无法执行
**配置文件**: `ai-companion/config/volcengine.json`
**需要填写**:
```json
{
  "accessKeyId": "你的 AccessKeyID",
  "accessKeySecret": "你的 AccessKeySecret",
  "tts": {
    "appId": "TTS 应用 ID",
    "accessToken": "TTS 访问令牌"
  },
  "asr": {
    "appId": "6477966522",
    "accessToken": "ASR 访问令牌"
  }
}
```
**获取凭据**: https://console.volcengine.com

### 2. Whisper 未安装
**影响**: 本地 ASR 测试无法执行
**解决方案**:
```bash
pip install openai-whisper
# 或使用 Docker 方案
docker run -d -p 8000:8000 --gpus all ghcr.io/speaches-ai/speaches:latest
```

### 3. VAD 测试脚本缺失
**影响**: VAD 功能无法自动化测试
**建议**: 创建 `skills/vad/test/vad.test.js`

### 4. Docker 服务未启动
**影响**: 本地部署方案无法使用
**需要启动**:
```bash
docker run -d -p 8000:8000 --gpus all --name whisper ghcr.io/speaches-ai/speaches:latest
docker run -d -p 8080:8080 --gpus all --name tts ghcr.io/moeru-ai/unspeech:latest
```

---

## 性能统计

由于配置缺失和环境未就绪，无法获取实际性能数据。

**预估性能** (基于官方数据):
- TTS (火山引擎): ~200-500ms/句
- ASR (Whisper): ~1-3s/句 (本地 GPU)
- VAD (Silero): ~10-50ms/检测周期

---

## 下一步 (给流程组的说明)

### 立即可执行

1. **填写火山引擎配置**
   ```bash
   # 编辑 ai-companion/config/volcengine.json
   # 填入有效的 AccessKey 和 Token
   ```

2. **安装 Whisper 或使用 Docker**
   ```bash
   # 方案 A: 直接安装
   pip install openai-whisper
   
   # 方案 B: Docker (推荐)
   docker run -d -p 8000:8000 --gpus all ghcr.io/speaches-ai/speaches:latest
   ```

3. **创建 VAD 测试脚本**
   ```bash
   # 参考 tts-test.js 结构
   # 创建 skills/vad/test/vad.test.js
   ```

### 环境组任务 (subagent-1)

- [ ] 启动 Docker 服务 (Whisper + TTS)
- [ ] 验证服务可访问性
- [ ] 更新 `tasks/env-setup-report.md`

### 测试组后续任务

- [ ] 环境就绪后重新执行完整测试
- [ ] 创建 VAD 功能测试脚本
- [ ] 测试完整流程 (VAD→ASR→LLM→TTS)

---

## 测试脚本验证结果

| 脚本 | 状态 | 配置检测 | 错误处理 |
|------|------|----------|----------|
| `tts-test.js` | ✅ 可用 | ✅ 正常 | ✅ 友好提示 |
| `asr-test.js` | ✅ 可用 | ✅ 正常 | ✅ 友好提示 |
| `vad.test.js` | ❌ 不存在 | N/A | N/A |

**结论**: 测试脚本框架已就绪，等待环境配置完成后即可执行完整测试。

---

**报告生成时间**: 2026-03-07 08:56
**下次测试**: 环境就绪后重新执行
