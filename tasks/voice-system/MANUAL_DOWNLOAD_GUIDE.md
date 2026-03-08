# CosyVoice3 模型手动下载指南

**时间**: 2026-03-07 14:34
**模型**: FunAudioLLM/Fun-CosyVoice3-0.5B-2512
**总大小**: ~2.5GB

---

## 📥 下载方式

### 方式 1: 使用浏览器直接下载 (推荐)

1. 打开 HuggingFace 模型页面:
   https://huggingface.co/FunAudioLLM/Fun-CosyVoice3-0.5B-2512

2. 点击 "Files and versions" 标签

3. 下载所有文件到本地目录:
   `E:\TuriX-CUA-Windows\models\Fun-CosyVoice3-0.5B-2512`

### 方式 2: 使用 Git LFS

```bash
# 安装 Git LFS
git lfs install

# 克隆模型仓库
cd E:\TuriX-CUA-Windows\models
git lfs clone https://huggingface.co/FunAudioLLM/Fun-CosyVoice3-0.5B-2512
```

### 方式 3: 使用 Python 脚本 (带重试)

```python
from huggingface_hub import snapshot_download

snapshot_download(
    repo_id="FunAudioLLM/Fun-CosyVoice3-0.5B-2512",
    local_dir=r"E:\TuriX-CUA-Windows\models\Fun-CosyVoice3-0.5B-2512",
    resume_download=True,  # 支持断点续传
    max_retries=5  # 失败重试次数
)
```

### 方式 4: 使用国内镜像 (最快)

**ModelScope (阿里云)**:
```python
from modelscope import snapshot_download

snapshot_download(
    model_dir=r"E:\TuriX-CUA-Windows\models\Fun-CosyVoice3-0.5B-2512",
    model_id="FunAudioLLM/Fun-CosyVoice3-0.5B-2512"
)
```

---

## 📁 必需文件清单

下载完成后，确保以下文件存在:

### 核心权重文件 (必须)
| 文件 | 大小 | 用途 |
|------|------|------|
| `llm.pt` | ~1GB | LLM 语言模型权重 |
| `flow.pt` | ~500MB | Flow 模型权重 |
| `hift.pt` | 83MB | HiFi-GAN 声码器 |
| `campplus.onnx` | 28MB | 说话人嵌入提取 |
| `speech_tokenizer_v3.onnx` | ~50MB | 语音分词器 |
| `flow.decoder.estimator.fp32.onnx` | ~1.24GB | Flow 解码器 |

### 配置文件 (必须)
| 文件 | 用途 |
|------|------|
| `cosyvoice3.yaml` | 模型配置 |
| `config.json` | 模型元信息 |
| `configuration.json` | 配置信息 |

### 子目录 (必须)
| 目录 | 内容 |
|------|------|
| `CosyVoice-BlankEN/` | 空白编码器模型 |
| `asset/` | 示例音频/图片 |

---

## ✅ 验证下载

下载完成后运行验证脚本:

```bash
cd C:\Users\12132\.openclaw\workspace\skills\voice-system-python
py -3.10 verify_cosyvoice_model.py
```

或直接测试:

```bash
py -3.10 test_cosyvoice3.py
```

---

## 🚀 下载后步骤

1. **验证文件完整性**
   ```bash
   # 检查文件大小
   dir "E:\TuriX-CUA-Windows\models\Fun-CosyVoice3-0.5B-2512\*.pt"
   dir "E:\TuriX-CUA-Windows\models\Fun-CosyVoice3-0.5B-2512\*.onnx"
   ```

2. **运行测试**
   ```bash
   cd skills/voice-system-python
   py -3.10 test_cosyvoice3.py
   ```

3. **如果测试失败**
   - 检查缺失文件
   - 重新下载缺失部分
   - 检查路径配置

---

## 💡 提示

1. **使用下载工具**: IDM、迅雷等可以加速下载
2. **断点续传**: HuggingFace 支持断点续传，中断后可继续
3. **网络环境**: 使用代理或国内镜像可显著提升速度
4. **磁盘空间**: 确保 E 盘有至少 3GB 可用空间

---

## 🔗 下载链接

- **HuggingFace**: https://huggingface.co/FunAudioLLM/Fun-CosyVoice3-0.5B-2512
- **ModelScope**: https://modelscope.cn/models/FunAudioLLM/Fun-CosyVoice3-0.5B-2512
- **Demo 页面**: https://funaudiollm.github.io/cosyvoice3/

---

**创建者**: 小黄 🐤
**更新时间**: 2026-03-07 14:34
