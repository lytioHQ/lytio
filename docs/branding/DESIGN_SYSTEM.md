# Lytio Design System v2.0

> **Status:** Permanent Brand Document  
> **Version:** 2.0 | 2026-08-11
> **Parent:** BRAND_CONSTITUTION.md
> **Supersedes:** v1.0 — Design tokens migrated to the M2.4 Lytio Design Token system (slate/emerald palettes removed)

---

## 1. Design Principles

1. **Clarity over decoration.** Every element serves understanding. Nothing is purely visual.
2. **Consistency over novelty.** Same component, same behavior, everywhere. Pattern recognition > learning.
3. **Hierarchy over flatness.** Information importance determines visual prominence.
4. **Restraint over expression.** Professional tools are understated. Save expression for marketing.
5. **Accessibility as default.** Every component meets WCAG AA contrast minimums.

---

## 2. Spacing System (8px Grid)

All spacing is multiples of 8px. No exceptions.

| Token | Value | Usage |
|-------|-------|-------|
| space-0 | 0px | No gap |
| space-1 | 4px | Inline gaps (icon + text) |
| space-2 | 8px | Tight padding, small gaps |
| space-3 | 12px | Item gaps in lists |
| space-4 | 16px | Standard card padding, section gaps |
| space-5 | 20px | Card internal spacing |
| space-6 | 24px | Section padding |
| space-8 | 32px | Large section gaps |
| space-10 | 40px | Page-level spacing |
| space-12 | 48px | Hero spacing |
| space-16 | 64px | Major section separation |
| space-20 | 80px | Landing page sections |
| space-24 | 96px | Maximum spacing |

**Implementation:** Tailwind spacing scale (p-4 = 16px, gap-6 = 24px, etc.).

---

## 3. Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| radius-control | 10px | Buttons, inputs, small controls |
| radius-card | 16px | Cards, panels, modals |
| radius-card-lg | 20px | Large cards, featured sections |

**Rule:** Never use fully rounded (9999px) for structural elements. Reserved for pills/badges only.

---

## 4. Borders

| Token | Value | Usage |
|-------|-------|-------|
| border-default | 1px solid #E8E8ED | Standard component border |
| border-light | 1px solid rgba(0,0,0,0.06) | Subtle internal dividers |
| border-emphasis | 1px solid #D2D2D7 | Active/hover states |
| border-accent | 4px solid #0071E3 | Left accent on cards (Timeline, Evidence) |

**Rule:** No borders heavier than 1px for standard UI. Accent borders (4px) reserved for Timeline events and evidence cards.

---

## 5. Shadows

| Token | Value | Usage |
|-------|-------|-------|
| shadow-none | none | Flat elements (inputs, text areas) |
| shadow-card | 0 1px 2px rgba(0,0,0,0.04) | Default card elevation |
| shadow-pop | 0 4px 16px rgba(0,0,0,0.12) | Modals, dropdowns, popovers |

**Rule:** No more than 3 elevation levels visible simultaneously. Shadows should be barely noticeable — professional, not dramatic.

---

## 6. Motion

**Duration tokens:**
| Token | Value | Usage |
|-------|-------|-------|
| duration-instant | 100ms | Hover state changes, focus rings |
| duration-fast | 200ms | Panel expand/collapse, tab switches |
| duration-normal | 300ms | Modal open/close, page transitions |

**Easing:** ease-out for enter animations, ease-in for exit animations.

**Rules:**
- No animation on page load (no "fade in" on scroll)
- No animation on data display (charts, numbers)
- Motion only for state changes: expand/collapse, open/close, hover
- No bouncing, spring, or elastic easings
- No animation that exceeds 300ms

---

## 7. Typography

### Type Scale

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| caption | 13px | 400 | 1.5 | Labels, metadata, captions |
| body | 16px | 400 | 1.7 | Long-form content, summaries, body text |
| h3 | 17px | 600 | 1.4 | Card titles, subheadings |
| h2 | 22px | 600 | 1.3 | Section headers |
| h1 | 28px | 700 | 1.25 | Page titles |
| display | 40px | 700 | 1.1 | Landing hero, marketing headlines |

### Font Family

**System font stack (no custom web fonts):**
- UI: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif
- Monospace (data, numbers): "SF Mono", "Fira Code", "Fira Mono", monospace

**Rules:**
- Numbers always use font-variant-numeric: tabular-nums for alignment in tables and cards.
- Chinese UI text never renders below 14px; body text defaults to 16px with ~1.7 line height.

### Font Weight

| Token | Value | Usage |
|-------|-------|-------|
| font-normal | 400 | Body, descriptions, metadata |
| font-medium | 500 | Interactive elements, emphasis |
| font-semibold | 600 | Subheadings, card titles, labels |
| font-bold | 700 | Headings, key metrics, primary CTAs |

**Rule:** Never use font-weight 800 or 900. Never use font-weight 300 or below.

---

## 8. Color System

### Neutral Palette (Lytio Design Tokens)

| Token | Hex | Usage |
|-------|-----|-------|
| canvas | #F5F5F7 | Page background |
| surface | #FFFFFF | Cards, panels, elevated sections |
| muted | #EDEDF0 | Secondary section backgrounds |
| border | #E8E8ED | Borders, dividers |
| secondary | #6E6E73 | Secondary text, labels |
| ink | #1D1D1F | Primary text, headings |

### Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| success | #34C759 | Positive: health improvement, growth, mitigated risks |
| warning | #FF9500 | Warning: medium confidence, trial indicator, attention |
| danger | #FF3B30 | Critical: high-severity risks, negative trends |
| accent | #0071E3 | Interactive: links, buttons, evidence, primary actions |

### Soft Tint Variants

| Token | Hex | Usage |
|-------|-----|-------|
| accent-soft | #EAF2FE | Highlighted sections, interactive backgrounds |
| success-soft | #EAF7EE | Positive / safety-themed sections |
| warning-soft | #FFF4E3 | Attention backgrounds |
| danger-soft | #FDEBEB | Error / critical backgrounds |

### Color Rules

1. **success, warning, danger** = semantic meaning only. Never decorative.
2. **accent** = interactive and informational. Links, buttons, evidence.
3. **Neutral tokens (canvas, surface, muted, border, secondary, ink)** = everything else. ~80% of the interface.
4. **No purple.** The "AI color." We are not an AI company.
5. **No gradients** in product UI.
6. **Proportion:** 80% neutral, 15% soft tint, 5% strong accent.

---

## 9. Component Consistency Rules

### Cards
- Background: bg-surface
- Border: border border-border
- Radius: rounded-card
- Padding: p-5 (20px) or p-6 (24px)
- Shadow: shadow-card (extremely light)
- Variants: default / subtle (bg-canvas) / highlighted (soft tint backgrounds)

### Buttons (Primary)
- Background: bg-ink
- Text: text-white text-sm font-medium
- Radius: rounded-control
- Height: h-11
- Padding: px-5
- Hover: hover:bg-ink-hover

### Buttons (Secondary)
- Border: border border-border
- Background: bg-surface
- Text: text-ink text-sm font-medium
- Hover: hover:bg-canvas

### Buttons (Ghost)
- Background: transparent
- Text: text-secondary
- Hover: hover:text-ink

### Buttons (Danger)
- Background: bg-danger
- Text: text-white
- Hover: hover:bg-danger-hover

### Inputs
- Border: border border-border
- Radius: rounded-control
- Height: h-12
- Padding: px-4
- Text: text-base text-ink
- Focus: focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent

### Badges / Pills
- Radius: rounded-full
- Padding: px-2.5 py-0.5
- Text: text-xs font-medium
- Semantic: success / warning / danger / accent soft backgrounds (bg-success-soft text-success, etc.)

### Section Headers
- Title: text-h3 font-semibold text-ink
- Description: text-caption text-secondary, relaxed line height

---

## 10. Layout

### Page Widths

| Token | Max Width | Usage |
|-------|-----------|-------|
| max-w-3xl | 768px | Settings, forms, narrow content |
| max-w-4xl | 896px | Executive reports |
| max-w-5xl | 1024px | Dashboard, workspace, landing sections |
| max-w-7xl | 1280px | Landing page full-width sections |

### Page Padding
- Horizontal: px-6 (24px) on all pages
- Vertical sections: py-10 (40px) for content areas, py-20 (80px) for landing sections

### Grid
- Dashboard cards: grid-cols-2 lg:grid-cols-4 with gap-4
- Metric grid: grid-cols-2 sm:grid-cols-3 lg:grid-cols-5
- Feature cards: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3

---

*This Design System operationalizes the Brand Constitution's visual personality principles. All product UI must conform to these tokens and rules.*
