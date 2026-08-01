# ExcelPilot - 完整软件架构设计

> 版本: v1.0 | 日期: 2026-07-25 | 定位: 可扩展的 Excel AI 分析 SaaS 平台

---

## 1. 设计总览

### 1.1 核心设计原则

| 原则 | 说明 |
|------|------|
| **插件化** | 行业分析模块以 Plugin 形式注册，核心框架零耦合 |
| **关注点分离** | 前端展示层 / 后端 API 层 / AI 推理层 / 数据层 清晰分层 |
| **异步优先** | 所有 AI 分析任务通过任务队列异步执行，不阻塞请求 |
| **多租户** | Organization 级别隔离，SaaS 开箱即用 |
| **配置驱动** | 分析模板、Prompt、图表配置均通过声明式配置定义 |


### 1.2 系统分层架构图

```
客户端 (Browser)
    │
    ▼
Next.js App Router (SSR + CSR)
│ ├─ 认证模块  │ 核心UI  │  Plugin UI (动态加载)
    │
    ▼
API Gateway (Nginx)
    │
    ▼
FastAPI Application Server
│ ├─ 核心API  │  任务队列(ARQ)  │  Plugin API (自动注册)
    │
    ▼
┌──────────┐  ┌──────────┐  ┌──────────────────┐
│PostgreSQL│  │  Redis   │  │  MinIO (文件存储) │
└──────────┘  └──────────┘  └──────────────────┘
    │
    ▼
AI 推理层 (DeepSeek API)
```

---

## 2. 项目目录结构

### 2.1 顶层 Monorepo

```
excelpilot/
├── .github/workflows/         # CI/CD
├── docker/                    # Docker + Nginx
├── frontend/                  # Next.js 前端
├── backend/                   # FastAPI 后端
├── plugins/                   # 行业分析插件包
│   ├── sales/                 # 销售分析 (Phase 1)
│   ├── finance/               # 财务分析 (未来)
│   ├── stock/                 # 股票分析 (未来)
│   └── ...
├── shared/                    # 前后端共享类型
├── docs/                      # 文档
└── scripts/                   # 工具脚本
```


### 2.2 前端目录结构 (frontend/)

```
frontend/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # 认证路由组
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/              # 仪表盘 (需登录)
│   │   │   ├── layout.tsx            # Sidebar + Header
│   │   │   ├── page.tsx              # 总览仪表盘
│   │   │   ├── files/                # 文件管理
│   │   │   │   ├── page.tsx
│   │   │   │   └── [fileId]/page.tsx
│   │   │   ├── plugins/
│   │   │   │   └── [pluginId]/       # 动态路由加载插件
│   │   │   │       ├── page.tsx      # 插件首页
│   │   │   │       ├── analyze/page.tsx
│   │   │   │       └── history/page.tsx
│   │   │   └── settings/
│   │   └── api/                      # BFF 层
│   ├── components/
│   │   ├── ui/                       # 基础 UI (Button/Card/Modal...)
│   │   ├── layout/                   # Sidebar/Header/Shell
│   │   ├── charts/                   # ECharts 封装
│   │   ├── file-upload/              # 拖拽上传组件
│   │   └── analysis/                 # 分析通用组件 (JobCard/ResultView/Progress)
│   ├── lib/
│   │   ├── api-client.ts             # Axios + Token 自动注入
│   │   └── plugin-loader.ts          # 前端插件动态加载
│   ├── hooks/                        # useAuth/useAnalysisJob/usePlugin
│   ├── stores/                       # Zustand (auth/plugin/ui)
│   └── types/                        # 前端类型定义
├── tailwind.config.ts
└── next.config.ts
```

### 2.3 后端目录结构 (backend/)

```
backend/
├── app/
│   ├── main.py                       # FastAPI 入口
│   ├── config.py                     # Pydantic Settings
│   ├── core/                         # 基础设施
│   │   ├── security.py               # JWT + 密码哈希
│   │   ├── database.py               # SQLAlchemy async
│   │   ├── redis.py                  # Redis 连接池
│   │   ├── storage.py                # MinIO 客户端
│   │   └── exceptions.py
│   ├── models/                       # ORM 模型
│   │   ├── base.py                   # 抽象基类
│   │   ├── user.py / organization.py / role.py
│   │   ├── file.py
│   │   └── analysis_job.py
│   ├── schemas/                      # Pydantic Schema
│   ├── api/v1/                       # REST 路由
│   │   ├── auth.py / users.py / files.py
│   │   ├── analysis.py / organizations.py
│   │   └── plugins.py
│   ├── services/                     # 业务逻辑层
│   │   ├── auth_service.py
│   │   ├── file_service.py
│   │   ├── analysis_service.py       # 分析编排核心
│   │   ├── ai_service.py             # DeepSeek API 封装
│   │   └── plugin_registry.py        # ★ 插件注册中心
│   ├── tasks/                        # 异步任务
│   │   ├── worker.py
│   │   └── analysis_task.py
│   └── plugins/                      # ★ 插件系统
│       ├── base.py                   # BaseAnalysisPlugin 抽象基类
│       ├── registry.py               # PluginRegistry 单例
│       └── builtin/
│           └── sales/                # 销售分析插件
│               ├── plugin.py         # 插件注册入口
│               ├── analyzer.py       # 分析核心逻辑
│               ├── prompts.py        # Prompt 模板
│               ├── schema.py         # 数据 Schema
│               ├── models.py         # 插件专属模型 (可选)
│               └── api.py            # 插件专属路由
├── alembic/                          # 数据库迁移
├── tests/
└── requirements.txt
```


---

## 3. 插件系统 ★ 核心可扩展机制

> 新增一个行业分析 = 新增一个 Plugin 目录，核心框架代码零改动。

### 3.1 插件接口定义 (BaseAnalysisPlugin)

```python
class PluginManifest(BaseModel):
    id: str                      # "sales"
    name: str                    # "销售分析AI"
    description: str
    version: str                 # "1.0.0"
    icon: str                    # Lucide icon name
    supported_file_types: list[str]  # [".xlsx", ".csv"]
    required_permissions: list[str]

class AnalysisConfig(BaseModel):
    id: str                      # "sales_trend"
    name: str                    # "销售趋势分析"
    description: str
    param_schema: dict           # JSON Schema for user params
    default_params: dict

class AnalysisResult(BaseModel):
    summary: str
    charts: list[dict]
    tables: list[dict]
    insights: list[str]
    raw_response: str

class BaseAnalysisPlugin(ABC):
    manifest: PluginManifest

    @abstractmethod
    def get_analysis_configs(self) -> list[AnalysisConfig]: ...

    @abstractmethod
    def validate_data(self, df: pd.DataFrame) -> tuple[bool, str]: ...

    @abstractmethod
    def build_prompt(self, config_id: str, data_sample: str,
                     user_params: dict) -> str: ...

    @abstractmethod
    def parse_response(self, config_id: str,
                       ai_response: str) -> AnalysisResult: ...

    # 可选钩子
    def get_api_router(self) -> APIRouter | None: return None
    def get_db_models(self) -> dict[str, type]: return {}
```

### 3.2 插件注册流程

```
FastAPI 启动
  │
  ├─ 1. 扫描 plugins/builtin/ 目录
  │     ├─ 导入 sales/plugin.py -> SalesPlugin()
  │     └─ 导入 finance/plugin.py -> FinancePlugin()
  │
  ├─ 2. PluginRegistry.register(plugin)
  │     ├─ 验证 manifest
  │     ├─ 验证抽象方法实现
  │     └─ 存入 registry._plugins[plugin_id]
  │
  ├─ 3. 自动挂载插件 API 路由
  │     app.include_router(plugin.get_api_router())
  │
  └─ 4. 同步到 plugin_registry 表
```

### 3.3 新增插件的步骤 (仅需 4 步)

| 步骤 | 操作 | 位置 |
|------|------|------|
| 1 | 创建目录, 实现 BaseAnalysisPlugin | backend/app/plugins/builtin/<name>/ |
| 2 | 编写 Prompt 模板 | backend/.../<name>/prompts.py |
| 3 | 创建前端页面组件 | frontend/src/app/(dashboard)/plugins/<name>/ |
| 4 | 注册前端插件 + 侧边栏配置 | frontend/src/lib/plugin-registry.ts |


---

## 4. 数据流设计

### 4.1 完整数据流 (上传 -> 分析 -> 展示)

```
用户          Frontend               Backend                    AI
 │              │                      │                        │
 │ 1.上传Excel  │                      │                        │
 │─────────────>│ 2.POST /files        │                        │
 │              │─────────────────────>│ 3.存入MinIO+pandas解析  │
 │              │ 5.返回file_id+预览   │                        │
 │              │<─────────────────────│                        │
 │ 6.展示预览   │                      │                        │
 │<─────────────│                      │                        │
 │              │                      │                        │
 │ 7.选分析+参数│                      │                        │
 │─────────────>│ 8.POST /analysis     │                        │
 │              │─────────────────────>│ 9.创建job(status=pending)
 │              │ 10.返回job_id        │                        │
 │              │<─────────────────────│ 11.推入ARQ队列          │
 │              │                      │                        │
 │              │                      │ 12.Worker领取           │
 │              │                      │ 13.读MinIO->pandas      │
 │              │                      │ 14.Plugin.validate()    │
 │              │                      │ 15.Plugin.build_prompt()│
 │              │                      │ 16.DeepSeek API────────>│
 │              │                      │ 17.<──────AI响应        │
 │              │                      │ 18.Plugin.parse()       │
 │              │                      │    job->completed       │
 │              │                      │                        │
 │ 19.轮询/SSE  │ 20.GET /analysis/{id}/result                  │
 │<─────────────│<─────────────────────│                        │
 │              │                      │                        │
 │ 21.渲染图表  │                      │                        │
```

### 4.2 任务状态机

```
pending -> queued -> processing -> completed
                            \-> failed
```

---

## 5. AI 调用流程

### 5.1 调用架构

```
analysis_task.py (ARQ Worker)
  │
  ├─ 1. 获取 AnalysisJob
  ├─ 2. 加载 Plugin
  ├─ 3. Plugin.validate_data(df)          # 数据校验
  ├─ 4. Plugin.build_prompt(...)          # 构建 Prompt
  ├─ 5. ai_service.chat(messages)         # DeepSeek API
  │     ├─ 指数退避重试 (max 3次)
  │     ├─ Redis Token Bucket 限流
  │     ├─ 统一日志 (请求/响应/Token计数)
  │     └─ 统一异常处理
  ├─ 6. Plugin.parse_response(response)   # 结构化解析
  └─ 7. 存储 AnalysisResult -> PostgreSQL
```

### 5.2 Prompt 模板设计 (示例)

```python
SALES_TREND_PROMPT = """
你是资深销售数据分析师。请根据以下数据进行分析：

## 数据样本
{data_sample}

## 统计摘要
- 总行数: {row_count}
- 时间范围: {date_range}
- 总销售额: {total_sales}

## 请按以下 JSON 格式返回:
{
  "summary": "200字以内的总结",
  "insights": ["洞察1", "洞察2", ...],
  "charts": [{ "type": "line|bar|pie", "title": "...", "data": [...] }],
  "tables": [{ "title": "...", "headers": [...], "rows": [...] }]
}

## 用户额外要求
{user_instructions}
"""
```

### 5.3 AI 服务封装

```python
class AIService:
    """DeepSeek API 统一封装"""
    def __init__(self, api_key: str, base_url: str):
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)

    async def analyze_excel(
        self, plugin: BaseAnalysisPlugin, config_id: str,
        df: pd.DataFrame, user_params: dict
    ) -> AnalysisResult:
        """一站式: 校验 -> Prompt -> 调用 -> 解析 -> 返回"""
        ...
```


---

## 6. 用户权限设计 (RBAC)

### 6.1 角色定义

| 角色 | 权限范围 | 说明 |
|------|----------|------|
| super_admin | 全局 | 平台管理员 |
| org_admin | 组织内 | 管理成员/计费/插件 |
| org_manager | 组织内 | 查看所有结果/管理文件 |
| org_analyst | 组织内 | 上传/创建分析/查看自己结果 |
| org_viewer | 组织内 | 只读查看分享结果 |

### 6.2 权限矩阵

| 操作 | super_admin | org_admin | org_manager | org_analyst | org_viewer |
|------|:-----------:|:---------:|:-----------:|:-----------:|:----------:|
| 管理组织 | Y | Y | - | - | - |
| 管理成员 | Y | Y | - | - | - |
| 启用/禁用插件 | Y | Y | - | - | - |
| 管理计费 | Y | Y | - | - | - |
| 上传文件 | Y | Y | Y | Y | - |
| 创建分析 | Y | Y | Y | Y | - |
| 查看所有结果 | Y | Y | Y | - | - |
| 查看自己结果 | Y | Y | Y | Y | Y |
| 导出报告 | Y | Y | Y | Y | Y |

### 6.3 JWT Token 结构

```json
{
  "sub": "user_uuid",
  "org_id": "org_uuid",
  "roles": ["org_analyst"],
  "permissions": ["file:upload", "analysis:sales:read", "analysis:sales:create"],
  "exp": 1712345678
}
```

---

## 7. 数据库设计

### 7.1 ER 关系

```
organizations 1---N users
users N---M roles N---M permissions
users 1---N uploaded_files 1---N analysis_jobs 1---1 analysis_results
plugin_registry (独立)
```

### 7.2 核心表

```sql
-- 组织
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    plan VARCHAR(50) DEFAULT 'free',  -- free|pro|enterprise
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用户
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 权限 (RBAC 五表)
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource VARCHAR(100) NOT NULL,    -- "analysis:sales"
    action VARCHAR(50) NOT NULL,       -- "read"|"create"|"delete"
    UNIQUE(resource, action)
);

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id),
    name VARCHAR(100) NOT NULL,
    is_system BOOLEAN DEFAULT false,
    UNIQUE(org_id, name)
);

CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- 上传文件
CREATE TABLE uploaded_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    org_id UUID REFERENCES organizations(id),
    original_name VARCHAR(500) NOT NULL,
    storage_key VARCHAR(500) NOT NULL,      -- MinIO key
    file_size BIGINT,
    mime_type VARCHAR(100),
    row_count INTEGER,
    column_names JSONB,
    preview_data JSONB,                     -- 前20行
    status VARCHAR(50) DEFAULT 'uploading',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 分析任务
CREATE TABLE analysis_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    org_id UUID REFERENCES organizations(id),
    file_id UUID REFERENCES uploaded_files(id),
    plugin_id VARCHAR(50) NOT NULL,
    analysis_config_id VARCHAR(50) NOT NULL,
    user_params JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    error_message TEXT,
    ai_tokens_used INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 分析结果
CREATE TABLE analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID UNIQUE REFERENCES analysis_jobs(id),
    summary TEXT NOT NULL,
    charts JSONB DEFAULT '[]',
    tables JSONB DEFAULT '[]',
    insights JSONB DEFAULT '[]',
    raw_response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插件注册表
CREATE TABLE plugin_registry (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```


### 7.3 Redis 缓存设计

| Key Pattern | 类型 | 用途 | TTL |
|-------------|------|------|-----|
| session:{id} | String | 用户会话 | 7d |
| rate_limit:{uid}:{ep} | String | API 限流 | 1m |
| ai_token_bucket | Hash | AI 调用限流 | - |
| job_status:{job_id} | String | 任务实时状态 | 1h |
| file_preview:{file_id} | String | 文件预览缓存 | 24h |

---

## 8. API 设计规范

### 8.1 URL 命名规范

```
Base: /api/v1
资源: 复数名词

GET    /api/v1/files              # 列表
POST   /api/v1/files/upload       # 上传
GET    /api/v1/files/{id}         # 详情
DELETE /api/v1/files/{id}         # 删除

POST   /api/v1/analysis           # 创建分析
GET    /api/v1/analysis           # 列表
GET    /api/v1/analysis/{id}      # 详情+状态
GET    /api/v1/analysis/{id}/result  # 结果
DELETE /api/v1/analysis/{id}      # 删除

GET    /api/v1/plugins            # 已安装插件
GET    /api/v1/plugins/{id}       # 插件详情
GET    /api/v1/plugins/{id}/configs  # 分析配置

# 认证
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
```

### 8.2 统一响应格式

```json
// 成功
{ "code": 0, "message": "ok", "data": {...} }

// 列表
{ "code": 0, "message": "ok", "data": { "items": [...], "total": 100, "page": 1, "page_size": 20 } }

// 错误
{ "code": 40101, "message": "Token expired", "detail": "请重新登录" }
```

### 8.3 错误码规范

```
格式: HTTP状态+模块+序号

40101: 认证失败
40102: Token 过期
40301: 无权限
40401: 文件不存在
40402: 分析任务不存在
42201: 文件格式不支持
42202: 数据校验失败
42901: 请求过于频繁
50001: AI 服务异常
50002: 文件处理异常
```

---

## 9. 基础设施与部署

### 9.1 Docker Compose (开发环境)

```yaml
services:
  postgres:  { image: postgres:16-alpine,  ports: ["5432:5432"] }
  redis:     { image: redis:7-alpine,      ports: ["6379:6379"] }
  minio:     { image: minio/minio,         ports: ["9000:9000","9001:9001"] }
  backend:   { build: ./backend,           ports: ["8000:8000"] }
  worker:    { build: ./backend,           command: arq worker }
  frontend:  { build: ./frontend,          ports: ["3000:3000"] }
```

### 9.2 生产部署

```
Cloudflare (CDN+DNS) -> Nginx (SSL) -> Frontend | Backend | Worker
                                         └─────────┼──────────┘
                                            PostgreSQL + Redis + MinIO/S3
```

---

## 10. 后续扩展方案

### 10.1 行业分析扩展 (仅需增加 Plugin)

| 行业 | 分析类型 | 插件目录 |
|------|---------|----------|
| 财务分析 | 利润表/现金流/费用结构 | plugins/finance/ |
| 股票分析 | K线指标/持仓分析/回测 | plugins/stock/ |
| 社区管理 | 用户增长/活跃度/内容 | plugins/community/ |
| 库存分析 | 周转率/ABC分类/补货 | plugins/inventory/ |
| 制造业 | OEE/质量趋势/产能 | plugins/manufacturing/ |

### 10.2 架构演进路线

```
Phase 1 (MVP)     Phase 2            Phase 3              Phase 4
─────────────────────────────────────────────────────────────────
单租户             多租户SaaS          企业版                平台化
├─ 销售分析         ├─ 组织隔离         ├─ SSO (SAML/OIDC)    ├─ 插件市场
├─ 基础权限         ├─ 计费系统         ├─ 私有化部署         ├─ 第三方插件
├─ 手动上传         ├─ 用量统计         ├─ 审计日志           ├─ API开放平台
└─ 单次分析         ├─ 2-3插件          ├─ 数据权限           └─ 社区生态
                   └─ 协同分享         └─ SLA保障
```

---

## 11. 开发路线图

### Phase 1: MVP (第1-4周)

| 周 | 任务 |
|----|------|
| W1 | 项目脚手架 (Monorepo/Docker/CI/CD) |
| W2 | 核心后端: 认证/文件上传/DB Schema |
| W3 | 插件系统 + 销售分析插件 (后端) |
| W4 | 前端核心 UI + 销售分析页面 |

### Phase 2: 完善 (第5-8周)

| 周 | 任务 |
|----|------|
| W5 | 异步任务队列 + AI 联调 |
| W6 | ECharts 可视化 + Excel 在线预览 |
| W7 | 多租户 + RBAC 完善 |
| W8 | 测试/文档/部署上线 |

### Phase 3: 扩展 (第9周+)

- 新增第2个行业插件
- 计费系统
- 协同分享
- 性能优化

---

## 12. 技术选型总览

| 层 | 技术 | 说明 |
|----|------|------|
| 前端框架 | Next.js 15 (App Router) | SSR + CSR |
| UI | Tailwind CSS + shadcn/ui | 原子化+无头组件 |
| 图表 | ECharts | 商业级免费 |
| 状态管理 | Zustand | 轻量无模板 |
| 认证 | NextAuth.js v5 | JWT + OAuth |
| 后端框架 | FastAPI | 异步+自动文档 |
| ORM | SQLAlchemy 2.0 async | 声明式映射 |
| 任务队列 | ARQ | asyncio-native |
| 数据库 | PostgreSQL 16 | JSONB支持 |
| 缓存 | Redis 7 | 会话/限流/缓存 |
| 文件存储 | MinIO (S3-compatible) | Excel存储 |
| AI | DeepSeek API | 分析推理 |
| 容器化 | Docker + Compose | 统一环境 |

---

> **核心承诺: 新增任意行业分析，仅需新增一个 Plugin 目录，核心框架代码零改动。**

---

## 附录A: MVP 精简方案 — "更快获得第一个付费用户"

> 以下是对完整架构的重新评估。标注 ✅ 为 MVP 必做，⏸ 为延期但保留设计。

### A.1 核心原则

```
每做一个模块，问自己：它是否帮助我更快获得第一个付费用户？
如果答案是"否" → ⏸ 延期，不是删除。
```

### A.2 功能裁剪决策

| 模块 | 完整设计 | MVP 决策 | 理由 |
|------|---------|---------|------|
| 多租户 Organization | 组织级隔离 | ⏸ 延期 | 第一个客户不需要组织管理 |
| RBAC 5级角色 | super_admin~viewer | ⏸ 延期 | MVP 只需"登录/未登录" |
| 插件系统抽象 | BaseAnalysisPlugin | ⏸ 延期 | 只有1个行业时，抽象是过度设计 |
| 异步任务队列 ARQ | Worker + Redis | ⏸ 延期 | 同步调用 DeepSeek 也可用，加 loading 即可 |
| Redis 缓存 | 会话/限流/缓存 | ⏸ 延期 | MVP 流量不需要 Redis |
| MinIO 文件存储 | S3 兼容存储 | ⏸ 延期 | 本地磁盘或云存储直接存 |
| Docker 生产部署 | 容器化集群 | ⏸ 延期 | Vercel + 1台 VPS 足够 |
| CI/CD | GitHub Actions | ⏸ 延期 | 本地手动部署即可 |
| 计费系统 | Stripe 集成 | ⏸ 延期 | 手动收款/激活即可 |
| NextAuth.js | 多 Provider | ⏸ 延期 | 简单的 JWT 登录即可 |

### A.3 MVP 必做清单 (仅 7 项)

```
1. ✅ 用户注册/登录 (简单 JWT)
2. ✅ Excel 文件上传 + pandas 解析预览
3. ✅ 销售分析 AI 调用 (同步，一次请求完成)
4. ✅ 分析结果展示 (图表 + 文字报告)
5. ✅ 首页 Landing Page (转化用)
6. ✅ 基础 UI (Tailwind + shadcn/ui)
7. ✅ 数据库 (PostgreSQL，存储用户/文件/分析结果)
```

### A.4 MVP 简化架构

```
浏览器
  │
  ▼
Next.js (前端 + BFF API Routes)
  │  ├─ 认证 (简单 JWT)
  │  ├─ 文件上传
  │  └─ 页面路由
  │
  ▼
FastAPI (后端 API)
  │  ├─ 认证
  │  ├─ 文件处理 (pandas)
  │  ├─ 销售分析逻辑
  │  └─ DeepSeek API 调用
  │
  ▼
PostgreSQL (单实例)
  │  users | uploaded_files | analysis_jobs | analysis_results
```

> **对比完整架构，MVP 去掉了: Redis、MinIO、ARQ Worker、Nginx、Docker、多租户、RBAC、插件系统。**

### A.5 MVP 技术选型简化

| 层 | MVP 选择 | 说明 |
|----|---------|------|
| 前端 | Next.js 15 | 不变，好选择 |
| UI | Tailwind + shadcn/ui | 不变 |
| 图表 | ECharts | 不变 |
| 后端 | FastAPI | 不变 |
| 数据库 | PostgreSQL | 不变 |
| 文件存储 | 本地磁盘 / 直接存 PG | 省去 MinIO |
| AI | DeepSeek API | 不变 |
| 认证 | 自写 JWT | 省去 NextAuth 学习成本 |
| 部署 | Vercel (前端) + 1台云服务器 (后端+PG) | 省去 Docker |

### A.6 MVP 最小目录结构

```
excelpilot/
├── frontend/              # Next.js
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx           # Landing
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx       # 上传 + 分析入口
│   │   │   │   ├── history/page.tsx
│   │   │   │   └── result/[id]/page.tsx
│   │   │   └── api/               # BFF 代理
│   │   ├── components/
│   │   │   ├── ui/                # shadcn/ui
│   │   │   ├── FileUpload.tsx
│   │   │   ├── AnalysisResult.tsx
│   │   │   └── charts/
│   │   └── lib/
│   │       └── api.ts             # fetch 封装
│   └── package.json
│
├── backend/               # FastAPI (单文件起步，逐步拆分)
│   ├── main.py                    # FastAPI app + 所有路由
│   ├── models.py                  # SQLAlchemy models
│   ├── schemas.py                 # Pydantic schemas
│   ├── auth.py                    # JWT 认证
│   ├── analysis.py                # 销售分析 + DeepSeek 调用
│   ├── requirements.txt
│   └── .env
│
└── docs/
    └── architecture.md
```

> **注意：后端从 `main.py` 单文件起步，待功能稳定后再拆分为完整目录结构。不要一开始就建 30 个空文件。**

### A.7 延期但保留的完整设计

以下模块在设计文档中保留完整设计，等有第一个付费用户后再开发：

```
⏸ 多租户 (organizations 表 + 数据隔离)
⏸ RBAC 权限 (roles/permissions 五表)
⏸ 插件系统抽象 (BaseAnalysisPlugin + PluginRegistry)
⏸ 异步任务队列 (ARQ Worker)
⏸ Redis 缓存
⏸ MinIO 文件存储
⏸ Docker 容器化部署
⏸ CI/CD 流水线
⏸ 计费系统 (Stripe)
⏸ 第2+行业分析插件
```

### A.8 MVP 开发顺序 (2周内可完成)

```
Day 1-2:  后端 main.py — FastAPI + PostgreSQL 连接 + JWT 登录
Day 3-4:  后端分析 — DeepSeek API 调用 + pandas 解析
Day 5-6:  前端骨架 — Landing + 登录/注册 + Dashboard 布局
Day 7-8:  前端核心 — 文件上传 + 分析结果展示 + 图表
Day 9-10: 联调 + 部署 (Vercel + 云服务器)
```

### A.9 第一个版本的判断标准

```
用户场景：
1. 打开网站 → 看到 Landing Page，知道这是做什么的
2. 注册/登录 → 进入 Dashboard
3. 上传一个销售 Excel → 看到预览确认数据正确
4. 点击"开始分析" → 等待 10-30 秒
5. 看到图表 + 文字分析报告 → 觉得"这东西有用"
6. 愿意为此付费
```

> 做到第 6 步，就是成功的 MVP。然后再回来开发延期模块。

---

> **完整架构文档主体保持不变，本附录仅为 MVP 阶段提供精简指引。**
> **第 2 个行业分析上线前，再重构为插件架构。**

---

## 附录B: CTO 决策日志 — Sprint 优先级与取舍

> 角色: CTO。目标: 最快获得真实付费用户。每一项决策必须回答"为什么现在？"

---

### Sprint 0 (现在) — 必须做的 5 件事

#### 1. FastAPI 后端 + PostgreSQL

**为什么现在必须做？**
Excel 分析的核心能力在 Python 生态 (pandas + openpyxl)。用 Node.js 处理 Excel 质量差、坑多，会增加返工成本。
PostgreSQL 的 JSONB 直接存分析结果，省去序列化层。用 Supabase 或 Railway 的免费托管，0 运维成本。

**成本:** 0 元 (Supabase 免费层 500MB) | **速度:** 快 (单文件起步) | **扩展:** 不锁死

#### 2. 同步 AI 调用 (不加任务队列)

**为什么现在必须做？**
DeepSeek 一次分析 10-30 秒，前端放个 loading 动画完全可以接受。
加 ARQ/Celery 需要 Redis + Worker 进程 + 状态轮询，至少多 3 天开发 + 1 个服务运维。
等用户抱怨"太慢"的时候再加队列 — 这是好问题，说明有人用了。

**成本:** 省 3 天 | **速度:** 用户体验可接受 | **扩展:** 接口已预留 job.status 字段

#### 3. 单用户、无组织 (不加多租户)

**为什么现在必须做？**
第一个付费用户是一个"人"，不是一个"组织"。他不需要邀请成员、分配角色。
users 表预留 org_id 字段 (nullable)，将来加 alter table 即可，0 迁移成本。

**成本:** 省 5 天 | **速度:** 无多余抽象 | **扩展:** 字段已预留

#### 4. Next.js + FastAPI 双服务

**为什么现在必须做？**
争议点 — 是否把后端逻辑全部放进 Next.js API Routes？
**决定：分。** 理由：Excel 解析必须用 Python。混在一个服务里将来拆分更痛。
但部署简化：Vercel 托管前端 (免费)，Railway 托管后端 (免费层)，不需要 Docker。

**成本:** 多 1 个部署目标 | **速度:** 损失不大 | **扩展:** 正确的边界

#### 5. 硬编码销售分析逻辑 (不加插件抽象)

**为什么现在必须做？**
只有 1 个行业时，BaseAnalysisPlugin 是纯粹的过度设计。
第 2 个行业上线前 (Sprint 3+)，从硬编码重构到插件 — 那时你对"什么是可变的"有真实认知，抽象才正确。

**成本:** 省 3 天 | **速度:** 快 | **扩展:** 方向已明确，等真实需求驱动重构

---

### Sprint 1-2 (等有付费用户后) — 立刻补的

| 模块 | 触发条件 | 理由 |
|------|---------|------|
| Redis | 需要限流 DeepSeek API | 防止账单爆炸 |
| Stripe 支付 | 用户问"怎么付钱" | 付费意愿已验证 |
| 异步任务队列 | 用户反馈"太慢"或分析超时 | 真实痛点驱动 |
| 分析历史记录 | 用户想回看之前的分析 | 留存功能 |

---

### Sprint 3+ (规模化前) — 不着急的

| 模块 | 触发条件 |
|------|---------|
| 多租户 + RBAC | 第二个组织注册 |
| 插件系统重构 | 第二个行业分析上线 |
| MinIO 文件存储 | 文件量超过 PostgreSQL 承载 |
| Docker/K8s | 单服务器扛不住 |
| SSO/SAML | 企业客户要求 |

---

### 一句话总结每个"不做"的理由

| 不做的东西 | 理由 |
|-----------|------|
| Redis | 没流量，限流用不上 |
| 异步队列 | 30 秒的 loading 用户能接受 |
| 多租户 | 第一个客户是一个"人" |
| RBAC | 没有"组织"哪来的"角色" |
| 插件抽象 | 1 个行业不需要抽象，2 个时才重构 |
| MinIO | 文件直接存 PostgreSQL bytea 或本地磁盘 |
| Docker | Vercel + Railway 免费层部署 |
| CI/CD | 手动 git push + 重启，2 周内不折腾 |
| NextAuth | 自写 JWT，20 行代码 |

---

### 开发成本估算

| Sprint | 内容 | 人天 |
|--------|------|------|
| Sprint 0 | MVP 5 件事 (后端+前端+AI集成+部署) | 10天 |
| Sprint 1 | Redis + Stripe + 分析历史 | 5天 |
| Sprint 2 | 第2行业插件 + 异步队列 | 7天 |
| Sprint 3 | 多租户 + 插件重构 | 10天 |

> **Sprint 0 目标: 花 10 天，上線一个能收钱的销售分析工具。**
> **所有"架构完整性"优先级的决策，推迟到 Sprint 1 之后。**
