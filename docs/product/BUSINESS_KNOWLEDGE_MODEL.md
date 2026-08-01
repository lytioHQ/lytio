# ExcelPilot Business Knowledge Model v1.0

**Status:** Active  
**Version:** 1.0  
**Last Updated:** 2026-07-27  
**Scope:** Platform-wide — all Plugins, all Consultants, all Reports  
**Depends on:** [PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md)

---

## 1. Overview

### Why Business Objects Exist

ExcelPilot is a platform of industry consultants. If every consultant speaks a different language, the platform cannot grow. A Sales Consultant must produce outputs that a Finance Consultant can consume. An HR Consultant must understand risk in the same way an Inventory Consultant does.

Business Objects are the **universal vocabulary** of the platform.

### The Core Question

> If ExcelPilot has 100 industry consultants, how do they communicate using the same business language?

**Answer:** They communicate through shared Business Objects. Every consultant produces and consumes the same object types. The objects constrain what can be said, ensuring every consultant speaks the same language regardless of industry.

### Design Philosophy

- **Stability over flexibility.** Objects change rarely. Plugins change frequently.
- **Completeness over minimalism.** Every meaningful business concept has a home.
- **Relationships over isolation.** Objects gain meaning through their connections to other objects.
- **Evidence over assertion.** Every conclusion must be traceable to data.

---

## 2. Object Hierarchy

```
                    +-------------------+
                    | Business Health   |  Top-level assessment
                    +--------+----------+
                             |
              +--------------+--------------+
              |              |              |
     +--------v----+ +------v------+ +-----v-------+
     | Metric       | | Metric      | | Metric      |  Quantified measurements
     +--------+-----+ +------+------+ +-----+-------+
              |              |              |
     +--------v--------------v--------------v-------+
     |                  Insight                     |  Patterns & findings
     +--------+----------------------+-------------+
              |                      |
     +--------v--------+   +--------v--------+
     | Evidence         |   | Evidence        |         Supporting data
     +--------+---------+   +--------+--------+
              |                      |
     +--------v--------+   +--------v--------+
     | Risk             |   | Opportunity     |         Threats & possibilities
     +--------+---------+   +--------+--------+
              |                      |
              +----------+-----------+
                         |
                +--------v--------+
                | Decision         |                    Choices to make
                +--------+--------+
                         |
                +--------v--------+
                | Action           |                    Concrete steps
                +--------+--------+
                         |
                +--------v--------+
                | Mission          |                    Tracked assignments
                +--------+--------+
                         |
                +--------v--------+
                | Executive        |
                | Summary          |                    Final report
                +------------------+
```

### Hierarchy Rules

1. Every object type depends on the object type above it.
2. Objects at the same level may reference each other.
3. An object may reference multiple objects from the level above.
4. An object must never reference objects below its own level (no circular dependencies).
5. Business Health sits at the top. Executive Summary sits at the bottom as the final aggregation.

---

## 3. Business Objects

### 3.1 Dataset

| Attribute | Description |
|-----------|-------------|
| **Purpose** | Raw structured data uploaded by the user. The foundation of all analysis. |
| **Fields** | `name`, `source_file`, `sheet_name`, `headers[]`, `column_types{}`, `rows[][]`, `upload_timestamp`, `row_count`, `column_count` |
| **Lifecycle** | Uploaded → Validated → Normalized → Ready → Archived |
| **Relationships** | Generates: Metrics. Referenced by: Evidence |
| **Owner** | Analysis Engine |
| **Example** | A monthly sales spreadsheet with columns: Date, Product, Revenue, Quantity, Region |

### 3.2 Metric

| Attribute | Description |
|-----------|-------------|
| **Purpose** | A single quantified measurement derived from the dataset. The atomic unit of business intelligence. |
| **Fields** | `name`, `value`, `unit`, `trend` (up/down/stable), `benchmark`, `category`, `calculation_method`, `confidence` |
| **Lifecycle** | Calculated → Validated → Published → Updated → Deprecated |
| **Relationships** | Generated from: Dataset (1 or more). Generates: Insights. Referenced by: Business Health |
| **Owner** | Business Playbook (Plugin) |
| **Example** | Total Revenue = $1,789,000; Growth Rate = +12.3%; Average Order Value = $463 |

### 3.3 Insight

| Attribute | Description |
|-----------|-------------|
| **Purpose** | A meaningful pattern, finding, or conclusion discovered from one or more metrics. |
| **Fields** | `title`, `description`, `category`, `confidence`, `impact` (high/medium/low), `evidence_refs[]`, `related_metrics[]`, `discovered_at` |
| **Lifecycle** | Discovered → Reviewed → Published → Updated → Superseded |
| **Relationships** | Generated from: Metrics (1+). Supported by: Evidence (1+). Generates: Risks, Opportunities |
| **Owner** | Business Playbook (Plugin) |
| **Example** | "Smartwatch revenue grew 56% over 6 months, making it the fastest-growing product category." |

### 3.4 Evidence

| Attribute | Description |
|-----------|-------------|
| **Purpose** | Concrete data that supports or refutes an insight, risk, or opportunity. No unsupported conclusions. |
| **Fields** | `type` (data_point/chart/calculation/historical/rule), `description`, `source_dataset`, `source_rows[]`, `source_columns[]`, `value`, `confidence` |
| **Lifecycle** | Collected → Validated → Attached → Reviewed → Retained |
| **Relationships** | References: Dataset. Supports: Insight, Risk, Opportunity, Decision |
| **Owner** | Analysis Engine |
| **Example** | "Rows 5-16 show smartwatch revenue: Jan $125K → Jun $195K, a 56% increase." |

### 3.5 Risk

| Attribute | Description |
|-----------|-------------|
| **Purpose** | A potential problem, threat, or concerning signal requiring attention. |
| **Fields** | `title`, `description`, `severity` (critical/high/medium/low), `category`, `probability`, `impact_area`, `trend` (worsening/stable/improving), `evidence_refs[]`, `detected_at` |
| **Lifecycle** | Detected → Verified → Prioritized → Assigned → Mitigated → Resolved → Archived |
| **Relationships** | Generated from: Insights (1+). Supported by: Evidence (1+). Generates: Decisions |
| **Owner** | Business Playbook (Plugin) |
| **Example** | "Bluetooth headphone sales declined 13.7% in June. Severity: Medium. Trend: Worsening." |

### 3.6 Opportunity

| Attribute | Description |
|-----------|-------------|
| **Purpose** | A positive growth, improvement, or optimization possibility. |
| **Fields** | `title`, `description`, `potential_impact` (high/medium/low), `effort_required` (high/medium/low), `timeframe` (immediate/short/medium/long), `category`, `evidence_refs[]`, `detected_at` |
| **Lifecycle** | Detected → Qualified → Prioritized → Pursued → Realized → Archived |
| **Relationships** | Generated from: Insights (1+). Supported by: Evidence (1+). Generates: Decisions |
| **Owner** | Business Playbook (Plugin) |
| **Example** | "Expand tablet sales to East and South China — currently $0 in both regions, potential $500K+ annually." |

### 3.7 Decision

| Attribute | Description |
|-----------|-------------|
| **Purpose** | A proposed course of action in response to risks or opportunities. The bridge between analysis and execution. |
| **Fields** | `title`, `description`, `rationale`, `expected_outcome`, `priority` (critical/high/medium/low), `status` (suggested/approved/rejected/executing/completed), `related_risks[]`, `related_opportunities[]`, `evidence_refs[]` |
| **Lifecycle** | Suggested → Approved → Executing → Completed → Reviewed |
| **Relationships** | Generated from: Risks, Opportunities. Generates: Actions, Missions |
| **Owner** | Business Playbook (Plugin) |
| **Example** | "Launch tablet promotion in East China region. Expected outcome: $150K incremental revenue in Q3." |

### 3.8 Action

| Attribute | Description |
|-----------|-------------|
| **Purpose** | A concrete, executable step. The smallest unit of work derived from analysis. |
| **Fields** | `description`, `owner`, `deadline`, `status` (open/doing/done), `priority`, `parent_decision`, `expected_outcome` |
| **Lifecycle** | Open → Doing → Done → Verified |
| **Relationships** | Generated from: Decisions. May be grouped into: Missions |
| **Owner** | Workspace |
| **Example** | "Create tablet promotional pricing by Friday. Owner: Marketing Manager." |

### 3.9 Mission

| Attribute | Description |
|-----------|-------------|
| **Purpose** | A group of related actions organized toward a single business objective. A project derived from decisions. |
| **Fields** | `title`, `objective`, `actions[]`, `status` (planned/active/completed/cancelled), `start_date`, `target_date`, `progress_percent`, `parent_decision` |
| **Lifecycle** | Planned → Active → Completed → Archived |
| **Relationships** | Generated from: Decisions (1+). Contains: Actions (1+) |
| **Owner** | Workspace |
| **Example** | "Q3 East China Expansion: 5 actions including pricing, marketing, distribution setup." |

### 3.10 Executive Summary

| Attribute | Description |
|-----------|-------------|
| **Purpose** | The final, polished report combining all findings into a professional business document. |
| **Fields** | `title`, `generated_at`, `period_covered`, `business_health_score`, `executive_narrative`, `key_insights[]`, `top_risks[]`, `top_opportunities[]`, `recommended_decisions[]`, `action_plan[]`, `confidence_overall` |
| **Lifecycle** | Generated → Reviewed → Published → Archived |
| **Relationships** | Aggregates: Business Health, Insights, Risks, Opportunities, Decisions, Actions |
| **Owner** | Business Playbook (Plugin) |
| **Example** | Monthly Sales Executive Report for CEO: score 72/100, 4 key findings, 3 risks, 5 recommendations. |

### 3.11 Business Health

| Attribute | Description |
|-----------|-------------|
| **Purpose** | The highest-level assessment of business condition. The first thing every user sees. |
| **Fields** | `overall_score` (0-100), `trend` (improving/stable/declining), `critical_drivers[]`, `category_scores{}` (revenue/growth/risk/efficiency), `compared_to_previous`, `generated_at` |
| **Lifecycle** | Calculated → Displayed → Updated (per analysis) → Historical comparison |
| **Relationships** | Calculated from: Metrics (all). Referenced by: Executive Summary |
| **Owner** | Business Playbook (Plugin) |
| **Example** | Health Score: 72/100. Trend: Improving (+5 vs last month). Critical driver: Revenue growth (+12.3%). |

---

## 4. Relationships

### The Generation Chain

Every analysis follows a deterministic chain. Objects flow from raw data to final report through defined relationships.

```
Dataset ──produces──> Metrics ──reveal──> Insights
                               │
              +────────────────+────────────────+
              |                                 |
        Evidence (required)            Evidence (required)
              |                                 |
              v                                 v
            Risks <──supported by── Insights ──supported by──> Opportunities
              |                                                   |
              +─────────────────────+─────────────────────────────+
                                    |
                                    v
                              Decisions ──break into──> Actions
                                                           │
                                                           v
                                                      Missions
                                                           │
                              +────────────────────────────+
                              |
                              v
                       Executive Summary
```

### Relationship Rules

1. Every Insight must reference at least one piece of Evidence.
2. Every Risk must reference at least one Insight and one piece of Evidence.
3. Every Opportunity must reference at least one Insight and one piece of Evidence.
4. Every Decision must reference at least one Risk or Opportunity.
5. Every Action must reference exactly one Decision.
6. A Mission must reference at least one Decision and contain at least one Action.
7. An Executive Summary aggregates all objects but creates no new findings.

### Cross-Object References

Objects reference each other by ID. The platform maintains referential integrity:

- Deleting a Dataset cascades to delete all derived Metrics, Insights, Risks, Opportunities, Decisions, Actions.
- Archiving a Risk or Opportunity preserves it but removes it from active views.
- A Decision marked "Completed" freezes its Actions.

---

## 5. Lifecycle

### Risk Lifecycle

```
Detected ──> Verified ──> Prioritized ──> Assigned ──> Mitigated ──> Resolved ──> Archived
   |             |             |              |             |            |
   v             v             v              v             v            v
Automated    Human or     Severity +      Owner +       Action       Risk no
by AI        rule check   impact          deadline      taken        longer active
```

**States:**
- **Detected:** AI has identified a potential risk. Not yet reviewed.
- **Verified:** Human or rule-based check confirms the risk is valid.
- **Prioritized:** Severity and impact assessed. Ranked against other risks.
- **Assigned:** Owner assigned with target resolution date.
- **Mitigated:** Actions taken to reduce or eliminate the risk.
- **Resolved:** Risk no longer presents a threat.
- **Archived:** Historical record. Not displayed in active views.

### Opportunity Lifecycle

```
Detected ──> Qualified ──> Prioritized ──> Pursued ──> Realized ──> Archived
```

**States:**
- **Detected:** AI has identified a potential opportunity.
- **Qualified:** Impact and effort assessed. Viability confirmed.
- **Prioritized:** Ranked against other opportunities.
- **Pursued:** Active investment in capturing the opportunity.
- **Realized:** Opportunity captured. Benefits measured.
- **Archived:** Historical record.

### Decision Lifecycle

```
Suggested ──> Approved ──> Executing ──> Completed ──> Reviewed
   |             |             |              |            |
   v             v             v              v            v
AI or human   Manager       Actions        All actions   Outcome
proposes      confirms       in progress    done          evaluated
```

### Action Lifecycle

```
Open ──> Doing ──> Done ──> Verified
```

### Metric Lifecycle

```
Calculated ──> Validated ──> Published ──> Updated ──> Deprecated
```

### Lifecycle Principles

- Every object has a defined terminal state.
- Objects in terminal states are preserved for history, not deleted.
- Active views show only non-terminal objects by default.
- Lifecycle transitions are recorded with timestamps and actor attribution.

---

## 6. Confidence System

### Why Confidence Matters

AI produces insights, but not all insights are equally reliable. The Confidence System ensures users understand the reliability of every AI-generated output.

### Confidence Levels

| Level | Value | Meaning | Visual Indicator |
|-------|-------|---------|------------------|
| **High** | 0.8 – 1.0 | Strong supporting evidence, clear pattern, high data quality | Green |
| **Medium** | 0.5 – 0.79 | Adequate evidence, moderate pattern strength, acceptable data quality | Yellow |
| **Low** | 0.0 – 0.49 | Weak or conflicting evidence, ambiguous pattern, poor data quality | Red |

### Confidence Assignment

Confidence is assigned based on:

1. **Data Quality:** Completeness, consistency, and recency of supporting data.
2. **Pattern Strength:** Statistical significance, trend clarity, outlier status.
3. **Evidence Count:** Number and diversity of supporting evidence items.
4. **Rule Conformance:** How well the finding aligns with known business rules.

### Confidence Propagation

- A low-confidence Metric cannot produce a high-confidence Insight.
- A high-confidence Risk with low-confidence Evidence downgrades to medium.
- An Executive Summary with mixed-confidence findings reports overall confidence as the minimum of its components.

### Confidence in UI

- High-confidence items: displayed prominently.
- Medium-confidence items: displayed with a qualifier ("likely", "may indicate").
- Low-confidence items: displayed with strong qualification ("preliminary finding", "requires verification") or suppressed entirely.

---

## 7. Evidence System

### The Rule of Evidence

> Every conclusion must be traceable to data. No unsupported assertions.

### Evidence Types

| Type | Description | Example |
|------|-------------|---------|
| **Data Point** | A specific value from the dataset | "Revenue in June: $195,000 (row 6, column C)" |
| **Chart Reference** | A generated visualization | "Revenue trend chart: Jan–Jun 2026" |
| **Calculation** | A derived computation with formula | "Growth rate = (195K - 125K) / 125K = 56%" |
| **Historical Comparison** | Comparison to prior period | "vs June 2025: +$45,000 (+30%)" |
| **Business Rule** | A platform-defined rule triggered | "Rule: Revenue decline >10% for 2 consecutive months = risk alert" |

### Evidence Requirements by Object

| Object | Minimum Evidence | Evidence Type Constraints |
|--------|-----------------|--------------------------|
| Insight | 1+ | Must include at least 1 Data Point or Calculation |
| Risk | 2+ | Must include at least 1 Data Point. Recommend Historical Comparison |
| Opportunity | 2+ | Must include at least 1 Data Point. Recommend Calculation |
| Decision | 1+ | Must reference the Risk or Opportunity Evidence |

### Evidence Traceability

Every piece of Evidence links to:

- **Source Dataset:** Which upload it came from.
- **Source Rows:** Specific data rows referenced.
- **Source Columns:** Specific columns referenced.
- **Calculation:** If derived, the formula or method used.

This enables full audit trail: Executive Summary → Decision → Risk → Insight → Evidence → Dataset Row.

---

## 8. Business Health

### The Business Health Score

The Business Health Score is a single number (0–100) representing overall business condition. It is the first thing every user sees after analysis.

### Scoring Philosophy

The score is not a simple average. It is a weighted composite reflecting business priorities:

| Component | Weight | Description |
|-----------|--------|-------------|
| Revenue Health | 30% | Revenue levels, growth rate, consistency |
| Profitability | 25% | Margins, cost efficiency, ROI |
| Growth Trajectory | 20% | Month-over-month and year-over-year trends |
| Risk Exposure | 15% | Number and severity of active risks |
| Operational Efficiency | 10% | Productivity ratios, utilization, turnover |

### Score Interpretation

| Range | Label | Meaning |
|-------|-------|---------|
| 80–100 | Excellent | Strong performance across all dimensions. No critical risks. |
| 60–79 | Good | Solid performance. Some areas for improvement. Manageable risks. |
| 40–59 | Fair | Mixed performance. Several risks requiring attention. |
| 20–39 | Concerning | Below expectations. Multiple active risks. Action required. |
| 0–19 | Critical | Severe problems. Immediate intervention needed. |

### Trend Indicator

- **Improving:** Score increased by 5+ points vs previous period.
- **Stable:** Score changed by less than 5 points.
- **Declining:** Score decreased by 5+ points vs previous period.

### Critical Drivers

The top 3 factors (positive or negative) most influencing the score. Displayed alongside the score to give immediate context.

Example: "Score: 72 (Improving). Drivers: Revenue growth (+12.3%), Margin pressure (−4.2%), Market expansion (+8.1%)."

---

## 9. Executive Report Structure

### Standard Report Sections

Every plugin produces an Executive Report with this structure:

```
1. Business Health
   Score, Trend, Critical Drivers, Period Comparison
   
2. Executive Summary
   2-3 paragraph narrative. CEO-ready. No data jargon.
   
3. Key Insights
   Top 3-5 findings. Each with confidence level and supporting evidence.
   
4. Risk Analysis
   Active risks ranked by severity. Mitigation status for each.
   
5. Opportunities
   Qualified opportunities ranked by potential impact.
   
6. Recommended Decisions
   Prioritized decisions with rationale and expected outcomes.
   
7. Action Plan
   Concrete actions grouped by mission. Owners and deadlines.
   
8. Appendix
   Detailed data tables, methodology notes, evidence references.
```

### Report Principles

- **CEO-ready:** The Executive Summary must be understandable without reading the rest.
- **Action-oriented:** Every section must answer "What should we do about this?"
- **Evidence-backed:** Every claim must reference data.
- **Confidence-transparent:** Every finding must display its confidence level.
- **Time-stamped:** Every report is dated and covers a defined period.

### Report as a Product

The Executive Report is a product in itself. Users should be able to:

- Export to PDF for stakeholder distribution.
- Share via link within the organization.
- Compare with previous reports to see trends over time.
- Bookmark specific findings for follow-up.

---

## 10. Cross-Plugin Compatibility

### The Shared Language Problem

Sales Consultant analyzes revenue, products, and regions.  
Finance Consultant analyzes costs, margins, and cash flow.  
HR Consultant analyzes headcount, attrition, and performance.  
Inventory Consultant analyzes stock levels, turnover, and supply chain.

If each consultant defines "Risk" differently, the platform cannot aggregate, compare, or cross-reference findings across consultants.

### How Compatibility Works

All consultants share the same Business Objects (Section 3). The objects are:

- **Structure-compatible:** Same fields, same types, same lifecycle states.
- **Semantics-compatible:** Same meaning. "Risk" means the same thing to Sales, Finance, and HR.
- **Relationship-compatible:** Same dependency graph. A Finance Risk references Finance Insights and Finance Evidence, just as a Sales Risk references Sales objects.

### What Differs Between Plugins

Plugins differ in **content**, not **structure**:

| Aspect | Same Across Plugins | Different Per Plugin |
|--------|---------------------|---------------------|
| Object types | All 11 Business Objects | — |
| Object relationships | Generation chain (Section 4) | — |
| Object lifecycles | State machines (Section 5) | — |
| Metric definitions | — | Sales: Revenue, Growth Rate. Finance: Margin, Cash Flow. HR: Attrition, Headcount |
| Risk categories | — | Sales: Market Risk, Product Risk. Finance: Liquidity Risk, Credit Risk |
| Confidence assignment | Same formula | — |
| Evidence requirements | Same rules | — |
| Business Health weights | — | Sales: Revenue 30%. Finance: Profitability 35%. HR: Attrition 25% |
| Executive Report content | Same structure | Different content per plugin |

### Cross-Plugin Aggregation (Future)

When a user activates multiple consultants, the platform can aggregate:

- **Unified Business Health:** Weighted composite across all active plugins.
- **Cross-Plugin Risks:** "Revenue decline (Sales) + Rising costs (Finance) = Margin squeeze (Cross-Plugin)."
- **Enterprise Dashboard:** Single view of all active consultant findings.

This is possible because all consultants produce the same object types with the same semantics.

---

## 11. Future Evolution

### Adding New Plugins

A new plugin only needs to:

1. Define its industry-specific Metrics (which feed into the shared Insight object).
2. Define industry-specific Risk categories (which use the shared Risk object).
3. Define industry-specific Business Health component weights.
4. Generate industry-specific Evidence (which uses the shared Evidence object).

No new Business Object types are needed. The existing 11 objects cover all business domains.

### Adding New Object Types

If a genuinely new business concept emerges that does not fit any existing object:

1. **Propose** the new object type with purpose, fields, lifecycle, and relationships.
2. **Review** against the existing 11 objects. Can it be represented as a subtype or extension?
3. **If approved:** Add to the Business Knowledge Model. All existing plugins must be reviewed for compatibility.
4. **Version the model** (see below).

New object types should be rare. The existing 11 objects were designed to be comprehensive.

### Versioning Strategy

| Version | Change Type | Impact |
|---------|-------------|--------|
| 1.0 → 1.1 | Add optional fields to existing objects | Backward compatible. No plugin changes required. |
| 1.0 → 2.0 | Add new object type or change required fields | All plugins must be updated. Migration plan required. |
| 1.0 → 1.0.1 | Clarify documentation, add examples | No impact. |

### Backward Compatibility

- Optional fields may be added without a major version bump.
- Required fields may only be added in a major version.
- Existing fields must never be removed (deprecate instead).
- Existing field types must never change.

### Evolution Principles

1. **Business objects are the most stable layer.** They change less often than plugins, UI, or AI providers.
2. **Extend, don't break.** Add new objects or fields. Never remove or repurpose existing ones.
3. **All plugins evolve together.** A major model version means all plugins update simultaneously.
4. **The platform grows around these objects.** New features, new consultants, new capabilities are built on this foundation.

---

## Appendix A: Object Summary Matrix

| Object | Generates | Generated From | Minimum Evidence | Terminal State |
|--------|-----------|---------------|------------------|----------------|
| Dataset | Metrics | User upload | N/A | Archived |
| Metric | Insights | Dataset | N/A | Deprecated |
| Insight | Risks, Opportunities | Metrics | 1 Evidence | Superseded |
| Evidence | — | Dataset | N/A | Retained |
| Risk | Decisions | Insights | 2 Evidence | Archived |
| Opportunity | Decisions | Insights | 2 Evidence | Archived |
| Decision | Actions, Missions | Risks, Opportunities | 1 Evidence | Reviewed |
| Action | — | Decisions | N/A | Verified |
| Mission | — | Decisions | N/A | Archived |
| Executive Summary | — | All objects | N/A | Archived |
| Business Health | — | Metrics | N/A | Updated (per analysis) |

---

## Appendix B: Glossary

| Term | Definition |
|------|-----------|
| **Business Object** | A structured data entity in the platform's universal vocabulary |
| **Plugin** | A self-contained industry consultant (e.g., Sales Consultant) |
| **Playbook** | The industry knowledge encoded in a plugin (metrics, rules, thresholds) |
| **Confidence** | A 0-1 score indicating the reliability of an AI-generated output |
| **Evidence** | Concrete data that supports a business conclusion |
| **Lifecycle** | The defined state transitions for a business object |
| **Generation Chain** | The deterministic flow from Dataset → Metrics → Insights → Risks/Opportunities → Decisions → Actions → Executive Summary |

---

*This document defines the universal business language of ExcelPilot. All plugins must conform to this model. The objects defined here are the vocabulary through which every AI Consultant communicates. Changes to this document require platform-wide review and a version bump per the Versioning Strategy (Section 11).*