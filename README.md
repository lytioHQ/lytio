# Lytio

> 插件化 AI Excel 分析平台。第一阶段：销售分析 AI。

---

## 项目定位

Lytio 帮助企业用户通过 AI 自动分析 Excel 数据，生成可视化报告与商业洞察。

**核心差异化：** 每新增一个行业分析方向，仅需新增一个 Plugin，无需改动核心框架。

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + ECharts |
| 后端 | Python FastAPI + SQLAlchemy 2.0 + pandas |
| 数据库 | PostgreSQL |
| AI | DeepSeek API |
| 部署 | Vercel (前端) + Railway (后端) |

---

## 目录说明

```
lytio/
├── frontend/           # Next.js 前端应用
├── backend/            # FastAPI 后端应用
├── plugins/            # 行业分析插件 (未来)
├── docs/               # 架构文档 / API文档 / Sprint记录
├── docker/             # Docker 配置 (Sprint 2+)
├── scripts/            # 工具脚本
└── .github/            # CI/CD (Sprint 2+)
```

---

## 开发原则

1. **第一性原则:** 每个模块必须回答——它是否帮助更快获得第一个付费用户？
2. **后端先行:** 先写模型 → API → 业务逻辑 → 最后写前端页面
3. **不过度设计:** 1个用例不写抽象层。第2个行业上线前再重构为插件架构。
4. **Sprint 0 目标:** 10天上线 MVP，验证付费意愿。

详见 `AI_DEVELOPMENT_GUIDE.md`

---

## Current Sprint

**Sprint 0 — MVP 上线**

| Task | 内容 | 状态 |
|------|------|------|
| 0.1 | 项目目录 + 根文件 | ✅ 完成 |
| 0.2 | 后端基础 + 数据库 | ⏳ 待开始 |
| 0.3 | 后端分析 + AI 调用 | ⏳ 待开始 |
| 0.4 | 前端骨架 + 页面 | ⏳ 待开始 |
| 0.5 | 联调 + 部署 | ⏳ 待开始 |

---

## Roadmap

```
Sprint 0 (2周)    Sprint 1 (1周)     Sprint 2 (2周)     Sprint 3+ (长期)
─────────────────────────────────────────────────────────────────────────
MVP 上线           Stripe 支付        第2行业插件          多租户
销售分析 AI        Redis 限流         异步任务队列         插件市场
单用户             分析历史            插件系统重构         企业版
```

---

## Completed

- [x] Task 0.1: 项目目录结构 + 根文件 + 开发规范

---

## Next Sprint

**Sprint 1** 将在获得第一个付费用户反馈后启动，优先级：

1. Stripe 支付集成
2. 分析历史记录
3. 根据用户反馈迭代

---

## License

MIT
