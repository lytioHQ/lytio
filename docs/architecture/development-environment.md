# Lytio Development Environment Architecture V1

> Sprint 0 / Task 0.2.1 — 开发环境架构设计
> 角色: CTO | 原则: 简单、稳定、单人维护、未来不推翻
> 约束: 不写 Docker 配置，只输出架构设计

---

## 1. 整体运行架构

```
┌──────────────────────────────────────────────────────────────────┐
│                        Browser (localhost:3000)                   │
└──────────────────────────────┬───────────────────────────────────┘
                               │ HTTP
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│  开发机 (Windows/macOS)                                          │
│                                                                  │
│  ┌──────────────────┐   HTTP    ┌──────────────────┐            │
│  │  Next.js 15      │──────────▶│  FastAPI          │            │
│  │  (原生 Node.js)  │           │  (原生 Python)    │            │
│  │  Port 3000       │           │  Port 8000        │            │
│  └──────────────────┘           └────────┬─────────┘            │
│                                          │                       │
│                              ┌───────────┴───────────┐          │
│                              ▼                        ▼          │
│                     ┌─────────────────┐    ┌─────────────────┐  │
│                     │ PostgreSQL 16   │    │ DeepSeek API    │  │
│                     │ (Docker 容器)   │    │ (外网 HTTPS)    │  │
│                     │ Port 5432       │    │                 │  │
│                     └─────────────────┘    └─────────────────┘  │
│                                                                  │
│  Sprint 1+ 追加:                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │ Redis 7 (容器)  │    │ ARQ Worker      │                     │
│  │ Port 6379       │    │ (原生 Python)   │                     │
│  └─────────────────┘    └─────────────────┘                     │
└──────────────────────────────────────────────────────────────────┘
```

### 核心分层原则

| 层 | 运行方式 | 原因 |
|----|---------|------|
| **应用层** (Next.js / FastAPI / Worker) | 原生进程 | 热更新零延迟。Windows Docker 文件挂载性能差，改一行等 3 秒不可接受 |
| **基础设施层** (PostgreSQL / Redis / MinIO) | Docker 容器 | 隔离干净。不在 Windows 上手动安装 PG/Redis |

> 一句话：应用层永不容器化，基础设施层永远容器化。

---

## 2. 分 Sprint 服务清单

### Sprint 0 — 必须启动 (当前)

| # | 服务 | 运行方式 | 启动命令 |
|---|------|---------|---------|
| 1 | PostgreSQL 16 | Docker 容器 | `docker run postgres:16-alpine` |
| 2 | FastAPI | 原生 | `uv run uv run uvicorn app.main:app --reload --port 8000` |
| 3 | Next.js | 原生 | `pnpm dev` |

> Sprint 0 总计: **1 个容器 + 2 个终端窗口**。

### Sprint 1 — 追加

| 服务 | 运行方式 | 触发条件 |
|------|---------|---------|
| Redis 7 | Docker 容器 | DeepSeek API 需要限流 |
| ARQ Worker | 原生进程 | 用户反馈"分析太慢"需要异步 |

### Sprint 2+ — 追加

| 服务 | 运行方式 | 触发条件 |
|------|---------|---------|
| MinIO | Docker 容器 | 文件量超过 PG 承载合理值 |
| Nginx | Docker 容器 | 需要本地反向代理/SSL 测试 |

---

## 3. 端口规划

| 服务 | 端口 | 区间 |
|------|------|------|
| Next.js | `3000` | 前端系 `3000-3999` |
| FastAPI | `8000` | 后端系 `8000-8999` |
| PostgreSQL | `5432` | 数据库系 |
| Redis (S1+) | `6379` | 缓存系 |
| MinIO API (S2+) | `9000` | 存储系 `9000-9999` |
| MinIO Console (S2+) | `9001` | |
| PgAdmin (可选) | `5050` | 工具系 `5000-5999` |
| RedisInsight (可选) | `5540` | |

> 预留区间互不踩踏。不设花哨端口，全部用默认或就近。

---

## 4. 容器规划

### Sprint 0: 1 个容器

```
Core:
┌───────────────────────────────┐
│ postgres:16-alpine            │
│ Port: 5432                    │
│ Volume: pg_data (持久化)       │
└───────────────────────────────┘
```

### Sprint 3 顶格: ≤5 个容器

```
Core (必须):                    Optional (按需):
┌──────────────┐               ┌──────────────┐
│ PostgreSQL   │               │ PgAdmin      │
└──────────────┘               └──────────────┘
┌──────────────┐               ┌──────────────┐
│ Redis (S1+)  │               │ RedisInsight │
└──────────────┘               └──────────────┘
┌──────────────┐               ┌──────────────┐
│ MinIO (S2+)  │               │ Nginx (S2+)  │
└──────────────┘               └──────────────┘
```

> 5 年以后也不会超过 10 个容器。应用层不进容器。

---

## 5. 网络设计

### 通信拓扑

```
Next.js (host)  ──HTTP──▶  FastAPI (host)            ← localhost 进程间
FastAPI (host)  ──TCP───▶  PostgreSQL (容器):5432    ← Docker port mapping
FastAPI (host)  ──TCP───▶  Redis (容器, S1+):6379    ← Docker port mapping
FastAPI (host)  ──HTTPS──▶ DeepSeek API (外网)       ← 互联网
Worker (host)   ──TCP───▶  PostgreSQL (容器):5432    ← 同 FastAPI
```

### 硬性规则

| 规则 | 理由 |
|------|------|
| Frontend 不直连 Database | 安全底线，数据通过 API 获取 |
| Backend 是唯一数据库入口 | 单一写入源，杜绝数据不一致 |
| Redis 不暴露外网 (bind 127.0.0.1) | 本地专用 |
| Sprint 0 不用 Docker network | localhost 直连，少一个出错点 |
| 生产环境再引入 Docker network | 那是 Sprint 2+ 的事 |

---

## 6. 数据存储规划

| 数据 | 存储位置 | 持久化 | 说明 |
|------|---------|--------|------|
| 用户数据 | PostgreSQL | ✅ 必须 | 业务核心 |
| 分析结果 | PostgreSQL JSONB | ✅ 必须 | 用户资产 |
| 上传 Excel | 本地 `./uploads/` | ✅ 必须 | S0 本地；S2+ 迁 MinIO |
| AI 日志 | 本地 `./logs/` | ⚠️ 30天滚动 | 调试用，不永久 |
| Session | FastAPI 内存 (S0) | ❌ | 重启丢失可接受 |
| 限流计数 | FastAPI 内存 (S0) | ❌ | 重启重置可接受 |
| PG 数据 | Docker Volume `pg_data` | ✅ 必须 | 删容器不丢数据 |
| Redis 数据 | Docker Volume (S1+) | ❌ | 缓存，丢失无影响 |

---

## 7. 配置管理

### 环境变量分层

```
.env.example          ← 提交 Git (模板，无密钥)
.env                  ← 不提交 Git (开发环境真实值)
.env.test             ← 不提交 Git (测试环境，未来)
.env.production       ← 不提交 Git，或注入 Railway/Vercel
```

### 统一变量名 (三环境共用，只改值)

| 变量 | 开发 | 生产 |
|------|------|------|
| `DATABASE_URL` | `postgresql+asyncpg://localhost:5432/excelpilot` | Railway 注入 |
| `DEEPSEEK_API_KEY` | 个人 key | 生产 key |
| `JWT_SECRET` | 本地随机 | 生产强随机 |
| `CORS_ORIGINS` | `http://localhost:3000` | 真实域名 |
| `APP_ENV` | `development` | `production` |
| `APP_DEBUG` | `true` | `false` |

> 原则: 变量名一致，值不同。`APP_ENV` 驱动 FastAPI 行为切换。

---

## 8. 未来扩展 — 是否推翻当前架构？

| 未来变更 | 影响 | 推翻？ |
|----------|------|--------|
| 加 Redis | 加 1 容器 + 1 行连接配置 | ❌ 否 |
| 加 Worker | 加 1 原生进程 | ❌ 否 |
| 加 MinIO | 加 1 容器 + 切换 storage.py | ❌ 否 |
| 加 Nginx | 加 1 容器 + 1 配置 | ❌ 否 |
| 换 AI Provider | 改 ai_service.py 的 base_url | ❌ 否 |
| 第 2 行业插件 | 复制 plugins/sales/ | ❌ 否 |
| 企业私有部署 | 应用层加 Dockerfile 容器化 | ⚠️ 新增，不推翻 |
| 微服务拆分 | 按插件拆独立服务 | ⚠️ Sprint 4+，届时应演进 |

> **结论: Sprint 3 之前所有扩展均不推翻当前架构。**

---

## 9. 风险分析

| # | 一年内最可能的问题 | 现在如何避免 |
|---|-------------------|-------------|
| 1 | 团队扩大，环境不一致 → 应用层被迫容器化 | 发生时加 Dockerfile 即可，不推翻架构 |
| 2 | PostgreSQL 单点故障，数据丢失 | S0 手动 pg_dump；S2 切 Railway 托管 PG |
| 3 | 上传文件撑爆本地磁盘 | .gitignore uploads/；定期监控 |
| 4 | DeepSeek API 费用失控 | 后台设硬上限；S1 加 Redis 限流 |
| 5 | "本地能跑生产崩了" | PG 版本统一 16；不写 PG 特有 SQL |

---

## 10. 最终建议

### Sprint 0 开发者启动方式

统一使用 docker compose (Sprint 0.2.2 生成 `docker-compose.yml`)。

```bash
# 启动基础设施 (PostgreSQL)
docker compose up -d

# 终端 1: 启动后端
cd backend && uv run uvicorn app.main:app --reload --port 8000

# 终端 2: 启动前端
cd frontend && pnpm dev
```