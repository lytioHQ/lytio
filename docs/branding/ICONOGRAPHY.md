# Lytio Iconography v1.0

> **Status:** Permanent Brand Document  
> **Version:** 1.0 | 2026-07-31  
> **Parent:** DESIGN_SYSTEM.md

---

## 1. Icon Library Standard

**Primary Library:** Heroicons (https://heroicons.com) — MIT licensed, designed by the Tailwind CSS team.

Heroicons provides two styles:
- **Outline (24px, 1.5px stroke):** Primary choice for UI. Clean, readable at small sizes, consistent.
- **Solid (24px, filled):** Active/selected states only. Never as the default style.

**Fallback:** Lucide Icons (https://lucide.dev) — compatible style, slightly larger set. Use only when Heroicons lacks a needed icon.

**Never:** Emoji as UI icons. Font Awesome. Material Icons (different design language). Custom one-off icons. Icons from multiple libraries mixed on the same page.

---

## 2. Icon Sizing

| Size | Dimensions | Usage |
|------|-----------|-------|
| icon-xs | 12px × 12px | Inline with 12px text, badges |
| icon-sm | 16px × 16px | Inline with 14px text, buttons, links |
| icon-md | 20px × 20px | Standalone icons, feature cards |
| icon-lg | 24px × 24px | Feature illustrations, empty states |
| icon-xl | 32px × 32px | Hero sections, major features |

**Rule:** Icon size matches the line height of adjacent text. An icon next to 14px text should be 16px (not 14px — icons need slightly more optical size).

---

## 3. Icon Usage Rules

### Stroke & Fill
- **UI icons:** stroke-width 1.5 (Heroicons outline default)
- **Never:** stroke-width 2.0 or higher (too bold for our visual lightness)
- **Filled icons:** Only for active/selected navigation states

### Color
- **Default:** text-secondary (non-interactive)
- **Interactive:** text-ink (hoverable, clickable)
- **Active:** text-ink font-medium (current page, selected item)
- **Semantic:** success (positive), warning (attention), danger (critical), accent (info) — but only when the icon carries semantic meaning

### Alignment
- Icons are always vertically centered with adjacent text using flex items-center
- Gap between icon and text: gap-1.5 (6px) for small, gap-2 (8px) for standard

---

## 4. Icon Catalog

### Navigation
| Concept | Icon |
|---------|------|
| Dashboard / Home | home or squares-2x2 |
| Projects / Workspace | folder or briefcase |
| Settings | cog-6-tooth or adjustments-horizontal |

### Actions
| Concept | Icon |
|---------|------|
| Upload | arrow-up-tray |
| Analyze | magnifying-glass or chart-bar |
| Delete | trash |
| Edit | pencil |
| Close / Dismiss | x-mark |
| Expand / Collapse | chevron-right (rotates on open) |
| Add / Create | plus |
| Refresh | arrow-path |

### Status
| Concept | Icon |
|---------|------|
| Success / Complete | check-circle |
| Warning / Attention | exclamation-triangle |
| Error / Critical | x-circle |
| Info | information-circle |
| Locked / Secure | lock-closed |
| Private | eye-slash or shield-check |

### Business
| Concept | Icon |
|---------|------|
| Health | heart or chart-bar |
| Revenue | currency-dollar |
| Growth | arrow-trending-up |
| Decline | arrow-trending-down |
| Risk | shield-exclamation |
| Recommendation | light-bulb |
| Evidence | document-magnifying-glass |
| Timeline | clock |
| Report | document-text |

---

## 5. Do / Don't

**Do:**
- Use outline icons with 1.5px stroke as default
- Match icon size to text line height
- Use semantic colors only when the icon conveys meaning
- Keep icons in a consistent visual style (all Heroicons outline)

**Don't:**
- Mix outline and solid icons in the same view
- Mix icons from different libraries
- Use icons at sizes not in the scale
- Color icons decoratively (only for semantic meaning)
- Use emoji as UI icons (🤖, 📊, 🚀)
- Create custom icons unless absolutely necessary
- Use filled icons as the default style

---

## 6. Empty State Icons

Empty states may use slightly larger, more expressive icons:
- 48px size
- text-secondary color (subtle, non-distracting)
- Outline style only
- Paired with helpful text and a clear CTA

**Example empty states:**
- No projects: document-plus (48px, text-secondary)
- No analyses: chart-bar (48px, text-secondary)
- No evidence: document-magnifying-glass (48px, text-secondary)

---

## 7. Security & Trust Icons

Security-related icons use success color to reinforce the safety/trust association:

- Lock (secure): lock-closed text-success
- Shield (protected): shield-check text-success
- Eye (private): eye text-success
- Check (verified): check-badge text-success

Never use danger or warning for security indicators — those colors signal risk and attention, not safety.

---

*This Iconography guide ensures visual consistency across every icon used in the Lytio product and marketing.*
