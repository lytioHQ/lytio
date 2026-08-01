# Sprint 0 / Task 0.2.2 — Review

> Docker Compose 管理策略设计

---

## 1. 设计决策

- **决策: 单一 `compose.yml`，不拆 dev/test/prod**
  **理由:** 基础设施在三环境间差异极小。拆三份会导致每次加 Redis/MinIO 要同步改三次。环境差异靠 `.env` 文件切换，不靠 compose 文件拆分。

- **决策: compose 只管理基础设施服务 (PG/Redis/MinIO)，应用不进容器**
  **理由:** 与 Task 0.2.1 确认的架构一致。Next.js/FastAPI 保持原生运行享受热更新。compose 职责单一：管好数据库和缓存。

- **决策: Sprint 0 compose.yml 仅包含 1 个 PostgreSQL 服务**
  **理由:** Redis/MinIO/Nginx/PgAdmin 全延期。当前只需 PG。约 10 行的 compose.yml 不需要"策略"。

- **决策: 固定镜像版本 `postgres:16-alpine`，不用 `latest`**
  **理由:** `latest` 大版本升级可能导致数据不兼容。固定版本 = 可控升级。

- **决策: Redis 用 `profiles` 标记为可选**
  **理由:** Sprint 1 加 Redis 后，开发者 Docker 资源不足时可 `docker compose --profile full up` 选择性启动。默认 `docker compose up` 只启 PG。

---

## 2. 取舍记录

- ✅ 做了: 完整 8 节策略文档 + 2 个 QA
- ✅ 做了: 明确 S0/S1/S2 服务矩阵，每项标注"必须/按需/不做"
- ✅ 做了: Volume 命名规范 (`{服务名}_data`)
- ✅ 做了: Environment 变量归属规则 (基础设施变量 vs 应用变量)
- ✅ 做了: 升级路径说明 (1000 企业客户场景)
- ⏸ 没做: 多 compose 文件拆分 (过度设计)
- ⏸ 没做: PgAdmin 容器 (一个人不需要)
- ⏸ 没做: Docker Network (S0 只有 1 容器不需要)
- ⏸ 没做: Health check / 资源限制 / depends_on (过度设计)
- ⏸ 没做: Monitoring (零流量不需要)
- ⏸ 没做: compose.yml 文件本身 (Task 0.2.2 禁止写 YAML)

---

## 3. 主动删除的过度设计

| 删除项 | 理由 |
|--------|------|
| 多 compose 文件 | 一个文件够用到 Sprint 3 |
| PgAdmin | IDE 内置工具看数据库 |
| Docker Network | 单容器不需要 |
| Health check | PG 启动失败一眼可见 |
| 资源限制 (mem_limit) | 开发机不限制 |
| depends_on | 单服务无依赖 |
| Monitoring | 零流量无监控需求 |
| Nginx | 直连 localhost 即可 |

---

## 4. 潜在风险

- **风险:** Volume 数据被 `docker compose down -v` 误删
  **触发条件:** 开发者清环境
  **缓解:** 开发阶段数据不重要。Sprint 2+ 加 `pg_dump` 定时备份

- **风险:** 本机已运行 PG 占 5432 端口
  **触发条件:** 开发者有其他项目
  **缓解:** `.env` 中 `POSTGRES_PORT` 可改，改值即生效

- **风险:** `.env` 被误提交到 Git
  **触发条件:** 开发者 `git add .`
  **缓解:** `.gitignore` 已忽略；`.env.example` 只有模板无密钥

- **风险:** Sprint 3 拆文件时 compose 定义重复
  **触发条件:** 多个 compose 文件各自维护 service 定义
  **缓解:** 届时用 `compose.base.yml` + `include` 或 `extends` 复用

---

## 5. 进入下一 Task 前确认

- [ ] 单一 compose.yml 策略是否接受？(vs 拆 dev/test/prod)
- [ ] Sprint 0 compose.yml 仅 PostgreSQL — 是否遗漏必需服务？
- [ ] .env 变量归属规则 (基础设施 vs 应用) 是否清晰？
- [ ] 删除 PgAdmin/Network/HealthCheck/Monitoring — 是否有反对意见？

---

## 6. 文件变更清单

### 新增
- `docs/architecture/docker-compose-strategy.md` — Docker Compose 策略 V1

### 修改
- (无)

### 删除
- (无)
