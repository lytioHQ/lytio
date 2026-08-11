# Docker Compose Strategy V1

> Sprint 0 / Task 0.2.2 — Docker Compose 管理策略
> 原则: 单一文件、只管理基础设施、一年不重构
> 已确认前提: Next.js/FastAPI 本机运行，不进容器

---

## 1. Compose 文件规划

### 结论: 方案 A — 单一 `compose.yml`

```
docker/
└── compose.yml        ← 唯一文件，管所有环境
```

### 为什么不拆 dev / test / prod 三文件

| 理由 | 说明 |
|------|------|
| **基础设施差异极小** | 开发要 PostgreSQL，测试要 PostgreSQL，生产要 PostgreSQL。三个文件 90% 重复 |
| **一人维护** | 多文件 = 多份同步负担。改一个端口要改三个地方 |
| **环境差异靠 .env 解决** | `POSTGRES_PASSWORD=dev123` vs `POSTGRES_PASSWORD=prod_strong`，换 .env 就行，不换 compose |
| **Sprint 3 后再拆不迟** | 真到需要不同健康检查、不同资源限制、不同部署策略时再拆 — 那是企业版阶段 |

> 反例: 如果现在拆三个文件，每个文件只包含一个 PostgreSQL 服务定义。未来一年每次加 Redis/MinIO 都要同步改三次。纯浪费。

### 组织方式

```
lytio/
├── docker/
│   ├── compose.yml
│   └── .env                       ← 开发环境变量（不提交 Git）
├── .env.example               ← 变量模板（提交 Git）
└── (未来)
    ├── .env.test               ← 测试环境
    └── .env.production         ← 生产环境
```

---

## 2. 服务规划

### 分 Sprint 服务矩阵

| 服务 | Sprint 0 | Sprint 1 | Sprint 2 | Sprint 3+ | 类型 |
|------|:--------:|:--------:|:--------:|:---------:|------|
| **PostgreSQL 16** | ✅ 必须 | ✅ | ✅ | ✅ | Core |
| **Redis 7** | ❌ | ✅ 必须 | ✅ | ✅ | Core (S1+) |
| **MinIO** | ❌ | ❌ | ✅ 按需 | ✅ | Optional |
| **ARQ Worker** | ❌ | ❌ | ✅ 按需 | ✅ | App 层 (不进容器) |
| **Nginx** | ❌ | ❌ | ❌ | ✅ 按需 | Optional |
| **PgAdmin** | ❌ | ❌ | ❌ | ❌ | 明确不做 |

### Sprint 0 compose.yml 内容

```
services:
  postgres:        ← 唯一服务
```

### Sprint 2 compose.yml 内容 (预期)

```
services:
  postgres:
  redis:
  minio:           ← 新增，不删不改已有
```

### 为什么 PgAdmin 明确不做

- 一个人开发，`psql` 或 IDE 内置数据库工具足够
- PgAdmin 是一个额外容器 + 额外端口 + 额外配置
- 加了就要维护，不加零成本
- 真需要时 `docker run -d dpage/pgadmin4` 一行命令搞定，不进 compose

---

## 3. Volume 策略

### 必须持久化

| 数据 | Volume 名称 | 位置 | 理由 |
|------|------------|------|------|
| PostgreSQL 数据 | `pg_data` | `/var/lib/postgresql/data` | 删容器不丢业务数据 |
| Redis 数据 (S1+) | `redis_data` | `/data` | 重启不丢缓存（非必须，但无成本） |
| MinIO 数据 (S2+) | `minio_data` | `/data` | 上传文件持久化 |
| 本地上传 (S0) | — | `../backend/storage/uploads/` | App 层，不挂载到容器 |

### 不挂载的

| 路径 | 理由 |
|------|------|
| 应用代码 (`../backend/`, `../frontend/`) | App 不进容器，无需挂载 |
| `node_modules/`, `.venv/` | 不进容器 |
| 日志 (`../backend/storage/logs/`) | App 层管理，不进容器 |

### Volume 命名规范

```
命名: {服务名}_data
示例: pg_data, redis_data, minio_data

不使用匿名 volume。命名后 docker volume ls 一目了然。
```

---

## 4. Network 策略

### Sprint 0: 无自定义网络

```
PostgreSQL (容器) ←──localhost:5432──→ FastAPI (本机)
```

> 只有一个容器时不需要网络层。端口映射直连即可。

### Sprint 2+: 引入内部网络

```
                    ┌─────────────────────────────┐
                    │  Docker Network: excelpilot  │
                    │  (internal: true, S2+)       │
                    │                             │
                    │  ┌──────────┐ ┌──────────┐ │
                    │  │PostgreSQL│ │  Redis   │ │
                    │  └──────────┘ └──────────┘ │
                    │  ┌──────────┐               │
                    │  │  MinIO   │               │
                    │  └──────────┘               │
                    └──────┬──────────────────────┘
                           │ port mapping (仅 PG/Redis/MinIO)
                    ┌──────┴──────────────────────┐
                    │  Host (FastAPI / Next.js)    │
                    └─────────────────────────────┘
```

### 访问规则

| 服务 | 允许外部 (host) | 允许容器间 |
|------|:---------------:|:---------:|
| PostgreSQL | ✅ port 5432 | ✅ |
| Redis | ✅ port 6379 | ✅ |
| MinIO API | ✅ port 9000 | ✅ |
| MinIO Console | ✅ port 9001 | ✅ |

> **Backend 是唯一数据库入口** — 这是应用层规则，不是网络层规则。网络层不阻止直连，但代码规范禁止前端调 DB。

---

## 5. Environment 策略

### 文件分层

```
.env.example        ← Git 跟踪（模板，值为空或示例）
.env                ← Git 忽略（开发环境真实值）
.env.test           ← Git 忽略（测试环境，未来）
.env.production     ← Git 忽略（生产环境，未来，或由 Railway 注入）
```

### 变量归属

| 变量 | 属于 | 原因 |
|------|------|------|
| `POSTGRES_USER/PASSWORD/DB` | `.env` | Docker Compose 自动读取 |
| `DEEPSEEK_API_KEY` | FastAPI `.env` | App 层，不进 compose |
| `JWT_SECRET` | FastAPI `.env` | App 层 |
| `CORS_ORIGINS` | FastAPI `.env` | App 层 |
| `DATABASE_URL` | FastAPI `.env` | App 层连接字符串 |

### 避免混乱的规则

```
规则 1: compose.yml 只用 ${VAR} 引用 .env 变量，不硬编码值
规则 2: .env 只放基础设施变量 (DB用户/密码/端口)
规则 3: 应用层变量 (API Key, JWT) 放 backend/.env 和 frontend/.env.local
规则 4: 三个 .env 文件变量名完全一致，只改值
```

### 示例

```
# .env (开发)
POSTGRES_USER=excelpilot
POSTGRES_PASSWORD=dev123
POSTGRES_DB=excelpilot
POSTGRES_PORT=5432
```

```
# .env.test (未来)
POSTGRES_USER=excelpilot
POSTGRES_PASSWORD=test456
POSTGRES_DB=excelpilot_test
POSTGRES_PORT=5433          ← 不同端口避免冲突
```

---

## 6. 升级策略

### 增加服务的最小改动

```
当前 compose.yml:          增加 Redis 后:
┌──────────────────┐       ┌──────────────────┐
│ services:        │       │ services:        │
│   postgres: ...  │       │   postgres: ...  │  ← 不动
│                  │  +    │                  │
│                  │       │   redis: ...     │  ← 新增 8 行
└──────────────────┘       └──────────────────┘
```

| 未来增加 | 改动 | 是否推翻？ |
|----------|------|-----------|
| Redis | compose.yml 加 1 个 service 定义 | ❌ |
| MinIO | compose.yml 加 1 个 service 定义 + 1 个 volume | ❌ |
| Worker | compose.yml 加 1 个 service 定义 | ❌ |
| Nginx | compose.yml 加 1 个 service + docker/nginx.conf | ❌ |
| 多 AI Provider | 不涉及 Compose | ❌ |
| 多 Plugin | 不涉及 Compose | ❌ |
| 企业版 | 拆 dev/test/prod 三文件，但 service 定义复用 | ⚠️ 拆分，不重写 |

### 升级规则

```
1. 新增服务 = 在 compose.yml 底部追加，不修改已有定义
2. 新增 Volume = 在 volumes: 底部追加
3. 拆环境时 = 提取公共部分到 compose.base.yml，环境文件 inherit
```

---

## 7. 风险分析

| # | 风险 | 触发条件 | 预防 |
|---|------|---------|------|
| 1 | **Volume 数据丢失** | 执行 `docker compose down -v` | 文档标注禁止 `-v`。备份脚本定期 `pg_dump` |
| 2 | **端口冲突** | 本机已运行 PG/Redis | `.env` 中端口可配置，改值即生效 |
| 3 | **.env 漏提交密钥** | 开发者误 `git add .env` | `.gitignore` 已忽略。pre-commit hook 可选 |
| 4 | **compose.yml 中硬编码密钥** | 图方便直接写在 yml 里 | Codex 规范禁止。Review 时检查 |
| 5 | **Redis 不是必须但 compose 强制启动** | 加 Redis 后开发者没装 Docker 资源不够 | Redis service 加 `profiles: [full]`，默认不启动 |
| 6 | **PostgreSQL 版本升级导致数据不兼容** | `postgres:latest` 大版本自动升级 | 固定 `postgres:16-alpine`，不用 `latest` |

---

## 8. 最终建议

### Sprint 0 开发者 5 分钟启动流程

```bash
# 1. 克隆项目
git clone <repo> && cd lytio

# 2. 复制环境变量模板
cp .env.example docker/.env

# 3. 启动基础设施（仅 PostgreSQL）
docker compose up -d

# 4. 终端 1: 启动后端
cd backend && uv run uvicorn app.main:app --reload --port 8000

# 5. 终端 2: 启动前端
cd frontend && pnpm dev

# 完工。访问 http://localhost:3000
```

### 核心原则总结

| # | 原则 |
|---|------|
| 1 | **单一 compose.yml** — 一年内不拆文件 |
| 2 | **只用 named volume** — 删容器不丢数据 |
| 3 | **只管理基础设施** — 应用不进容器 |
| 4 | **固定镜像版本** — `postgres:16-alpine` 不用 `latest` |
| 5 | **密钥不进 compose** — 全部走 `.env` |
| 6 | **每次新增服务底部追加** — 不改已有定义 |

---

## 附录: Q&A

### Q1: 如果未来增加 1000 家企业客户，Docker 架构是否仍成立？

**不成立。** 但这不是架构缺陷，是设计边界。

Sprint 0 的 `compose.yml + 单机 PostgreSQL` 是为 **一人开发 + MVP 验证** 设计的。1000 家企业客户的架构是:

```
compose.yml (本地开发) → Railway 托管 PG (生产) → AWS RDS / 读写分离 → K8s
```

升级路径:

```
Sprint 0-2:   docker compose + 单机 PG         (当前)
Sprint 3-4:   生产 PG 迁移到 Railway 托管        (自动备份 + 监控)
Sprint 5+:    多租户隔离 + 读写分离               (RDS / Aurora)
企业版:       K8s + Helm + 私有部署             (独立产品线)
```

> 当前 compose.yml 设计不会阻碍任何升级路径。因为升级改的是"生产部署方式"，不是"本地开发方式"。

### Q2: 当前设计是否存在过度设计？

**存在。** 主动删除以下:

| 过度设计 | 删除理由 |
|----------|---------|
| 多 Compose 文件 (dev/test/prod) | Sprint 0-2 一个文件够用 |
| PgAdmin 容器 | 一个人不需要 Web UI 管理 PG |
| 自定义 Docker Network (Sprint 0) | 只有 1 个容器不需要网络层 |
| Health check 脚本 | PG 起不来一眼能看出来 |
| 资源限制 (mem_limit) | 开发机不需要限制 |
| `depends_on` + `condition: service_healthy` | 单服务不需要依赖声明 |
| Monitoring (Prometheus/Grafana) | Sprint 0 零流量，不需要监控 |
| Nginx 本地反向代理 | 开发直连 localhost:8000/3000 即可 |

> **删除后 compose.yml 的内容: 1 个 PostgreSQL service + 1 个 named volume = 约 10 行。**
