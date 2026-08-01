# ExcelPilot Website Style Guide v1.0

> **Status:** Permanent Brand Document  
> **Version:** 1.0 | 2026-07-31  
> **Parent:** BRAND_CONSTITUTION.md, DESIGN_SYSTEM.md

---

## 1. Homepage

### Hero Section

**Layout:** Centered, 5xl max-width, generous vertical padding (py-24).

**Content hierarchy:**
1. Category badge (optional): Small pill — "AI Business Consultant"
2. Headline: 4xl-5xl, bold, tight leading. Maximum 10 words.
3. Subheadline: Base-lg, slate-500, 2-3 lines maximum.
4. Primary CTA: "Try Demo" — solid slate-900 button
5. Secondary CTA: "Start Your Analysis" — outline button
6. Trust signal (below CTAs): "No registration required for demo."

**Visual:** Clean, typography-driven. Subtle background gradient from slate-50 to white. No hero image — the headline is the hero.

### Problem Section

**Layout:** Slate-50/50 background, max-w-5xl, py-20.

**Content:**
- Section label: "The Problem" — text-[11px] uppercase tracking-wider slate-400
- Headline: 2xl bold
- Supportive paragraph
- 4 problem cards in responsive grid

**Card style:** White background, border slate-200, rounded-xl, p-5. Title (sm semibold) + description (xs slate-500).

### How It Works Section

**Layout:** White background, max-w-5xl, py-20.

**Content:**
- Section label: "How It Works"
- Headline: 2xl bold
- 4-step flow: numbered circles (slate-900, white text) + title + description
- Steps arranged horizontally on desktop, stacked on mobile

### Differentiation Section

**Layout:** Slate-50/50 background, max-w-5xl, py-20.

**Content:**
- Section label: "What Makes ExcelPilot Different"
- Headline: 2xl bold
- 6 feature cards in 2×3 or 3×2 grid
- Cards: white, rounded-xl, border, p-5

### Demo CTA Section

**Layout:** White background, centered, max-w-lg, py-20.

**Content:**
- Section label: "See It In Action"
- Headline: 2xl bold
- Paragraph: sm text, slate-500
- CTA: "Try Demo" — solid slate-900, px-6 py-3

### Security Section

**Layout:** Slate-50/50 background, max-w-5xl, py-20.

**Content:**
- Section label: "Security & Privacy"
- Headline: 2xl bold
- 3 feature cards (emerald-themed) in horizontal grid
- Cards: white, rounded-xl, border, p-6, centered text

### Footer

**Layout:** White background, border-t slate-200, max-w-5xl, py-8, flex between.

**Content:**
- Left: "ExcelPilot — AI Business Consultant" (text-xs slate-400)
- Right: Demo, Sign In, Get Started (button) links

---

## 2. Feature Pages (Future)

Template for individual feature pages (e.g., /features/business-health):

1. **Hero:** Feature name + one-line value proposition + screenshot
2. **How it works:** 2-3 step explanation with supporting visuals
3. **Benefits:** 3-4 benefit cards
4. **CTA:** "Try it in the demo" → /demo

---

## 3. Pricing Page (Future)

### Principles
- Transparent. No "contact us for enterprise pricing" unless genuinely custom.
- Simple. Maximum 2 tiers: Trial (free, 14 days) and Pro (paid).
- Feature comparison: Checkmarks (emerald) and dashes (slate-300), not X marks.
- No "Most Popular" badge. Let the value speak.

### Layout
1. Hero: "Simple, transparent pricing"
2. Two-column comparison: Trial vs Pro
3. FAQ: Collapsible questions
4. CTA: "Start Free Trial"

---

## 4. Security Page (Future)

### Principles
- Technical enough to be credible, clear enough to be understood.
- Link to live API endpoint: GET /api/config/ai-policy
- Show, don't just tell: screenshots of privacy controls, evidence panels.

### Sections
1. Data Privacy: "Your data belongs to you."
2. AI Policy: "Never used for model training."
3. Infrastructure: Where data is stored, how it's protected.
4. Compliance: SOC2, GDPR status (when achieved).

---

## 5. Demo Page

### Principles
- The demo is our best sales tool. It should sell itself.
- Banner clearly states "Demo Mode — no files uploaded."
- Every interactive element that would modify data is disabled.
- Prominent CTA to register at top and bottom.

See current /demo implementation for reference.

---

## 6. FAQ Page (Future)

### Principles
- Group questions by topic: Product, Security, Pricing, Technical.
- Answers should be 2-4 sentences. Link to docs for detail.
- Honest about limitations. "We don't support [X] yet" > "We're considering [X]."
- No marketing-speak in answers.

---

## 7. CTA Rules

### Primary CTA
- **Label:** "Try Demo" (landing), "Start Your First Analysis" (post-demo), "Create Analysis" (workspace)
- **Style:** Rounded-xl, bg-slate-900, text-white, px-6 py-3, shadow-sm
- **Placement:** Above the fold, never below

### Secondary CTA
- **Label:** "Start Your Analysis" (landing), "Sign In" (demo page)
- **Style:** Rounded-xl, border slate-200, bg-white, text-slate-700, px-6 py-3
- **Placement:** Adjacent to primary CTA

### CTA Hierarchy
1. Primary: Demo (lowest commitment, highest conversion)
2. Secondary: Register (medium commitment)
3. Tertiary: Sign In (existing users)

### Anti-Patterns
- Never: "Get Started for Free" (we have a trial, not free tier)
- Never: "Sign Up Now" (aggressive)
- Never: "Don't Miss Out" (scarcity tactics)
- Never: Multiple competing CTAs of equal visual weight

---

## 8. Navigation Principles

### Main Navigation (Authenticated)
- / — Workspace (home)
- /demo — Demo (always accessible)
- /settings — Settings

### Main Navigation (Unauthenticated — Landing)
- Logo → /
- "Demo" → /demo
- "Sign In" → /login
- "Get Started" → /register (button-styled)

### Navigation Rules
- Maximum 4 items in main nav (excluding logo and CTA button)
- Active page indicated by text color (slate-900), not background
- No dropdown menus in V1 (single-level navigation)
- Mobile: hamburger menu with same items

---

*This Website Style Guide ensures consistency across every public-facing page of the ExcelPilot website.*
