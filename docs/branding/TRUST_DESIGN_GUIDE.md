# Lytio Trust Design Guide v1.0

> **Status:** Permanent Brand Document  
> **Version:** 1.0 | 2026-07-31  
> **Parent:** BRAND_CONSTITUTION.md Section 12  
> **Principle:** "Trust is our product. AI is only one of the technologies we use to earn it."

---

## 0. The Trust Design Mandate

Every interface element in Lytio either builds trust or erodes it. There is no neutral design when trust is the product.

This document defines **how** trust is expressed — visually, interactively, and textually — across every touchpoint in the product. It is the most important design document we have. When a design decision affects user trust, this document is the authority.

---

## 1. Privacy Communication

### 1.1 Before First Upload: Security Notice

**When:** First visit to workspace (before any upload).  
**What:** Dismissible notice explaining data protection.  
**Remembered:** localStorage — never shown again after dismissal.

**Content:**
- "Your Data is Protected" (success, lock icon)
- 4 bullet points from AI policy API:
  - Files stored securely, accessed only through authenticated APIs
  - All projects private to their owner
  - Uploaded data NEVER used for model training
  - Delete projects anytime — all data removed permanently
- "Got it" dismiss button

**Visual:** success-soft themed card (bg-success-soft background, border-success/30 border, text-success). Green signals safety and trust. Success green is exclusively our trust color.

### 1.2 Ongoing: Security Status Badge

**Where:** Project dashboard header.  
**What:** Small success badge: "🔒 Secure"
**Visual:** rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success

Always visible. Never dismissible. A constant, subtle reminder.

### 1.3 Settings: Privacy Section

**Where:** Settings page.  
**What:** Privacy section reading from GET /api/config/ai-policy.  
**Content:** Each policy item displayed with checkmark (success), category label, and description.

**Key rule:** Privacy policy is read from the API, not hardcoded. If the policy changes, the UI automatically reflects it.

### 1.4 File Storage & Access

- Files stored in user-scoped directories: storage/uploads/{user_id}/
- No direct URLs to uploaded files — never exposed
- All file access through authenticated APIs
- User never sees storage paths or internal file names

**UI rule:** Never display file paths, server names, or storage bucket names in the interface.

---

## 2. Explainability

### 2.1 The "Why?" Principle

Every Insight, Risk, and Recommendation must answer "Why?" — either through explicit Evidence or through an honest acknowledgment that evidence is unavailable.

**No unexplained claims.** A conclusion without evidence is marked with lower confidence and never presented as authoritative.

### 2.2 Evidence Display

**Component:** EvidenceCard — expandable panel below each Insight, Risk, and Recommendation.

**Default state:** Collapsed. Shows only: ▶ Why this conclusion? with confidence badge.

**Expanded state:** Structured evidence display:
- Sheet: Source worksheet name
- Range: Cell range (e.g., "A2:F28")
- Columns: Relevant column names
- Rows: Row range description
- Reason: Natural language explanation of the evidence
- Confidence: High / Medium / Low badge

**Visual:** bg-canvas background, border-border, rounded-card, p-3. Compact, professional, scannable.

**When evidence is unavailable:**
- The "Why this conclusion?" toggle is hidden entirely
- Confidence level reflects the lack of evidence (never "high" without evidence)

### 2.3 Evidence in Reports

Executive Reports and historical reports display evidence identically to the live dashboard. The same EvidenceCard component renders everywhere — consistency reinforces trust.

---

## 3. Confidence Display

### 3.1 Honest Uncertainty

Confidence is never hidden, minimized, or inflated. It is displayed prominently alongside every claim:

| Confidence | Meaning | Color | Visual |
|-----------|---------|-------|--------|
| High | Strong, multi-source evidence | Success | Success dot + "High" badge |
| Medium | Direction clear, magnitude uncertain | Warning | Warning dot + "Medium" badge |
| Low | Speculation based on limited data | Danger | Danger dot + "Low" badge |

### 3.2 Where Confidence Appears

- **Insights:** Confidence dot inline with title
- **Risks:** Severity is primary; confidence displayed in EvidenceCard if available
- **Recommendations:** Confidence displayed in Expected Impact panel
- **Expected Impact:** Confidence displayed in Business Value dashboard card
- **Aggregate:** Business Value section shows overall confidence (conservative rule)

### 3.3 Conservative Aggregation Rule

When aggregating multiple confidence ratings into an overall assessment:

- If **any** individual confidence is Low → Overall = Low
- Else if **any** is Medium → Overall = Medium
- Else → Overall = High

This rule is intentionally conservative. We would rather understate confidence than overstate it. A single low-confidence estimate contaminates the overall assessment — because in business, one wrong recommendation can undo the value of three correct ones.

---

## 4. AI Disclosure

### 4.1 When to Disclose AI Involvement

**Required disclosure:** When AI generates content that could be mistaken for human analysis.

**Disclosure language:** "AI Analysis Completed" (report footer) — simple, factual, not apologetic.

**No disclosure needed:** When the user explicitly initiated an AI action (clicking "Analyze" is consent).

### 4.2 How to Disclose

**Report footer:** "AI Analysis Completed · Data Size: N metrics · Report Generated [date]"

**Business Value disclaimer:** "Impact estimates are AI-assisted potential improvements, not guaranteed outcomes. Actual results depend on execution quality, market conditions, and external factors."

**Never:** "Powered by DeepSeek" / "Generated by AI" / Model names / Provider names / Token counts

### 4.3 AI Transparency Without AI Branding

Users should understand that technology assisted their analysis — without knowing or caring which technology. The distinction:

- **Good:** "AI Analysis Completed" — communicates process, not brand
- **Bad:** "Powered by DeepSeek v4 Pro" — communicates vendor, not value

This is not about hiding AI involvement. It is about not defining ourselves by our AI provider. Tomorrow's provider may be different; the user experience should be identical.

---

## 5. Security Indicators

### 5.1 Visual Security Language

| Concept | Icon | Color | Usage |
|---------|------|-------|-------|
| Secure / Encrypted | lock-closed | Success | Security badges, privacy notices |
| Private | shield-check | Success | Project ownership indicators |
| Verified | check-badge | Success | Email verification, data integrity |
| Read-only | eye | Secondary | Demo mode indicator |

### 5.2 Where Security Indicators Appear

- **Demo page:** "Read-only" badge (secondary)
- **Project dashboard:** "Secure" badge (success)
- **Security notice:** Lock icon (success)
- **Settings → Privacy:** Shield icons (success)

### 5.3 Rules

- Use success for security. Never warning or danger (those signal problems).
- Indicators are subtle — small badges, not banners.
- Indicators are persistent — they remain visible, not just on first visit.
- Never over-indicate. A page with 8 security badges signals insecurity, not security.

---

## 6. Data Ownership

### 6.1 Communicating Ownership

Users must feel — not just know, but feel — that their data is theirs.

**Design principles:**
- **User name/email visible** in workspace header. "This is your space."
- **Project cards** show user-created titles, not system-generated IDs.
- **"My Projects"** not "All Projects" — possessive language reinforces ownership.
- **Delete is permanent and complete.** No "soft delete" that leaves data on our servers.

### 6.2 Delete Experience

When a user deletes a project:
- Confirmation: "Delete [Project Name]? This will permanently remove all files, analyses, and reports. This action cannot be undone."
- No retention period. No "we'll keep your data for 30 days." Delete means delete.
- Success confirmation: "Project deleted. All associated data has been permanently removed."

### 6.3 Export (Future)

When export is implemented:
- Export format: Standard formats (PDF, XLSX, CSV) — never proprietary.
- Export completeness: All user data, not a subset.
- No delay: Export should be immediate, not "we'll email you when it's ready."

---

## 7. Auditability

### 7.1 What Users Can Audit

Users should be able to verify:
- When was each analysis performed? (Timeline)
- What data was analyzed? (Dataset section on dashboard)
- What conclusions were reached? (Stored AnalysisResult)
- What evidence supports each conclusion? (EvidenceCards)
- Who has access to this project? (Only the owner — indicated by security badge)

### 7.2 The Timeline as Audit Trail

The Business Timeline serves as an audit trail:
- Each analysis creates a permanent, immutable record
- Records include: timestamp, health score, executive summary
- Historical reports are read-only — never regenerated, never modified
- "View Report" opens the exact analysis as it was originally generated

### 7.3 Future Audit Capabilities (Not Yet Implemented)

- Activity log: Who did what, when
- Change tracking: What changed between analyses
- Decision log: Which recommendations were acted upon
- Outcome tracking: What results followed from decisions

---

## 8. Transparency Principles

### 8.1 What Transparency Means at Lytio

**Transparency is not "show everything."** It is "show everything the user needs to trust us — and nothing that would confuse or overwhelm them."

### 8.2 What We Always Show

- Analysis methodology: The workflow (Upload → Analyze → Report) is visible and understandable
- Evidence: Links from conclusions to data
- Confidence: Honest ratings on every claim
- Data source: Which file, which sheet, when uploaded
- Limitations: What the analysis can and cannot do

### 8.3 What We Never Show

- AI model names, versions, or providers
- Token counts, latency, or API metrics
- Internal system architecture
- Prompt templates or prompt engineering details
- Raw AI output (JSON or markdown before parsing)
- Error stack traces (in production)

### 8.4 The Transparency Test

For any interface element, ask:
1. Does showing this build trust? → Show it.
2. Does showing this confuse the user without adding trust? → Hide it.
3. Does hiding this erode trust if the user discovers it later? → Show it.
4. Does showing this expose implementation details that may change? → Hide it.

---

## 9. Trust Design Checklist

Before shipping any UI that displays analysis results, business data, or AI output:

- [ ] Every insight displays confidence level
- [ ] Evidence is available or clearly marked as unavailable
- [ ] "Why this conclusion?" toggle present where evidence exists
- [ ] Expected Impact includes disclaimer
- [ ] Business Value uses conservative confidence aggregation
- [ ] Report footer shows "AI Analysis Completed" (not provider name)
- [ ] No AI jargon, no model names, no token counts
- [ ] Security badge visible on project dashboard
- [ ] Privacy policy accessible from Settings
- [ ] Delete confirmation clearly states permanence

---

*This Trust Design Guide is the operationalization of the Trust Principle. Every design decision that affects user trust must be consistent with this document. When in doubt, err on the side of showing more evidence, stating more uncertainty, and giving users more control.*
