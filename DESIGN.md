# Meta Commerce Design System

## Overview

Meta's commerce surfaces read as a confident hardware merchandiser. The brand voice is photography-first: large product imagery, stark white canvas, generous whitespace, and tight typographic hierarchy. The system uses a dual CTA pattern: black pill primary CTAs for marketing surfaces and saturated cobalt blue commerce CTAs inside buy-now flows, paired with outlined ghost secondary buttons.

Optimistic VF anchors the system, with Montserrat, Helvetica, Arial, and Noto Sans fallbacks. Headings use `ss01` and `ss02` OpenType features. Below tablet widths, layouts collapse cleanly: hero stacks, pill nav becomes a drawer, feature grids flatten, and purchase summaries become sticky bottom bars.

**Key Characteristics:**
- Stark white canvas (`#ffffff`) with soft cloud surfaces (`#f5f6f7`)
- Commerce CTA cobalt (`#0064e0`) used sparingly and intentionally
- Deep ink text (`#0a1317`) with slate/steel secondary copy
- Pill buttons and chips with full rounding
- Large 32px rounded cards and flat hairline borders
- Minimal shadows; elevation is reserved for sticky panels and modals
- Product/image/content surfaces carry the visual weight, not decorative chrome

## Colors

### Brand & Accent
- **Cobalt Primary** (`#0064e0`): Commerce CTA, active controls, buy-now actions.
- **Deep Cobalt** (`#0143b5`): Pressed state, active links, high-emphasis data.
- **Soft Cobalt** (`rgba(0,100,224,0.15)`): Informational tints.
- **Facebook Blue** (`#0866ff`): Focused form controls and selected states.
- **Meta Link Blue** (`#0064e0`): Inline link affordances.
- **Oculus Purple** (`#5f4bff`): VR category accent only.

### Surface
- **Canvas White** (`#ffffff`): App background and primary card surface.
- **Soft Cloud** (`#f5f6f7`): Secondary panels, map well, input groups.
- **Hairline Gray** (`rgba(10,19,23,0.12)`): Inputs and prominent dividers.
- **Hairline Soft** (`rgba(10,19,23,0.08)`): Cards, section breaks, nav border.

### Text
- **Deep Ink** (`#0a1317`): Primary headings and body text.
- **Ink** (`#1c2b33`): Standard body and secondary headings.
- **Charcoal** (`#344854`): Tertiary labels and button text.
- **Slate** (`#465a69`): Supporting microcopy.
- **Steel** (`#637381`): Captions and footer hierarchy.
- **Stone** (`#8a8d91`): Disabled/de-emphasized labels.

### Semantic
- **Success** (`#008a00`): Affirmations.
- **Attention** (`#ff7a00`): Mid-priority alerts.
- **Warning** (`#f7b928`): Promotional banners and limited-time tags.
- **Critical** (`#d93025`): Validation/destructive feedback.
- **Critical Strong** (`#b00020`): Error border and inline labels.

## Typography

### Font Family
Use **Optimistic VF** when available. Fallbacks: Montserrat, Helvetica, Arial, Noto Sans. Headings use `font-feature-settings: "ss01" 1, "ss02" 1`. Body copy can use slight negative letter spacing, but app UIs should prioritize legibility.

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---:|---:|---:|---:|---|
| `hero-display` | 64px | 500 | 1.16 | 0 | Marketing hero |
| `display-lg` | 48px | 500 | 1.17 | 0 | Section opener |
| `heading-lg` | 36px | 500 | 1.28 | 0 | Major panels |
| `heading-md` | 28px | 300 | 1.21 | 0 | Editorial subheads |
| `heading-sm` | 24px | 500 | 1.25 | 0 | Card titles |
| `subtitle-lg` | 18px | 700 | 1.44 | 0 | Callouts, FAQ titles |
| `body-md` | 16px | 400 | 1.50 | -0.16px | Body |
| `body-sm` | 14px | 400 | 1.43 | -0.14px | Secondary copy |
| `caption` | 12px | 400 | 1.33 | 0 | Microcopy |
| `button-md` | 14px | 700 | 1.43 | -0.14px | Pill buttons |

## Layout

### Spacing System
Use a 4px base with 8px as the dominant step. Common tokens: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 120px.

### Grid & Container
- Marketing max-width: about 1280px with 32-48px gutters.
- Dashboard/app workspaces can expand wider but should preserve generous gutters.
- Dense panels should use 16-24px internal rhythm; showcase cards use 32px padding.

### Whitespace Philosophy
Whitespace should make content feel confident and hardware-retail clean. Use flat surfaces and rounded geometry instead of decorative shadow stacks.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0 | No shadow, 32px radius, hairline border | Default cards and feature surfaces |
| 1 | `rgba(0,0,0,0.2) 1px 1px 0` | Active pill indicator |
| 2 | `rgba(20,22,26,0.3) 0 1px 4px` | Sticky panels, modals, floating utility |

## Shapes

| Token | Value | Use |
|---|---:|---|
| `rounded.xs` | 2px | Fine controls |
| `rounded.sm` | 4px | Tags |
| `rounded.md` | 6px | Small thumbnails |
| `rounded.lg` | 8px | Inputs |
| `rounded.xl` | 16px | Standard cards |
| `rounded.xxl` | 24px | Promo tiles |
| `rounded.xxxl` | 32px | Feature cards, map panels |
| `rounded.feature` | 40px | Large hero panels |
| `rounded.full` | 100px | Buttons, badges, chips |
| `rounded.circle` | 50% | Icon buttons and swatches |

## Components

### Buttons
- **button-primary**: black pill, white text, `14px 30px`, `rounded.full`.
- **button-buy-cta**: cobalt pill `#0064e0`, white text, pressed `#0143b5`.
- **button-secondary**: transparent pill, 2px deep ink border.
- **button-ghost**: transparent pill, soft hairline border.
- **button-icon-circular**: 40x40 circular utility button.

### Cards & Containers
- **card-product-feature**: white, 32px radius, 32px padding, soft hairline border.
- **card-feature-photo**: full-bleed image, 32px radius, no border or shadow.
- **card-checkout-summary**: white, 16px radius, hairline border, level-2 shadow.
- **product-thumbnail**: soft cloud background, square, 16px radius.
- **why-buy-tile**: white, 16px radius, 24-32px padding, soft border.

### Inputs & Forms
- **text-input**: white, 44px height, 8px radius, hairline border.
- **text-input-focused**: 2px Facebook Blue border.
- **text-input-error**: critical border and critical helper text.
- **search-pill**: soft cloud, full pill, 40px height.
- **radio-option-selected**: 2px deep cobalt border.

### Badges & Status
- **badge-promo-yellow**: warning background, deep ink text, caption-bold.
- **badge-success**: success background, white text.
- **badge-critical**: critical background, white text.
- **promo-banner**: full-width strip above nav; dark ink or yellow.

### Navigation
Desktop top nav is a sticky white bar with a soft hairline border. Category navigation uses pill tabs. Mobile collapses into logo + hamburger + cart.

### Signature Components
- **hero-band-marketing**: full-bleed product image, white overlay copy, dual CTA.
- **product-gallery-pdp**: thumbnail rail, large rounded image, sticky purchase rail.
- **feature-icon-row**: four reassurance benefit tiles.
- **faq-accordion**: rounded accordion items with body copy below.
- **tech-specs-table**: two-column key/value rows with soft dividers.

## Do's and Don'ts

### Do
- Use cobalt only for commerce/action emphasis.
- Use black primary CTAs on marketing surfaces.
- Use pill buttons and chips consistently.
- Use 32px radius for large visual surfaces.
- Keep shadows scarce and functional.
- Use `ss01, ss02` together on headings.

### Don't
- Don't use cobalt everywhere; scarcity gives it meaning.
- Don't introduce extra accents beyond cobalt and product/category accents.
- Don't square off buttons.
- Don't use heavy shadows on marketing cards.
- Don't compress body line-height below 1.5.

## Responsive Behavior

| Name | Width | Key Changes |
|---|---:|---|
| Mobile small | <480px | Single column, smaller hero type, sticky bottom actions |
| Mobile large | 480-767px | Feature tiles can render two-up |
| Tablet | 768-1023px | Two-column grids, compressed split layouts |
| Desktop | 1024-1359px | Full grids and standard nav |
| Wide desktop | >=1360px | Wider gutters and larger visual surfaces |

Touch targets should be 40-44px minimum. Inputs render at 44px height. Swatches need expanded hit zones.

## Iteration Guide

1. Focus on one component at a time.
2. Reference tokens directly.
3. Run `npx @google/design.md lint DESIGN.md` after edits when the linter is available.
4. Add interaction variants as separate component entries.
5. Default body to `body-md`; step headings down through the hierarchy.
6. Keep cobalt scarce.
7. Pill-shaped buttons always.

## Known Gaps

- Dark mode tokens are not defined.
- Animation timings are not extracted; use 150-250ms ease-out for transitions.
- Some decorative pastel product tints are photographic content, not system colors.
