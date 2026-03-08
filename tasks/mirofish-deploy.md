# MiroFish 部署任务

**开始时间**: 2026-03-08 16:00
**目标**: 本地部署 MiroFish 群体智能预测引擎

---

## 部署计划

### 1. 环境准备
- [ ] 创建 Python 3.11 conda 环境
- [ ] 安装 uv (Python 包管理器)
- [ ] 检查 Node.js (✅ 已安装 v22.17.1)

### 2. 代码获取
- [ ] 克隆 MiroFish GitHub 仓库
- [ ] 保存位置：`D:\projects\MiroFish` (D 盘空间充足)

### 3. 配置
- [ ] 复制 .env.example → .env
- [ ] 配置 LLM API (需要用户填入)
- [ ] 配置 Zep API (需要用户填入)

### 4. 安装依赖
- [ ] npm run setup:all (一键安装)
- 或分步：
  - [ ] npm run setup (Node 依赖)
  - [ ] npm run setup:backend (Python 依赖)

### 5. 启动服务
- [ ] npm run dev
- [ ] 验证前端：http://localhost:3000
- [ ] 验证后端：http://localhost:5001

---

## 当前状态

**环境检查**:
- Node.js: ✅ v22.17.1 (需要 18+)
- Python: ✅ v3.11.14 (已创建 mirofish 环境)
- uv: ⚠️ 待安装

**部署进度**:
1. ✅ 创建 Python 3.11 conda 环境
2. ✅ 克隆 MiroFish 代码 → `D:\projects\MiroFish`
3. ✅ 复制 .env.example → .env
4. ⏳ 等待用户填入 API keys (LLM + Zep)
5. ⏳ 安装依赖 (npm run setup:all)
6. ⏳ 启动服务 (npm run dev)

**API 依赖**:
- LLM API: 推荐阿里百炼 qwen-plus (https://bailian.console.aliyun.com/)
- Zep Cloud: https://app.getzep.com/ (每月免费额度)

---

## 注意事项

1. **API 依赖**:
   - LLM API: 推荐阿里百炼 qwen-plus (https://bailian.console.aliyun.com/)
   - Zep Cloud: https://app.getzep.com/ (每月免费额度)

2. **D 盘存储**: 项目将安装到 D 盘，避免 C 盘空间紧张

3. **端口**: 前端 3000 / 后端 5001

---

## 预计耗时

- 环境创建：5 分钟
- 代码克隆：5 分钟
- 依赖安装：15-30 分钟
- 配置启动：5 分钟
- **总计**: ~30-45 分钟
