# Lytio Copywriting Guide v1.0

> **Status:** Permanent Brand Document  
> **Version:** 1.0 | 2026-07-31  
> **Parent:** BRAND_CONSTITUTION.md Section 5

---

## 1. Writing Principles

### Principle 1: Clarity First
If a sentence can be shorter without losing meaning, make it shorter. If a word can be simpler without losing precision, use the simpler word.

**Do:** "Revenue declined 14% in Q2."  
**Don't:** "During the second quarter of the fiscal year, revenue experienced a 14% decline."

### Principle 2: Specific Over Vague
Quantify whenever possible. "Three products" beats "several products." "82% of the decline" beats "the majority of the decline."

**Do:** "Three products account for 82% of the revenue decline."  
**Don't:** "A few key products contributed significantly to the downturn."

### Principle 3: Active Voice
The subject acts. Passive voice obscures responsibility and slows reading.

**Do:** "We analyzed your Q2 sales data."  
**Don't:** "An analysis of your Q2 sales data was performed."

### Principle 4: Business Language
Use the terminology our users use. Revenue, margin, churn, pipeline, region, segment — not features, embeddings, tokens, or probabilities.

**Do:** "Margin compression in the Consumer Electronics segment."  
**Don't:** "Negative profitability delta detected in category CE."

### Principle 5: Honest Confidence
State uncertainty clearly. Never inflate confidence to sound more authoritative.

**Do:** "We recommend exploring this pricing change. Confidence: Medium — the data supports the direction but the magnitude depends on external market conditions."  
**Don't:** "Implement this pricing change to increase revenue by 12%."

---

## 2. Product Terminology

### Approved Terms

| Term | Definition | Context |
|------|-----------|---------|
| Business Health | 0-100 score reflecting overall business condition | Dashboard, reports |
| Insight | A data-backed finding about business performance | Analysis output |
| Risk | A potential negative outcome identified in data | Analysis output |
| Recommendation | A suggested action with expected impact | Analysis output |
| Evidence | Specific data supporting a conclusion | Expandable panels |
| Expected Impact | Estimated outcome of implementing a recommendation | Recommendation detail |
| Executive Report | Professional business analysis document | Report page |
| Business Timeline | Historical record of analyses | Dashboard section |
| Workspace | User's project hub | Navigation |
| Consultant | Industry-specific analysis plugin | Product naming |

### Forbidden Terms

| Term | Reason |
|------|--------|
| LLM, Large Language Model | Implementation detail. Never customer-facing. |
| Prompt, Prompt Engineering | Implementation detail. Users don't write prompts. |
| Token, Context Window | Implementation detail. |
| Temperature, Top-p | Implementation detail. |
| Model, AI Model | Use "AI" sparingly. Prefer "analysis." |
| Neural, Deep Learning | Implementation detail. |
| RAG, Embedding, Vector | Implementation detail. |
| Chat, Chatbot, Conversational AI | We are not a chat product. Use "consultant" or "analysis." |
| Algorithm | Technical, impersonal. Use "analysis engine" if necessary. |
| Training Data, Fine-tuning | Users don't need to know. Use "our knowledge base" if needed. |

---

## 3. Preferred Wording

### General Replacements

| Instead of | Use |
|-----------|-----|
| AI-powered | Evidence-backed, Data-driven |
| Smart / Intelligent | Descriptive name (e.g., "Health Score" not "Smart Score") |
| Automated | Guided, Assisted, Recommended |
| Magic / Amazing | (Don't use at all) |
| Revolutionary | (Don't use at all) |
| Game-changing | (Don't use at all) |
| Best-in-class | (Don't use at all) |
| Cutting-edge | (Don't use at all) |
| Leverage (verb) | Use |
| Utilize | Use |
| Synergize | (Never) |

### Feature Descriptions

| Feature | Good Description | Bad Description |
|---------|-----------------|-----------------|
| Business Health | "0-100 score showing your overall business condition" | "AI-powered health assessment" |
| Evidence | "See exactly which data supports each finding" | "Explainable AI transparency layer" |
| Timeline | "Track your business health across every analysis" | "Chronological analysis archive" |
| Recommendations | "Suggested actions with expected business impact" | "AI-generated action items" |

---

## 4. Executive Communication Style

When writing for executive audiences (reports, summaries, dashboards):

- **Lead with the conclusion.** "Revenue grew 14% in Q2, driven by Consumer Electronics (+18%) and Asia Pacific expansion (+24%)."
- **Then provide context.** "This growth was partially offset by declining Mobile Accessories ASP (-7.3%) and excess Home Appliances inventory (+22% above seasonal average)."
- **End with recommendations.** "We recommend: (1) promotional bundling to clear appliance inventory, (2) accelerating Asia Pacific marketing investment, (3) introducing a premium accessories tier."

### Executive Summary Template

`
[Business Health Score] — [Level]. [One-line assessment].

[2-3 paragraphs of key findings, structured as:
- What happened (performance)
- Why it happened (drivers)
- What it means (implications)]

[Key recommendations, ordered by priority with expected impact.]
`

---

## 5. Error Messages

### Principles
- Never blame the user ("You entered an invalid file" — no)
- Never expose technical details ("NullPointerException at line 342" — no)
- Always suggest next steps
- Be concise but warm

### Templates

**Upload error:**
"We couldn't process this file. Please ensure it's an Excel file (.xlsx or .xls) with a header row followed by data rows."

**Analysis error:**
"We couldn't complete the analysis. This may be due to incompatible data format or a temporary service issue. Please try again or contact support."

**Network error:**
"Connection lost. Please check your internet connection and try again."

**Auth error:**
"Sign-in failed. Please check your email and password and try again."

---

## 6. Empty States

### Principles
- Explain what belongs here
- Provide a clear path forward
- Be encouraging, not apologetic

### Templates

**No projects:**
"What can Lytio help you analyze?" followed by use-case cards and a prominent "Create Your First Analysis" button.

**No analyses:**
"No analyses yet. Upload an Excel file to get started — we'll identify risks, opportunities, and recommendations from your data."

**No evidence:**
"This insight was derived from overall patterns in your data. Specific row-level evidence is not available for this finding."

---

## 7. Microcopy Checklist

Before shipping any text:

- [ ] No AI jargon (LLM, prompt, token, temperature, model)
- [ ] No hype words (revolutionary, game-changing, magical)
- [ ] No empty superlatives (best-in-class, world-class)
- [ ] Every claim is specific and verifiable
- [ ] Active voice throughout
- [ ] Shorter than the previous draft
- [ ] A CFO would read this and nod (not roll their eyes)

---

*This Copywriting Guide translates the Brand Constitution's voice principles into actionable rules for every word we publish.*
