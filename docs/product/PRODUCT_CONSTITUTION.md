# Lytio Product Constitution v1.0

**Status:** Active  
**Version:** 1.0  
**Last Updated:** 2026-07-27  
**Author:** Lytio Product Team
**Scope:** Company-wide — all Sprints, all Plugins, all Features

---

## 1. Vision

### What is Lytio?

Lytio is an **AI Business Consultant Platform**.

Lytio is NOT an AI chat website.
Lytio is NOT an Excel analysis tool.

Lytio transforms business data into business decisions.

### Core Belief

Business data is abundant. Business decisions are scarce.

Most organizations have spreadsheets full of data.  
Most organizations lack the time, expertise, or frameworks to extract decisions from that data.

Lytio bridges this gap by embedding industry expertise into AI workflows.

### Mission

Make every business decision data-informed, not data-overwhelmed.

---

## 2. Product Principles

These principles are **mandatory**. Every feature, every Sprint, every plugin must satisfy them.

| # | Principle | Meaning |
|---|-----------|---------|
| 1 | **AI serves business** | AI is a means. Business outcomes are the end. Never showcase AI for its own sake. |
| 2 | **Business value before AI capability** | A simple rule that saves $10,000 is better than a sophisticated model that generates curiosity. |
| 3 | **Action is more valuable than analysis** | Analysis without recommended action is incomplete. Every output must answer "What should I do?" |
| 4 | **Workflow is more valuable than conversation** | A guided workflow produces consistent results. Free-form chat produces inconsistent results. The product leads; the user follows. |
| 5 | **Industry knowledge is more valuable than model intelligence** | A mediocre model with a sales playbook outperforms a superior model without one. Plugins are knowledge containers. |
| 6 | **Enterprise memory is more valuable than one-time answers** | Every analysis should build on previous analyses. The platform should remember context across sessions. |
| 7 | **Every feature must save time or improve decisions** | If a feature does neither, it does not belong in the product. |
| 8 | **Never expose implementation details to customers** | Customers buy business insights. They do not buy model names, provider configurations, prompt versions, or pipeline stages. |

### Design Heuristics

- If a feature requires explaining AI concepts to users, redesign it.
- If a screen can be understood in under 5 seconds, it passes.
- If adding a feature requires modifying more than one plugin, the architecture is wrong.

---

## 3. Target Customers

### Primary

| Role | Need | Use Case |
|------|------|----------|
| Sales Managers | Understand sales performance, identify risks, plan actions | Monthly sales review |
| Business Managers | Cross-department performance visibility | Quarterly business review |
| SME Owners | Data-driven decisions without a data team | Weekly business check-in |
| Department Managers | Department-specific KPI tracking and planning | Operational reviews |

### Secondary

| Role | Need | Use Case |
|------|------|----------|
| Financial Managers | P&L analysis, cost optimization | Financial planning |
| HR Managers | Workforce analytics, attrition risk | People strategy |
| Operations Managers | Supply chain, inventory, logistics | Operational efficiency |

### Anti-Persona

We do **not** target:

- AI enthusiasts who want to experiment with models
- Data scientists who want to build custom pipelines
- Developers who want an API platform
- General consumers with personal spreadsheets

The product is for **business decision-makers**, not technology explorers.

---

## 4. Competitive Position

### Competitive Landscape

| Competitor | Strength | Weakness |
|------------|----------|----------|
| ChatGPT / DeepSeek | General intelligence, flexible | No industry structure, no memory, no workflow |
| Power BI / Tableau | Visualization, enterprise | No recommendations, no actions, steep learning curve |
| Excel | Ubiquitous, familiar | Manual analysis, no AI, no guidance |

### Lytio's Differentiation

Lytio does not compete on AI capability.
Lytio competes on **business structure**.

| Dimension | ChatGPT | Power BI | Lytio |
|-----------|---------|----------|------------|
| Industry Playbooks | None | None | **Core** |
| Business Workflow | None | Manual | **Guided** |
| Enterprise Memory | None | Limited | **Built-in** |
| Actionable Recommendations | Generic | None | **Primary output** |
| Consultant Experience | Chat | Dashboard | **Consultant workspace** |

### Positioning Statement

> Lytio is the first AI platform that thinks like a business consultant, not like a chatbot.

---

## 5. Product Layers

The platform is organized into four layers. Each layer has a single responsibility.

```
+----------------------------------+
|        L1: Workspace             |  User interface, navigation, session
+----------------------------------+
|        L2: Business Playbooks    |  Industry knowledge, metrics, rules
+----------------------------------+
|        L3: Analysis Engine       |  Data processing, orchestration, dispatch
+----------------------------------+
|        L4: AI Provider           |  Model communication, response parsing
+----------------------------------+
```

### Layer 1: Workspace

**Responsibility:** Present business insights. Guide the user through analysis workflows.

- Renders reports, recommendations, and actions
- Manages navigation between plugins
- Handles user preferences (language, industry)
- Never contains business logic
- Never calls AI providers directly

### Layer 2: Business Playbooks

**Responsibility:** Encode industry expertise.

- Defines what to analyze (metrics, KPIs)
- Defines how to analyze (business rules, thresholds)
- Defines what to recommend (action templates)
- Generates prompts for the Analysis Engine
- Each plugin is a self-contained playbook

### Layer 3: Analysis Engine

**Responsibility:** Orchestrate data processing and AI invocation.

- Receives structured data from the pipeline
- Validates input completeness
- Dispatches to the appropriate AI provider
- Returns provider-independent responses
- Never contains industry knowledge
- Never contains UI logic

### Layer 4: AI Provider

**Responsibility:** Communicate with AI models.

- Sends HTTP requests to model APIs
- Handles authentication, retries, timeouts
- Parses raw responses into structured formats
- Never contains business logic
- Never contains prompt logic
- Replaceable without affecting any other layer

### Layer Invariants

- Higher layers may depend on lower layers. Lower layers must never depend on higher layers.
- No layer may skip the layer directly below it.
- Changing an AI provider must require changes only in Layer 4.

---

## 6. Core Business Objects

These objects form the data vocabulary of the platform. Every plugin operates on these objects.

### Dataset

| Attribute | Description |
|-----------|-------------|
| **Purpose** | Raw structured data uploaded by the user |
| **Fields** | workbook_name, sheet_name, headers, column_types, rows |
| **Lifecycle** | Upload → Validate → Normalize → Ready for analysis |
| **Owner** | Analysis Engine (Layer 3) |

### Insight

| Attribute | Description |
|-----------|-------------|
| **Purpose** | A meaningful pattern or finding discovered in the data |
| **Fields** | title, description, confidence, supporting_data, category |
| **Lifecycle** | Discovered by AI → Reviewed → Presented to user |
| **Owner** | Business Playbook (Layer 2) |

### Risk

| Attribute | Description |
|-----------|-------------|
| **Purpose** | A potential problem or concerning signal |
| **Fields** | title, severity (high/medium/low), impact_area, description, trend |
| **Lifecycle** | Identified by AI → Prioritized → Presented with mitigation |
| **Owner** | Business Playbook (Layer 2) |

### Opportunity

| Attribute | Description |
|-----------|-------------|
| **Purpose** | A positive growth or improvement opportunity |
| **Fields** | title, potential_impact, effort_required, timeframe, description |
| **Lifecycle** | Identified by AI → Qualified → Presented with action plan |
| **Owner** | Business Playbook (Layer 2) |

### Mission

| Attribute | Description |
|-----------|-------------|
| **Purpose** | A recommended action that the user should take |
| **Fields** | title, priority, expected_outcome, steps, deadline |
| **Lifecycle** | Generated → Assigned → Tracked → Completed |
| **Owner** | Business Playbook (Layer 2) |

### Action

| Attribute | Description |
|-----------|-------------|
| **Purpose** | A concrete, executable step derived from analysis |
| **Fields** | description, owner, deadline, status, related_insight |
| **Lifecycle** | Created → In Progress → Done |
| **Owner** | Workspace (Layer 1) |

### Executive Summary

| Attribute | Description |
|-----------|-------------|
| **Purpose** | A concise overview of the entire analysis |
| **Fields** | summary_text, key_metrics, top_findings, generated_at |
| **Lifecycle** | Generated after analysis → Displayed as report header |
| **Owner** | Business Playbook (Layer 2) |

### Business Health

| Attribute | Description |
|-----------|-------------|
| **Purpose** | A high-level assessment of business condition |
| **Fields** | overall_score (0-100), trend (up/stable/down), key_drivers |
| **Lifecycle** | Calculated from insights + risks → Updated with each analysis |
| **Owner** | Business Playbook (Layer 2) |

---

## 7. Consultant Workflow

Every plugin follows the Consultant Workflow. This is the standard user journey.

```
1. Upload Dataset
       |
2. Business Health Assessment
       |
3. Insights Discovery
       |
4. Risk Identification
       |
5. Opportunity Detection
       |
6. Recommended Actions
       |
7. Executive Report
       |
8. Follow-up Deep Analysis
       |
   (loop back to 3 as needed)
```

### Stage Definitions

**Stage 1: Upload Dataset**  
User provides business data. The platform validates structure, detects data types, and normalizes into the Canonical Dataset format.

**Stage 2: Business Health Assessment**  
High-level snapshot: overall score, trend direction, key metrics at a glance. Answers "How is my business doing?"

**Stage 3: Insights Discovery**  
AI identifies meaningful patterns: growth trends, anomalies, correlations, standout performers. Answers "What happened?"

**Stage 4: Risk Identification**  
AI flags concerning signals: declining metrics, concentration risks, negative trends, outliers. Answers "What should I worry about?"

**Stage 5: Opportunity Detection**  
AI identifies positive signals: underserved segments, high-growth products, efficiency gains. Answers "What can I improve?"

**Stage 6: Recommended Actions**  
Concrete, prioritized recommendations. Each action includes expected outcome and implementation guidance. Answers "What should I do?"

**Stage 7: Executive Report**  
Structured, professional report combining all findings. Ready for presentation to stakeholders.

**Stage 8: Follow-up Deep Analysis**  
User explores specific areas in depth. AI guides with recommended next questions. The platform leads; the user chooses direction.

### Workflow Principles

- The workflow must be completable without the user typing a single question.
- Every stage builds on the previous stage.
- Users may enter at any stage if previous stages are cached.
- The workflow is industry-agnostic. Plugins provide industry-specific content at each stage.

---

## 8. Plugin Philosophy

### Plugins are Consultants, Not Prompts

A plugin is a **self-contained business consultant** for a specific industry or domain.

Every plugin must include:

| Component | Responsibility | Example (Sales Plugin) |
|-----------|---------------|------------------------|
| **Playbook** | Defines what to analyze and how | Sales metrics: revenue, growth rate, profit margin, regional performance |
| **Prompt Templates** | Versioned, externalized AI prompts | `prompts/sales/v1.md` — sales analysis prompt |
| **Business Metrics** | KPIs and thresholds for the industry | Revenue growth > 10% = healthy; < 0% = critical |
| **Business Rules** | Domain-specific validation and logic | Dataset must contain at least one numeric column and one time-based column |
| **Action Generator** | Converts insights into recommended actions | "Increase marketing spend on Product X in Region Y" |
| **Report Generator** | Structures output for the industry | Executive Summary, Key Findings, Risk Analysis, Recommendations |

### Plugin Independence

- Plugins must never import from other plugins.
- Adding a Finance Plugin must not require modifying the Sales Plugin.
- Plugins share only the Core Business Objects (Section 6).
- The Analysis Engine dispatches to plugins; plugins never call each other.

### Plugin Discovery

- The platform auto-discovers plugins via registration.
- The Industry Navigation renders available plugins automatically.
- Disabled plugins appear grayed out with "Coming Soon" badges.
- Adding a plugin requires zero changes to navigation code.

---

## 9. User Experience Principles

### The Three-Screen Rule

Every user interaction should answer three questions in order:

**Screen 1: "What should I care about today?"**
- Business Health score, key metrics, critical alerts.
- This is the first thing users see after uploading data.

**Screen 2: "Why?"**
- Insights, risks, opportunities with supporting data.
- Drill-down from the health assessment.

**Screen 3: "What should I do?"**
- Prioritized recommendations with expected outcomes.
- Actionable, specific, time-bound.

### Conversation is Secondary

- The primary interaction model is **guided workflow**, not chat.
- Recommended next questions lead the user forward.
- Free-text input is available but visually demoted.
- Users should never face a blank input box wondering what to ask.

### Design Principles

| Principle | Implementation |
|-----------|---------------|
| **5-second comprehension** | Any screen must communicate its purpose in 5 seconds |
| **Progressive disclosure** | Show summary first, details on demand |
| **AI invisibility** | Users experience a consultant, not a model |
| **Consistent structure** | Every plugin uses the same layout and workflow |
| **Professional aesthetics** | Enterprise SaaS quality; reference Power BI, Stripe, Linear |
| **No implementation leakage** | Never show model names, prompts, pipeline stages, token counts |

---

## 10. Future Roadmap

### Phase 1: Sales Consultant (Current)

- Single industry plugin: Sales Analysis
- Core workflow: Upload → Analyze → Report → Follow-up
- One AI provider
- Single-user, single-session
- No persistence beyond page session

### Phase 2: Enterprise Memory

- Cross-session persistence
- Historical analysis comparison
- Trend tracking over time
- User accounts and workspace isolation
- Report history and bookmarking

### Phase 3: Multi-Industry Consultants

- Finance Plugin
- Inventory / Supply Chain Plugin
- HR / Workforce Plugin
- Energy / Sustainability Plugin
- Procurement Plugin
- Custom plugin framework for enterprises

### Phase 4: Consultant Marketplace

- Third-party plugin development
- Plugin publishing and review
- Industry-specific consultant packages
- Enterprise private plugins
- Multi-tenant SaaS infrastructure

### Evolution Principle

At each phase, the product must still satisfy:

1. A single user can get value in under 5 minutes.
2. The Consultant Workflow (Section 7) remains the standard experience.
3. Plugins remain independent and self-contained.
4. AI remains invisible to the end user.

---

## Appendix A: Decision Framework

When evaluating any feature proposal, ask:

1. Does it serve a business decision-maker? If not, reject.
2. Does it save time or improve decisions? If neither, reject.
3. Does it fit within the four-layer architecture? If it spans layers incorrectly, redesign.
4. Does it leak implementation details to the user? If yes, redesign.
5. Can it be contained within a single plugin? If it requires cross-plugin changes, redesign the architecture first.
6. Does it respect the Consultant Workflow? If it introduces a parallel workflow, reject.

---

## Appendix B: Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-07-27 | Lytio Product Team | Initial constitution |

---

*This document is the highest-level specification for Lytio. All Sprints, Epics, Features, and Tasks must be consistent with this Constitution. Any contradiction between a Task and this Constitution must be resolved in favor of this Constitution.*