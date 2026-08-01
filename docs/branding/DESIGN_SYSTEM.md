# ExcelPilot Design System v1.0

> **Status:** Permanent Brand Document  
> **Version:** 1.0 | 2026-07-31  
> **Parent:** BRAND_CONSTITUTION.md

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
| adius-sm | 6px | Small elements: badges, tags, inline buttons |
| adius-md | 8px | Inputs, dropdowns, small cards |
| adius-lg | 12px | Standard cards, panels, modals |
| adius-xl | 16px | Large cards, featured sections |
| adius-2xl | 20px | Hero cards, dashboard panels |

**Rule:** Never use fully rounded (9999px) for structural elements. Reserved for pills/badges only.

---

## 4. Borders

| Token | Value | Usage |
|-------|-------|-------|
| order-default | 1px solid slate-200 | Standard component border |
| order-light | 1px solid slate-100 | Subtle internal dividers |
| order-emphasis | 1px solid slate-300 | Active/hover states |
| order-accent | 4px solid (color) | Left accent on cards (Timeline, Evidence) |

**Rule:** No borders heavier than 1px for standard UI. Accent borders (4px) reserved for Timeline events and evidence cards.

---

## 5. Shadows

| Token | Value | Usage |
|-------|-------|-------|
| shadow-none | none | Flat elements (inputs, text areas) |
| shadow-sm | 0 1px 2px rgba(0,0,0,0.05) | Subtle card elevation |
| shadow-md | 0 4px 6px rgba(0,0,0,0.07) | Elevated cards, modals |
| shadow-lg | 0 10px 15px rgba(0,0,0,0.1) | Modals, dropdowns |

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
| 	ext-xs | 12px | 400 | 1.5 | Labels, metadata, captions |
| 	ext-sm | 14px | 400 | 1.5 | Body text, descriptions, list items |
| 	ext-base | 16px | 400 | 1.6 | Long-form content, summaries |
| 	ext-lg | 18px | 600 | 1.4 | Page titles |
| 	ext-xl | 20px | 700 | 1.3 | Section headers |
| 	ext-2xl | 24px | 700 | 1.3 | Major section headers |
| 	ext-3xl | 30px | 700 | 1.2 | Hero titles |
| 	ext-4xl | 36px | 700 | 1.2 | Landing hero |
| 	ext-5xl | 48px | 700 | 1.1 | Maximum display |

### Font Family

**System font stack (no custom web fonts):**
- UI: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
- Monospace (data, numbers): "SF Mono", "Fira Code", "Fira Mono", monospace

**Rule:** Numbers always use ont-variant-numeric: tabular-nums for alignment in tables and cards.

### Font Weight

| Token | Value | Usage |
|-------|-------|-------|
| ont-normal | 400 | Body, descriptions, metadata |
| ont-medium | 500 | Interactive elements, emphasis |
| ont-semibold | 600 | Subheadings, card titles, labels |
| ont-bold | 700 | Headings, key metrics, primary CTAs |

**Rule:** Never use font-weight 800 or 900. Never use font-weight 300 or below.

---

## 8. Color System

### Neutral Palette (Slate)

| Token | Hex | Usage |
|-------|-----|-------|
| slate-50 | #F8FAFC | Page background, subtle sections |
| slate-100 | #F1F5F9 | Card hover, secondary backgrounds |
| slate-200 | #E2E8F0 | Borders, dividers |
| slate-300 | #CBD5E1 | Disabled states |
| slate-400 | #94A3B8 | Secondary text, labels |
| slate-500 | #64748B | Body text, descriptions |
| slate-600 | #475569 | Medium emphasis text |
| slate-700 | #334155 | Strong text |
| slate-800 | #1E293B | Headings |
| slate-900 | #0F172A | Primary text, emphasis |

### Semantic Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Emerald (600) | #059669 | Positive: health improvement, growth, mitigated risks |
| Amber (500) | #F59E0B | Warning: medium confidence, trial indicator, attention |
| Red (500) | #EF4444 | Critical: high-severity risks, negative trends |
| Blue (500) | #3B82F6 | Information: evidence, recommendations, links |
| Blue (600) | #2563EB | Primary actions, emphasis |

### Color Rules

1. **Emerald, Amber, Red** = semantic meaning only. Never decorative.
2. **Blue** = interactive and informational. Links, buttons, evidence.
3. **Slate** = everything else. 90% of the interface.
4. **No purple.** The "AI color." We are not an AI company.
5. **No gradients** in product UI. Reserved for landing page hero only.

---

## 9. Component Consistency Rules

### Cards
- Border: order border-slate-200
- Radius: ounded-xl (12px)
- Padding: p-5 (20px) or p-6 (24px)
- Shadow: shadow-sm
- Background: g-white

### Buttons (Primary)
- Background: g-slate-900
- Text: 	ext-white text-sm font-semibold
- Radius: ounded-xl
- Padding: px-5 py-2.5 or px-6 py-3
- Hover: hover:bg-slate-800

### Buttons (Secondary)
- Border: order border-slate-200
- Background: g-white
- Text: 	ext-slate-700 text-sm font-semibold
- Hover: hover:bg-slate-50

### Inputs
- Border: order border-slate-200
- Radius: ounded-lg
- Padding: px-3 py-2.5
- Text: 	ext-sm text-slate-900
- Focus: ocus:outline-none focus:ring-1 focus:ring-slate-400

### Badges / Pills
- Radius: ounded-full
- Padding: px-2 py-0.5 or px-2.5 py-0.5
- Text: 	ext-[10px] font-medium

### Section Headers
- Text: 	ext-[11px] font-semibold uppercase tracking-wider text-slate-400

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
