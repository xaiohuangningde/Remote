# 语音功能测试计划

> 创建时间：2026-03-07  
> 负责人：li  
> 状态：待执行

## 📋 测试概述

本测试计划覆盖 OpenClaw 语音功能的三个核心模块：

| 模块 | 测试脚本 | 功能 |
|------|----------|------|
| **TTS** | `skills/volcano-voice/test/tts-test.js` | 语音合成测试 |
| **ASR** | `skills/whisper-local/test/asr-test.js` | 语音识别测试 |
| **完整流程** | `skills/realtime-voice-chat/test/flow-test.js` | VAD→ASR→LLM→TTS 端到端测试 |

---

## 🎯 测试目标

1. **验证配置加载** - 确保能正确读取和验证火山引擎配置
2. **测试单句功能** - 验证每个模块的基本功能正常
3. **测试批量处理** - 验证队列管理和批量处理能力
4. **测试错误处理** - 验证配置缺失、API 错误等异常情况的处理
5. **性能基准** - 记录各环节的耗时，建立性能基准

---

## 📦 前置准备

### 1. 环境检查

```bash
# 检查 Node.js 版本
node --version  # 需要 v18+

# 检查 Python (用于 Whisper)
python --version  # 需要 3.8+

# 检查 Whisper 安装
whisper --version  # 可选，用于本地 ASR
```

### 2. 配置文件

确保 `ai-companion/config/volcengine.json` 存在并填写必要的凭据：

```json
{
  "accessKeyId": "YOUR_ACCESS_KEY_ID",
  "accessKeySecret": "YOUR_ACCESS_KEY_SECRET",
  "tts": {
    "appId": "YOUR_TTS_APP_ID",
    "accessToken": "YOUR_TTS_ACCESS_TOKEN"
  },
  "asr": {
    "appId": "YOUR_ASR_APP_ID",
    "accessToken": "YOUR_ASR_ACCESS_TOKEN"
  },
  "llm": {
    "endpointId": "YOUR_LLM_ENDPOINT_ID",
    "apiKey": "YOUR_LLM_API_KEY"
  }
}
```

**获取凭据**: https://console.volcengine.com

### 3. 安装依赖

```bash
# 安装 Whisper (可选，用于本地 ASR)
pip install openai-whisper

# 或使用 GPU 加速版本
pip install openai-whisper[gpu]
```

---

## 🧪 测试用例

### 测试 1: TTS 语音合成

**脚本**: `skills/volcano-voice/test/tts-test.js`

#### 测试模式

| 模式 | 命令 | 说明 |
|------|------|------|
| 单句测试 | `node tts-test.js single` | 测试单句 TTS 合成 |
| 批量测试 | `node tts-test.js batch` | 测试批量 TTS 请求 |
| 队列测试 | `node tts-test.js queue` | 测试队列管理功能 |
| 配置测试 | `node tts-test.js config` | 测试配置缺失处理 |
| 全部测试 | `node tts-test.js all` | 运行所有测试 |

#### 预期结果

- ✅ 单句 TTS 成功合成并保存音频文件
- ✅ 批量 TTS 正确处理所有请求
- ✅ 队列管理功能正常（添加、处理、清空）
- ✅ 配置缺失时给出友好提示

#### 输出文件

- 位置：`skills/volcano-voice/test/output/`
- 格式：WAV 音频文件

---

### 测试 2: ASR 语音识别

**脚本**: `skills/whisper-local/test/asr-test.js`

#### 测试模式

| 模式 | 命令 | 说明 |
|------|------|------|
| Whisper 测试 | `node asr-test.js whisper` | 测试本地 Whisper ASR |
| 火山测试 | `node asr-test.js volcano` | 测试火山引擎 ASR |
| 音频生成 | `node asr-test.js generate` | 生成测试音频文件 |
| 配置测试 | `node asr-test.js config` | 测试配置缺失处理 |
| 全部测试 | `node asr-test.js all` | 运行所有测试 |

#### 预期结果

- ✅ 成功生成测试音频文件
- ✅ Whisper 正确转录音频内容
- ✅ 火山引擎 ASR 返回识别结果
- ✅ 配置缺失时给出友好提示

#### 输出文件

- 位置：`skills/whisper-local/test/output/`
- 格式：WAV 音频文件、TXT 转录文本

---

### 测试 3: 完整流程测试

**脚本**: `skills/realtime-voice-chat/test/flow-test.js`

#### 测试模式

| 模式 | 命令 | 说明 |
|------|------|------|
| 模拟模式 | `node flow-test.js mock` | 使用模拟数据测试流程 |
| 真实模式 | `node flow-test.js real` | 使用真实 API 测试流程 |
| 多轮对话 | `node flow-test.js multi` | 测试多轮对话场景 |
| 配置测试 | `node flow-test.js config` | 测试配置缺失处理 |
| 全部测试 | `node flow-test.js all` | 运行所有测试 |

#### 流程步骤

```
1. VAD (语音活动检测)
   ↓
2. ASR (语音识别)
   ↓
3. LLM (大模型回复生成)
   ↓
4. TTS (语音合成)
```

#### 预期结果

- ✅ VAD 正确检测语音开始和结束
- ✅ ASR 准确识别语音内容
- ✅ LLM 生成合理的回复
- ✅ TTS 合成自然的语音
- ✅ 各环节衔接流畅
- ✅ 性能统计报告显示各环节耗时

#### 性能基准 (预期)

| 环节 | 预期耗时 | 说明 |
|------|----------|------|
| VAD | < 100ms | 实时检测 |
| ASR | 500-2000ms | 取决于音频长度 |
| LLM | 300-1000ms | 取决于回复长度 |
| TTS | 200-800ms | 取决于文本长度 |
| **总计** | **< 5s** | 完整流程 |

---

## 📊 测试报告模板

### 执行摘要

```
测试日期：YYYY-MM-DD HH:mm
测试人员：xxx
测试模式：mock/real
配置状态：完整/部分缺失

通过率：X/Y (Z%)
```

### 详细结果

#### TTS 测试

| 用例 | 状态 | 耗时 | 备注 |
|------|------|------|------|
| 单句测试 | ✅/❌ | xxx ms | |
| 批量测试 | ✅/❌ | xxx ms | |
| 队列测试 | ✅/❌ | xxx ms | |
| 配置测试 | ✅/❌ | xxx ms | |

#### ASR 测试

| 用例 | 状态 | 耗时 | 备注 |
|------|------|------|------|
| Whisper 测试 | ✅/❌ | xxx ms | |
| 火山测试 | ✅/❌ | xxx ms | |
| 音频生成 | ✅/❌ | xxx ms | |
| 配置测试 | ✅/❌ | xxx ms | |

#### 完整流程测试

| 用例 | 状态 | 总耗时 | 备注 |
|------|------|--------|------|
| 模拟模式 | ✅/❌ | xxx ms | |
| 多轮对话 | ✅/❌ | xxx ms | |
| 配置测试 | ✅/❌ | xxx ms | |

### 问题记录

| 问题 ID | 描述 | 严重程度 | 状态 |
|---------|------|----------|------|
| ISSUE-001 | xxx | High/Medium/Low | Open/Closed |

---

## 🔧 故障排查

### 常见问题

#### 1. 配置文件不存在

**错误**: `❌ 配置文件不存在`

**解决**:
```bash
# 创建配置文件
mkdir -p ai-companion/config
# 编辑 ai-companion/config/volcengine.json
```

#### 2. Whisper 未安装

**错误**: `❌ Whisper 未安装`

**解决**:
```bash
pip install openai-whisper
```

#### 3. API 认证失败

**错误**: `API 错误：401 Unauthorized`

**解决**:
- 检查 `accessKeyId` 和 `accessKeySecret` 是否正确
- 确认火山引擎账号已开通相应服务
- 检查 accessToken 是否过期

#### 4. 音频文件生成失败

**错误**: `❌ 生成测试音频失败`

**解决**:
- Windows: 确保 PowerShell 可以访问 System.Speech
- 或手动准备一个 WAV 测试文件

---

## 📝 测试执行记录

### 第一次测试 (2026-03-07)

**执行者**: li  
**模式**: mock  
**结果**: 待执行

```bash
# 执行命令
node skills/volcano-voice/test/tts-test.js all
node skills/whisper-local/test/asr-test.js all
node skills/realtime-voice-chat/test/flow-test.js all
```

**备注**: 
- 首次测试建议使用 mock 模式
- 确保配置正确后再测试 real 模式

---

## 🎯 后续改进

### 短期 (1 周)

- [ ] 添加真实的 VAD 检测实现
- [ ] 完善错误处理和重试机制
- [ ] 添加测试覆盖率报告

### 中期 (1 月)

- [ ] 集成到 CI/CD 流程
- [ ] 添加性能回归测试
- [ ] 支持更多语音模型和音色

### 长期

- [ ] 自动化测试平台
- [ ] 实时性能监控
- [ ] A/B 测试框架

---

## 📚 相关文档

- [火山引擎 TTS 文档](https://www.volcengine.com/docs/6561/79817)
- [火山引擎 ASR 文档](https://www.volcengine.com/docs/6561/79818)
- [Whisper 官方文档](https://github.com/openai/whisper)
- [OpenClaw 语音系统技能](../../voice-system/SKILL.md)

---

**最后更新**: 2026-03-07
