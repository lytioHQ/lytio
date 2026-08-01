# Sprint 0 / Task 0.2.1 — Review

> 开发环境架构设计

---

## 1. 设计决策

- **决策: 应用层原生 + 基础设施容器化**
  **理由:** Windows Docker 文件挂载性能差，Next.js/FastAPI 热更新在容器内延迟 2-3 秒。PostgreSQL/Redis 作为基础设施放容器反而最干净——免安装、免清理、隔离好。

- **决策: Sprint 0 只启动 1 个容器 (PostgreSQL)**
  **理由:** Redis 在无流量 MVP 阶段不需要。MinIO 在文件量小的阶段不需要。Worker 在同步调用阶段不需要。逐 Sprint 追加，不预建。

- **决策: 端口区间预留 (3000/5000/8000/9000 四个区段)**
  **理由:** 避免未来加服务时端口冲突。区间划分不是技术必须，是人认知减负——每个区段代表一类服务。

- **决策: 不用 Docker network，用 localhost port mapping 直连**
  **理由:** Sprint 0 开发者一人一机，不需要容器间 DNS 解析。localhost 直连调试最简单。生产环境再引入 network。

- **决策: 配置文件用 .env 三层 (.env / .env.test / .env.production)，变量名统一**
  **理由:** 避免"开发变量名叫 DATABASE_URL，生产叫 DB_CONNECTION"的混乱。APP_ENV 驱动 FastAPI 内部行为切换。

- **决策: 上传文件目录预留 backend/storage/ 五子目录**
  **理由:** 从第一天固定文件组织预期。Sprint 0 只建目录不实现功能，避免后续文件散落各处。

---

## 2. 取舍记录

- ✅ 做了: 完整 10 节设计文档，覆盖架构/服务/端口/容器/网络/存储/配置/扩展/风险
- ✅ 做了: 分 Sprint 服务清单 (S0/S1/S2)，每项标注触发条件
- ✅ 做了: 风险分析，列出 5 项一年内最可能的架构问题 + 缓解方案
- ✅ 做了: backend/storage/ 目录创建 (uploads/exports/reports/temp/logs)
- ✅ 做了: 统一 uv 启动命令 (`uv run uvicorn`)
- ✅ 做了: 删除裸 docker run 示例，统一 docker compose
- ⏸ 没做: docker-compose.yml (属于 Task 0.2.2)
- ⏸ 没做: Dockerfile (属于 Task 0.2.2)
- ⏸ 没做: Nginx 配置 (Sprint 2+)
- ⏸ 没做: MinIO 配置 (Sprint 2+)
- ⏸ 没做: 本地 HTTPS 证书配置 (生产走 Cloudflare，本地不需要)

---

## 3. 潜在风险

- **风险:** 开发者电脑未安装 Docker Desktop，PostgreSQL 无法启动
  **触发条件:** 新成员加入
  **缓解:** README 或 onboarding 文档中标注 Docker Desktop 为前提依赖

- **风险:** Windows 与 macOS 路径差异导致 Volume 挂载问题
  **触发条件:** 团队有 Mac 用户
  **缓解:** Docker Volume 而非 bind mount，路径无关

- **风险:** 应用层原生运行意味着 Python/Node 版本依赖开发者自行管理
  **触发条件:** 版本不一致导致"我这儿能跑"
  **缓解:** `.python-version` (pyenv) + `.nvmrc` + `package.json` engines 字段。属于 Task 0.2.2 脚手架范畴

- **风险:** 本地 `uploads/` 目录可能因 .gitignore 遗漏被提交
  **触发条件:** 开发者误操作
  **缓解:** .gitignore 已包含常见忽略项；storage/ 下仅有 .gitkeep

---

## 4. 进入下一 Task 前确认

- [x] Review 已通过 — Development Architecture V1 批准
- [x] docker run 示例已删除，统一 docker compose
- [x] FastAPI 启动命令统一为 `uv run uvicorn`
- [x] backend/storage/ 目录已创建
- [ ] `.python-version` / `.nvmrc` 是否在 Task 0.2.2 中一并生成？

---

## 5. 文件变更清单

### 新增
- `docs/architecture/development-environment.md` — 开发环境架构设计文档
- `backend/storage/uploads/` + `.gitkeep`
- `backend/storage/exports/` + `.gitkeep`
- `backend/storage/reports/` + `.gitkeep`
- `backend/storage/temp/` + `.gitkeep`
- `backend/storage/logs/` + `.gitkeep`

### 修改
- `docs/architecture/development-environment.md` — 删除 docker run 示例；FastAPI 启动改用 uv

### 删除
- (无)
