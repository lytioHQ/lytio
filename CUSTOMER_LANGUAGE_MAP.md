# CUSTOMER_LANGUAGE_MAP — Lytio 技术概念 → 客户语言对照表

> 版本：M2.14.2 Customer UAT Remediation
> 基准：当前工作区实际代码（`frontend/src/lib/i18n.ts`、`frontend/src/components/business/*`、`frontend/src/lib/demo/*`），不是规划文档。
> 原则：拒绝机械直译。每个词条按「系统里真实做什么」来翻译，并注明面向客户的可见位置。

---

## 一、核心概念映射

| 技术概念 | 客户语言 | 语义依据（来自代码） | 可见位置 |
| --- | --- | --- | --- |
| Schema / schema mapping | 数据字段确认 | 系统识别 Excel 每一列的业务含义，展示「销售金额 / 订单日期 / 客户…」，用户可确认 / 修改 / 跳过。工程术语 schema 不面向客户。 | 项目上传后的字段确认区 |
| Canonical field | 标准业务字段 | 系统统一的业务语义（如 sales_amount = 销售金额），不是「规范字段」这类名词。 | 字段确认表 |
| sales_amount | 销售金额 | `action.metric.total_sales`=销售额，字段级语义见 schema 确认页。用于计算销售额、增长率等。 | 字段确认表、指标卡 |
| order_date | 订单日期 | 用于销售增长对比与转化稳定性。 | 字段确认表、健康评分说明 |
| customer / customer_name | 客户 | 用于客户数、客户集中度。 | 字段确认表、指标卡 |
| quantity | 销售数量 | 字段确认表按实际识别结果展示。 | 字段确认表 |
| pipeline / pipeline_stage | 销售阶段（销售机会推进阶段） | 健康评分维度名 `pipeline_health` →「销售机会阶段完整度」；解释文案「用于判断销售机会是否记录了完整的推进阶段」。 | 健康评分维度 |
| missing field | 缺少必要字段：{字段} | `healthscore.missingField` + hint「当前文件中未找到该字段，暂时无法计算此维度；不影响其他可计算指标。」 | 健康评分维度、字段确认区 |
| need at least 2 months | 需要至少 2 个月的销售数据 | `healthscore.needTwoMonths` + hint「当前分析需要订单日期和销售金额，用于比较销售增长变化。」 | 健康评分维度（增长相关） |
| formula / 程序表达式 | 查看计算方式 | 公式与程序表达式移入「查看计算方式」折叠详情（`healthscore.formulaDetail`），主界面只显示业务含义。 | 健康评分折叠区 |
| engine version（health_score_v1 / metric_engine_v1） | 计算口径（默认隐藏） | 主界面不显示引擎版本；详情折叠区显示「计算口径：…」与引擎版本。审计/诊断层保留原始值。 | 健康评分折叠区、审计信息 |
| source commit / data_md5 / fixture | 内部一致性机制（不面向客户） | Demo 保留 source_commit / engine_version / demo-check 作为内部校验，但普通客户主界面不承担理解成本。 | 仅代码与诊断 |
| analysis #303 / run_id | 查看原始分析 | Action 来源显示「来源：销售分析建议」+「查看原始分析」链接；内部 `rec_recovery · #303` 移入 tooltip 详情。 | Action 卡 |
| rec_recovery / rec_aov 等内部建议 id | 销售分析建议 | 面向客户统一为「来源：销售分析建议」，不暴露内部 id。 | Action 卡 |

---

## 二、健康评分（Health Score）映射

| 技术概念 | 客户语言 | 语义依据 | 可见位置 |
| --- | --- | --- | --- |
| health_score | 健康度评分 / 总分 | `healthscore.score`=总分。 | 健康评分卡 |
| health_level | 等级 | Excellent=优秀 / Good=良好 / Fair=一般 / Concerning=需关注 / Critical=严重（`health.level.*`，四语言已本地化）。 | 健康评分卡、Memory 趋势 |
| coverage | 覆盖率 | 可计算维度占比，展示为百分比。 | 健康评分卡 |
| score_confidence | 置信度（高 / 中 / 低） | `healthscore.conf.*`。 | 健康评分卡 |
| pipeline_health | 销售机会阶段完整度 | 判断销售机会是否记录了完整的推进阶段。 | 健康评分维度 |
| conversion_stability | 转化稳定性 | 订单日期 / 销售金额按月变化计算。 | 健康评分维度 |
| revenue_quality | 收入质量 | 基于销售金额与增长。 | 健康评分维度 |
| customer_risk | 客户风险 | 基于客户数与集中度。 | 健康评分维度 |
| productivity | 销售产能 | 基于销售负责人相关字段（如存在）。 | 健康评分维度 |
| dimension unavailable | 无法计算 + 原因 | 「缺少必要字段」/「需要至少 2 个月的销售数据」/「无法计算」，绝不显示 0 或猜测分数。 | 健康评分维度 |

---

## 三、行动闭环（Action / Execution / Observation / Verification）映射

| 技术概念 | 客户语言 | 语义依据 | 可见位置 |
| --- | --- | --- | --- |
| action item | 业务行动任务 | `action.title`=业务行动任务。 | Action 区块 |
| recommendation → action | 建议转为行动任务 | `action.create`=将建议转为行动任务。 | Action 区块 |
| source recommendation | 来源：销售分析建议 | `action.sourceRecommendation`=销售分析建议。 | Action 卡 |
| execution | 执行记录 | `action.execution.title`=执行记录；「记录做了什么（例如：已对 20 个高意向客户完成 48 小时跟进）」。 | Action 卡 |
| observation | 执行后的数据观察 | 执行记录为事实日志；「对齐结果由系统按指标变化计算，AI 不判定任务是否完成，也不做因果断言」（`action.execution.hint`）。 | Action 卡、验证报告 |
| alignment = aligned | 方向一致（达到预期方向） | `action.alignment.aligned`=方向一致；文案「执行后，该指标向目标方向发生了变化」。 | Action 卡、Memory |
| alignment = not_aligned | 方向相反（未达到预期方向） | `action.alignment.not_aligned`=方向相反。 | Action 卡、Memory |
| alignment = unable_to_verify | 无法验证（暂时无法判断） | `action.alignment.unable_to_verify`=无法验证；必须说明原因（尚未执行 / 找不到对应指标 / 数据不足）。 | Action 卡、Memory |
| target metric | 目标指标（期望方向） | `action.target.bound`=目标指标：{metric}（期望{dir}）；未绑定显示「未绑定目标指标，无法对齐验证」。 | Action 卡 |
| verification | 效果验证 / 优化效果验证 | `verify.title`=验证优化效果；「这不是重新分析。上传执行建议后的最新数据，Lytio 会对比优化前后的变化」。 | Verification 页 |
| verdict | 整体判断 | 达到预期 / 部分达到预期 / 未达到预期 / 暂无法验证（`verifyReport.verdict.*`）。 | 验证报告 |
| reliability | 系统计算结果 | `verifyReport.reliability.verification_reliability_v1`=系统计算结果。 | 验证报告、Memory |
| metric change / before / after | 优化前后指标变化 | 验证表展示 before / after / 变化幅度 / 方向（上升 / 下降）。 | 验证报告、Demo |
| unable reason: not_executed | 尚未执行 | `memory.intel.unable_reason.not_executed`。 | Memory |
| unable reason: metric_unavailable | 找不到对应指标 | `memory.intel.unable_reason.metric_unavailable`。 | Memory |
| unable reason: insufficient_data | 数据不足 | `memory.intel.unable_reason.insufficient_data`。 | Memory |

---

## 四、经营档案（Memory / Intelligence）映射

| 技术概念 | 客户语言 | 语义依据 | 可见位置 |
| --- | --- | --- | --- |
| business memory | 企业经营记忆 / 经营档案 | `memory.title`=企业经营记忆；「基于历史分析、行动与验证自动积累的经营知识，只读展示」。 | Memory 卡 |
| memory intelligence | 经营改善分析 | `memory.intel.title`=经营改善分析；「基于执行记录与验证事实的代码计算结果，AI 不参与判定」。 | Memory 卡 |
| execution rate | 行动执行率 | `memory.intel.executionRate`；分母为 0 显示「–」（null），不显示 0%。 | Memory 卡 |
| verification rate | 验证覆盖率 | `memory.intel.verificationRate`；分母为 0 显示「–」。 | Memory 卡 |
| alignment trend | 方向一致性趋势 | 基于 action_observations 代码聚合（aligned / not_aligned / unable_to_verify）。 | Memory 卡 |
| improvement timeline | 改善证据时间线 | 只记录「执行后指标变化」「系统观察到指标方向一致」，禁止生成 improvement=true / success=true / cause=true。 | Memory 卡 |
| open loop | 待闭环事项 / 待处理事项 | `memory.openLoops`=待闭环事项；`memory.loop.notExecuted`=未执行行动；`memory.loop.longOpen`=长期未解决。未执行 ≠ 失败，未验证 ≠ 无效。 | Memory 卡 |
| period / cycle | 经营周期 | `demo.period.title`=经营周期；「每上传一份新的销售数据并完成一次分析，就形成一个经营周期。切换周期可以看到业务变化和行动执行后的结果。」 | Demo、Memory 趋势 |

---

## 五、指标名称映射（Metric Engine 输出 → 客户语言）

| 技术指标 | 客户语言 |
| --- | --- |
| total_sales | 销售额 |
| sales_growth | 销售增长 |
| order_count | 订单量 |
| average_order_value | 客单价 |
| customer_count | 客户数 |
| customer_concentration | 客户集中度 |
| product_sales_rank | 热销产品（示例：智能手表） |
| row_count / date_range | 数据规模 / 数据时间范围（详情层） |

依据：`action.metric.*` 与 Demo 指标卡文案。

---

## 六、禁止出现的面向客户词汇（主界面）

以下词汇仅允许出现在：开发者诊断、审计、技术详情、「查看计算方式」/「数据与计算说明」折叠区：

- schema（主界面 → 数据字段确认）
- engine / engine_version（→ 计算口径）
- metric（→ 指标）
- pipeline（→ 销售阶段 / 销售机会推进阶段）
- source（→ 来源）
- observation（→ 执行后的数据观察）
- alignment（→ 方向一致 / 方向相反 / 无法验证）
- reliability（→ 系统计算结果）
- fixture / source_commit / data_md5 / demo-check（→ 内部机制）
- analysis #303（→ 查看原始分析）

---

## 七、语言跟随规则

- 首页选择语言后，Demo 继承当前 UI language（`useUiLang()` + `t(uiLang, key, params)`）。
- 业务内容全部走 i18n key（`demo.*`、`healthscore.*`、`memory.*`、`verifyReport.*`、`action.*`），数值跨语言一致（`demo_result.json` 只存事实与稳定 id）。
- 健康等级、验证结论、无法验证原因等枚举值均已四语言本地化（zh / en / ja / de）。

---

## 八、AI 角色表述（全站统一口径）

面向客户统一表述（示例，按页面实际文案）：

> Lytio 是 AI 驱动的企业经营分析与决策闭环系统：数据负责告诉你发生了什么，AI 帮你理解为什么值得关注，以及下一步应该做什么。

同时严格禁止：

- 暗示 AI 计算数字（数值一律来自代码计算）；
- 暗示 AI 判断行动是否完成（只记录事实变化）；
- 生成任何未经数据证明的因果结论（如「因为 Action 所以指标提升」）。
