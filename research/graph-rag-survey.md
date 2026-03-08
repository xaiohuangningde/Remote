# Graph RAG 开源项目调研报告

**调研日期**: 2026-03-08  
**调研目标**: 找出 3-5 个成熟的 Graph RAG 实现方案，评估是否适合封装为 OpenClaw skill

---

## 1. Microsoft GraphRAG ⭐⭐⭐⭐⭐

### 基本信息
- **GitHub 地址**: https://github.com/microsoft/graphrag
- **Stars**: 33.8k+
- **语言**: Python 97.8%
- **License**: MIT
- **维护状态**: 活跃 (2 天前更新)

### 主要功能特点
- **知识图谱构建**: 从非结构化文本中提取结构化数据
- **模块化设计**: 支持自定义 pipeline 和 transformation
- **Prompt 调优**: 提供详细的 Prompt Tuning 指南
- **社区支持**: 活跃的 GitHub Discussions
- **文档完善**: 官方文档、博客、Arxiv 论文

### 本地运行支持
- ✅ 支持本地运行
- 需要配置 LLM API (OpenAI/Azure)
- 提供 Docker 部署方案
- 命令行工具支持

### 依赖复杂度
- **中等偏高**
- 核心依赖: Python 3.10+, LLM API
- 可选依赖: Neo4j (图存储), Azure services
- 索引操作可能较昂贵 (需阅读文档了解成本)

### OpenClaw Skill 适配性
- **适合度**: ⭐⭐⭐⭐
- **优势**: 
  - 最成熟的实现，社区认可度高
  - 文档完善，易于集成
  - 模块化设计便于封装
- **挑战**:
  - 依赖较多，安装复杂度高
  - 索引成本高，需要优化策略
  - 需要处理 API key 配置

---

## 2. LightRAG (HKUDS) ⭐⭐⭐⭐⭐

### 基本信息
- **GitHub 地址**: https://github.com/HKUDS/LightRAG
- **Stars**: 29.1k+
- **Forks**: 4.2k
- **语言**: Python
- **License**: MIT
- **维护状态**: 非常活跃 (昨天更新)

### 主要功能特点
- **简单快速**: 专注于简化和加速 RAG 流程
- **多模态支持**: 集成 RAG-Anything，支持文本/图像/表格/公式
- **存储灵活**: 支持 Neo4j、MongoDB、PostgreSQL、Milvus
- **WebUI**: 提供直观的 Web 界面进行文档索引和 KG 探索
- **Ollama 兼容**: 模拟 Ollama 聊天模型接口
- **高级功能**:
  - Reranker 支持 (默认查询模式)
  - 文档删除 + 自动 KG 重建
  - Citation 功能
  - RAGAS 评估集成
  - Langfuse 追踪

### 本地运行支持
- ✅ 完全支持本地运行
- 支持 Ollama 本地模型
- 提供 Docker 和 Docker Compose 部署
- 离线部署指南 (air-gapped environments)

### 依赖复杂度
- **中等**
- 推荐使用 `uv` 进行包管理 (更快更可靠)
- 核心依赖: Python, LLM (支持 OpenAI/Ollama)
- 可选依赖: Neo4j, MongoDB, PostgreSQL, Milvus
- 前端需要 `bun` 构建

### OpenClaw Skill 适配性
- **适合度**: ⭐⭐⭐⭐⭐
- **优势**:
  - 代码简洁，易于理解和封装
  - 支持本地模型 (Ollama)，降低 API 依赖
  - 提供 WebUI 和 API 服务器
  - 活跃的社区和频繁的更新
  - 离线部署支持
- **挑战**:
  - 需要处理多种存储后端
  - 前端构建需要 bun

---

## 3. nano-graphrag ⭐⭐⭐⭐

### 基本信息
- **GitHub 地址**: https://github.com/gusye1234/nano-graphrag
- **Stars**: 3.7k+
- **语言**: Python
- **License**: MIT
- **维护状态**: 活跃 (1 月 27 日更新)

### 主要功能特点
- **轻量级**: 核心代码仅约 1100 行
- **易于黑客**: 设计简洁，易于阅读和修改
- **异步支持**: 完整的 async/await 支持
- **类型安全**:  fully typed
- **多后端支持**:
  - LLM: OpenAI, Amazon Bedrock, DeepSeek, Ollama
  - Embedding: OpenAI, Sentence-transformers
  - Vector DB: nano-vectordb, hnswlib, milvus-lite, faiss
  - Graph Storage: networkx, neo4j
- **增量插入**: 支持 batch insert 和 incremental insert

### 本地运行支持
- ✅ 完全支持本地运行
- 支持 Ollama + transformers (无需 API key)
- 支持本地向量数据库 (faiss, hnswlib)
- 配置简单，几行代码即可启动

### 依赖复杂度
- **低**
- 核心依赖极少
- 可按需选择组件
- 支持最小化部署 (仅使用本地模型)

### OpenClaw Skill 适配性
- **适合度**: ⭐⭐⭐⭐⭐
- **优势**:
  - 代码量小，易于理解和维护
  - 高度可定制，易于扩展
  - 支持完全本地运行 (无 API 依赖)
  - 异步支持适合并发场景
  - 安装简单，依赖少
- **挑战**:
  - 功能相对基础 (未实现 covariates)
  - global search 实现与原版不同

---

## 4. HelixDB ⭐⭐⭐

### 基本信息
- **GitHub 地址**: https://github.com/HelixDB/helix-db
- **Stars**: 3.9k+
- **语言**: Rust 100%
- **License**: AGPL-3.0
- **维护状态**: 非常活跃 (2 天前更新)

### 主要功能特点
- **图 + 向量数据库**: 从头构建的 graph-vector 数据库
- **一体化平台**: 单个平台包含 AI 应用所需的所有组件
- **内置 MCP 支持**: 支持 AI agent 发现数据
- **内置 Embeddings**: 无需外部服务
- **RAG 支持**: 内置向量和图搜索
- **安全优先**: 默认私有，可配置访问控制
- **类型安全查询**: 100% 类型安全

### 本地运行支持
- ✅ 支持本地运行
- Rust 编译，性能优秀
- 提供 Docker 镜像
- 支持 Linux/macOS/Windows

### 依赖复杂度
- **中等**
- 需要 Rust 工具链 (如果用源码编译)
- 提供预编译二进制
- 配置相对简单

### OpenClaw Skill 适配性
- **适合度**: ⭐⭐⭐
- **优势**:
  - 高性能 (Rust 实现)
  - 一体化解决方案
  - 内置 MCP 支持 (适合 agent 场景)
- **挑战**:
  - Rust 生态与 Python 技能封装有隔阂
  - AGPL 许可证可能限制商业使用
  - 相对较新，社区较小

---

## 5. qKnow (千 tong 科技) ⭐⭐⭐

### 基本信息
- **GitHub 地址**: https://github.com/qiantongtech/qKnow
- **Stars**: 180
- **语言**: Java 97.5%
- **License**: Apache-2.0
- **维护状态**: 一般 (24 天前更新)

### 主要功能特点
- **知识图谱平台**: 围绕 Knowledge Graph 构建
- **知识提取**: 从非结构化数据提取知识
- **知识融合**: 多源知识整合
- **图可视化**: 支持图谱可视化
- **多模型支持**: 支持多种 LLM 和 Embedding 模型
- **REST API**: 提供完整的 RESTful API

### 本地运行支持
- ✅ 支持本地运行
- Java 应用，跨平台
- 提供 Docker 部署
- 需要配置数据库 (Neo4j/MySQL)

### 依赖复杂度
- **偏高**
- Java 生态依赖较多
- 需要数据库支持
- 配置相对复杂

### OpenClaw Skill 适配性
- **适合度**: ⭐⭐
- **优势**:
  - 功能完整
  - Apache 许可证友好
- **挑战**:
  - Java 实现，与 Python 技能生态不匹配
  - 依赖复杂，部署成本高
  - 社区较小，文档以中文为主

---

## 综合对比

| 项目 | Stars | 语言 | 本地运行 | 依赖复杂度 | Skill 适配性 | 推荐度 |
|------|-------|------|----------|------------|--------------|--------|
| **LightRAG** | 29.1k | Python | ✅ | 中 | ⭐⭐⭐⭐⭐ | 🏆 首选 |
| **nano-graphrag** | 3.7k | Python | ✅ | 低 | ⭐⭐⭐⭐⭐ | 🥈 次选 |
| **Microsoft GraphRAG** | 33.8k | Python | ✅ | 中高 | ⭐⭐⭐⭐ | 🥉 备选 |
| **HelixDB** | 3.9k | Rust | ✅ | 中 | ⭐⭐⭐ | 特殊场景 |
| **qKnow** | 180 | Java | ✅ | 高 | ⭐⭐ | 不推荐 |

---

## 推荐方案

### 🏆 首选：LightRAG

**理由**:
1. **活跃度高**: 每天更新，社区活跃
2. **功能完整**: 支持多模态、WebUI、多种存储后端
3. **本地友好**: 支持 Ollama，可完全离线运行
4. **易于集成**: 提供 API 服务器和 Python SDK
5. **文档完善**: 中英文文档齐全

**封装建议**:
```bash
# OpenClaw skill 结构
skills/graph-rag/
├── SKILL.md          # 技能说明
├── src/
│   ├── index.ts      # 主入口
│   ├── lightrag.ts   # LightRAG 封装
│   └── config.ts     # 配置管理
├── examples/         # 使用示例
└── requirements.txt  # Python 依赖
```

### 🥈 次选：nano-graphrag

**理由**:
1. **代码简洁**: 1100 行核心代码，易于理解和维护
2. **高度可定制**: 模块化设计，易于扩展
3. **完全本地**: 支持 transformers + Ollama，零 API 依赖
4. **异步支持**: 适合高并发场景

**适用场景**:
- 需要轻量级解决方案
- 需要深度定制
- 资源受限环境

---

## OpenClaw Skill 封装建议

### 核心功能设计

```typescript
// graph-rag skill 接口设计
interface GraphRAGSkill {
  // 初始化
  init(config: GraphRAGConfig): Promise<void>
  
  // 文档插入
  insert(docs: string | string[]): Promise<void>
  
  // 查询
  query(question: string, mode?: 'local' | 'global'): Promise<QueryResult>
  
  // 知识库管理
  listDocuments(): Promise<DocumentInfo[]>
  deleteDocument(id: string): Promise<void>
  
  // 状态查询
  getStatus(): Promise<GraphRAGStatus>
}
```

### 配置管理

```yaml
# 配置文件示例
graph_rag:
  backend: lightrag  # 或 nano-graphrag
  storage:
    type: local  # 或 neo4j, mongodb, postgresql
    path: ~/.openclaw/graph-rag-data
  llm:
    provider: ollama  # 或 openai, azure
    model: qwen2.5:7b
  embedding:
    provider: ollama
    model: nomic-embed-text
```

### 依赖处理

```python
# requirements.txt - 最小化依赖
lightrag-hku[api]>=2.0.0
# 或
nano-graphrag>=0.1.0

# 可选依赖
neo4j>=5.0.0
pymongo>=4.0.0
psycopg2-binary>=2.9.0
```

---

## 下一步行动

1. **验证安装**: 在本地环境测试 LightRAG 和 nano-graphrag
2. **性能测试**: 对比两者在相同数据集上的表现
3. **封装原型**: 创建 OpenClaw skill 原型
4. **文档编写**: 编写使用文档和示例
5. **社区反馈**: 在 OpenClaw 社区收集反馈

---

## 参考资料

- [Microsoft GraphRAG Blog](https://www.microsoft.com/en-us/research/blog/graphrag-unlocking-llm-discovery-on-narrative-connections-hidden-in-purely-text-datasets/)
- [LightRAG Paper](https://arxiv.org/abs/2410.05779)
- [nano-graphrag Examples](https://github.com/gusye1234/nano-graphrag/tree/main/examples)
- [GraphRAG vs LightRAG vs nano-graphrag 对比](https://github.com/HKUDS/LightRAG/issues/1)

---

**调研完成时间**: 2026-03-08 21:30  
**调研工具**: Browser automation (GitHub 搜索 + 页面分析)
