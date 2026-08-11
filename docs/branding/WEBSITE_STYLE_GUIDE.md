# Lytio Website Style Guide v1.0

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
3. Subheadline: text-body, text-secondary, 2-3 lines maximum.
4. Primary CTA: "Try Demo" — Button primary (bg-ink)
5. Secondary CTA: "Start Your Analysis" — outline button
6. Trust signal (below CTAs): "No registration required for demo."

**Visual:** Clean, typography-driven. Canvas background with layered muted sections. No gradients. No hero image — the headline is the hero.

### Problem Section

**Layout:** Muted section background (bg-muted), max-w-5xl, py-20.

**Content:**
- Section label: "The Problem" — text-caption uppercase tracking-wider text-secondary
- Headline: 2xl bold
- Supportive paragraph
- 4 problem cards in responsive grid

**Card style:** bg-surface, border-border, rounded-card, p-5. Title (text-h3) + description (text-caption text-secondary).

### How It Works Section

**Layout:** bg-surface, max-w-5xl, py-20.

**Content:**
- Section label: "How It Works"
- Headline: 2xl bold
- 4-step flow: numbered circles (bg-ink, white text) + title + description
- Steps arranged horizontally on desktop, stacked on mobile

### Differentiation Section

**Layout:** Muted section background (bg-muted), max-w-5xl, py-20.

**Content:**
- Section label: "What Makes Lytio Different"
- Headline: 2xl bold
- 6 feature cards in 2×3 or 3×2 grid
- Cards: bg-surface, rounded-card, border-border, p-5

### Demo CTA Section

**Layout:** White background, centered, max-w-lg, py-20.

**Content:**
- Section label: "See It In Action"
- Headline: 2xl bold
- Paragraph: text-body, text-secondary
- CTA: "Try Demo" — Button primary (bg-ink), px-5 h-11

### Security Section

**Layout:** Muted section background (bg-muted), max-w-5xl, py-20.

**Content:**
- Section label: "Security & Privacy"
- Headline: 2xl bold
- 3 feature cards (success-soft themed) in horizontal grid
- Cards: bg-surface, rounded-card, border-border, p-6, centered text

### Footer

**Layout:** bg-surface, border-t border-border, max-w-5xl, py-8, flex between.

**Content:**
- Left: "Lytio — AI Business Consultant" (text-caption text-secondary)
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
- Feature comparison: Checkmarks (success) and dashes (border), not X marks.
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
- **Style:** rounded-control, bg-ink, text-white, px-5 h-11
- **Placement:** Above the fold, never below

### Secondary CTA
- **Label:** "Start Your Analysis" (landing), "Sign In" (demo page)
- **Style:** rounded-control, border-border, bg-surface, text-ink, px-5 h-11
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
- Active page indicated by text color (text-ink), not background
- No dropdown menus in V1 (single-level navigation)
- Mobile: hamburger menu with same items

---

*This Website Style Guide ensures consistency across every public-facing page of the Lytio website.*
