---
name: voice-output
description: 语音输出 - 使用 espeak-ng 进行文本转语音
---

# Voice Output (TTS)

使用 espeak-ng 进行文本转语音输出。

## 使用方法

```bash
# 直接说话
espeak-ng "Hello, I am your AI assistant"

# 保存到文件
espeak-ng -w output.wav "Hello"

# 中文支持
espeak-ng -v zh "你好"
```

## 在 Node.js 中使用

```javascript
const { execSync } = require('child_process');

function speak(text, lang = 'en') {
  execSync(`echo "${text}" | espeak-ng -w /tmp/speech.wav`, { stdio: 'pipe' });
  // 播放音频文件
}
```
