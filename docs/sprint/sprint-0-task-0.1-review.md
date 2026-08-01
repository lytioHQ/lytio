# Sprint 0 / Task 0.1 — Review

> 项目目录结构与根文件初始化

---

## 1. 设计决策

- **决策:** 前端 `features/` `services/` `types/` `utils/` 合并为 `lib/`
  **理由:** 4 个目录功能重叠，Sprint 0 每个目录仅 1-2 个文件。Next.js 社区约定 `lib/` 放所有非组件代码。等文件量增长后再拆。

- **决策:** 后端删除 `repositories/`
  **理由:** SQLAlchemy ORM 即 Repository 层。在其上再包一层是 Java 思维，增加代码量但不增加价值。

- **决策:** 后端删除 `workflows/` 和 `providers/`
  **理由:** "Workflow" 定义模糊，Sprint 0 只有同步 AI 调用无需编排。"Provider" 仅 DeepSeek 一个，一个 `services/ai_service.py` 足够。

- **决策:** `plugins/sales/` 立即建但仅放 README
  **理由:** 从第一天固定 Plugin 架构预期，防止后续开发偏离。但 Sprint 0 不写插件代码，避免过早抽象。

- **决策:** `docs/architecture/` 作为子目录保留
  **理由:** 架构文档量预期增长（ADR、API spec、插件开发指南），顶层一个 `architecture.md` 不够。

- **决策:** 后端从 `backend/app/` 目录起步（而非根目录单文件）
  **理由:** `AI_DEVELOPMENT_GUIDE.md` 规定后端从单文件 `main.py` 起步是 Sprint 0.2 的事。目录空壳先建好，为 Task 0.2 提供明确的放置位置。

---

## 2. 取舍记录

- ✅ 做了: 创建 24 个空目录，覆盖 Frontend / Backend / Shared / Documentation / Infrastructure 五个区域
- ✅ 做了: 7 个根文件 (README / LICENSE / .gitignore / .editorconfig / .gitattributes / .env.example / AI_DEVELOPMENT_GUIDE)
- ✅ 做了: `plugins/sales/README.md` Plugin 骨架占位
- ✅ 做了: 移动 `architecture.md` 到 `docs/architecture/`
- ✅ 做了: `.github/workflows/` 空目录，为 CI/CD 预留
- ⏸ 没做: 任何业务代码、AI 逻辑、页面、数据库、API
  **原因:** Task 0.1 明确禁止
- ⏸ 没做: Dockerfile / docker-compose.yml
  **原因:** Sprint 0 部署用 Vercel + Railway，Docker 延期到 Sprint 2+
- ⏸ 没做: `backend/app/main.py` 空文件
  **原因:** FastAPI 入口文件留给 Task 0.2，避免混淆"已建"和"未建"
- ⏸ 没做: 前端 `package.json` / 后端 `requirements.txt`
  **原因:** 依赖文件属于 Task 0.2 脚手架初始化

---

## 3. 潜在风险

- **风险:** `frontend/lib/` 在 Sprint 2 时可能膨胀到 20+ 文件，难以导航
  **触发条件:** `lib/` 下文件数超过 10
  **缓解:** 届时按功能拆为 `lib/api/` `lib/auth/` `lib/utils/`，本次已预留认知基础

- **风险:** `plugins/sales/` 空目录可能给开发者"应该写代码了"的暗示
  **触发条件:** 任何人在 Sprint 0-1 向 `plugins/sales/` 添加代码
  **缓解:** README 明确标注 "Reserved for future"，Codex 规范禁止提前实现

- **风险:** `.env.example` 中的默认值可能在真实部署时被遗忘修改
  **触发条件:** 部署到 Railway 时未覆盖 `JWT_SECRET`
  **缓解:** 在 Task 0.5 部署文档中强调此项

---

## 4. 进入下一 Task 前确认

- [ ] 目录命名是否与团队既有约定一致（如团队已有 `src/` 偏好）？
- [ ] `frontend/lib/` 合并是否被前端负责人接受？
- [ ] `plugins/` 放在项目根目录而非 `backend/` 内，是否符合"未来独立发布"意图？
- [ ] MIT License 是否满足商业需求（是否考虑 BSL / Elastic License）？
- [ ] `AI_DEVELOPMENT_GUIDE.md` 中 Section 11 的 REVIEW 协议是否可以接受？

---

## 5. 文件变更清单

### 新增
- `frontend/app/`
- `frontend/components/`
- `frontend/hooks/`
- `frontend/lib/`
- `frontend/store/`
- `frontend/styles/`
- `frontend/public/`
- `backend/app/api/`
- `backend/app/core/`
- `backend/app/models/`
- `backend/app/schemas/`
- `backend/app/services/`
- `backend/app/plugins/`
- `backend/app/utils/`
- `backend/tests/`
- `backend/migrations/`
- `plugins/sales/`
- `plugins/sales/README.md`
- `docs/adr/`
- `docs/api/`
- `docs/architecture/`
- `docs/sprint/`
- `docker/`
- `scripts/`
- `.github/workflows/`
- `README.md`
- `LICENSE`
- `.gitignore`
- `.editorconfig`
- `.gitattributes`
- `.env.example`

### 修改
- `AI_DEVELOPMENT_GUIDE.md` — 新增 Section 11 (Task 交付协议)

### 移动
- `docs/architecture.md` → `docs/architecture/architecture.md`
