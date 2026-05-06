# Design System Notes

Last updated: 2026-05-06

This file captures the current look and feel of the jewelry MVP so future screens, admin tools, widgets, and Figma Make prompts stay visually consistent.

## Brand Feel

- Luxury jewelry visualizer.
- Warm, cinematic, dark, and premium.
- More boutique showroom than generic SaaS.
- High contrast with black cards, white text, gold/brown accents, and selective blue action states.
- Rounded, soft, tactile UI surfaces.

Useful words for design prompts:

- warm espresso
- matte black
- muted gold
- black suede
- premium jewelry
- soft studio lighting
- rounded luxury cards
- clean modern SaaS

## Global Background

Main app background:

```css
background: linear-gradient(180deg, #C0883E 0%, #4A2510 50%, #050101 100%);
```

Figma description:

- Vertical linear gradient.
- Top: warm amber brown `#C0883E`.
- Middle: deep burnt brown `#4A2510`.
- Bottom: near-black espresso `#050101`.

Use this on customer-facing flows like home, pendant selection, name builder, picture pendant flow, and generation review screens.

Internal/admin pages currently use a flatter dark SaaS background:

```css
background: #101114;
```

## Color Palette

### Core Backgrounds

| Token | Hex / Value | Use |
| --- | --- | --- |
| `warm-amber-top` | `#C0883E` | Top of customer-facing page gradient |
| `burnt-brown-mid` | `#4A2510` | Middle of customer-facing page gradient |
| `espresso-black` | `#050101` | Bottom of customer-facing page gradient |
| `admin-bg` | `#101114` | Internal generation/admin background |
| `admin-card` | `#17191F` | Internal/admin cards |
| `modal-brown` | `#1D120C` | Dark modal/card brown |

### Surfaces

| Token | Value | Use |
| --- | --- | --- |
| `black-card` | `rgba(0, 0, 0, 0.90)` | Home/category cards |
| `black-panel` | `rgba(0, 0, 0, 0.35)` | Large panels/results sections |
| `black-input` | `rgba(0, 0, 0, 0.45)` | Inputs and secondary buttons |
| `black-strong` | `rgba(0, 0, 0, 0.60)` | Icon buttons, overlays |

### Gold And Brown Accents

| Token | Hex / Value | Use |
| --- | --- | --- |
| `muted-gold` | `#D1B873` | Category icons, pagination dots, gold accents |
| `selection-gold` | `#C5934F` | Selected style card border |
| `button-gold` | `#C9943B` | Lead modal submit / active gold action |
| `button-gold-hover` | `#F1B45A` | Gold button hover |
| `brown-border` | `#71451F` | Card/panel border |
| `brown-border-hover` | `#986035` | Card hover border |
| `warm-card-shadow` | `rgba(113, 69, 31, 0.45)` | Selected style shadow |

### Blue Action States

| Token | Hex / Value | Use |
| --- | --- | --- |
| `primary-blue` | `#3B82F6` | Main action buttons and selected UI |
| `primary-blue-soft` | `rgba(59, 130, 246, 0.20)` | Selected option background |
| `primary-blue-border` | `#60A5FA` | Active borders / pagination dots |
| `primary-blue-glow` | `rgba(59, 130, 246, 0.35)` | Focus/selection glow |

### Feedback Colors

| Token | Value | Use |
| --- | --- | --- |
| `error-bg` | `rgba(239, 68, 68, 0.10)` | Error banners |
| `error-border` | `rgba(239, 68, 68, 0.60)` | Error borders |
| `error-text` | soft red | Error copy |
| `success-bg` | `rgba(52, 211, 153, 0.10)` | Quote submitted banner |
| `success-border` | `rgba(52, 211, 153, 0.50)` | Quote submitted banner border |
| `warning-bg` | `rgba(252, 211, 77, 0.12)` | Emblem warning banner |

### Text

| Token | Value | Use |
| --- | --- | --- |
| `text-primary` | `#FFFFFF` | Main text |
| `text-secondary` | `rgba(255,255,255,0.75)` | Body/subtitle text |
| `text-muted` | `rgba(255,255,255,0.60)` | Helper text |
| `text-faint` | `rgba(255,255,255,0.35)` | Metadata and disabled text |

## Typography

Primary font:

```css
font-family: var(--font-figtree), system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
```

Loaded through Next:

- `Figtree` from Google Fonts.

Hero italic font:

```css
font-family: var(--font-nostalgic);
```

Local file:

- `public/fonts/perfectly-nostalgic-bold-italic.ttf`

Typography style:

- Main heading: bold, clean, white.
- Hero subtitle: italic, nostalgic/script-like, white at about 90% opacity.
- Step labels: tiny uppercase with very wide tracking.
- Buttons: lowercase or uppercase depending on context, medium/semi-bold.

Common examples:

```text
001
Dream it first
we'll build it.
```

Step labels use:

```css
font-size: 12px;
text-transform: uppercase;
letter-spacing: 0.35em;
color: rgba(255,255,255,0.70);
```

## Layout

Customer-facing pages:

- Centered max-width layout, usually around `max-w-4xl`.
- Inner content often constrained to `max-w-2xl`.
- Mobile-first spacing.
- Desktop adds wider padding.
- Cards use grid layouts:
  - 2 columns on mobile for category/format cards.
  - 3 columns on wider pendant format pages.
  - Horizontal scroll for name style selection.

Typical outer shell:

```css
min-height: 100dvh;
padding: 1rem;
color: white;
```

## Cards And Panels

### Category Cards

Use for product categories like Pendant, Ring, Bracelet, Necklace.

```css
border-radius: 30px;
background: rgba(0,0,0,0.90);
border: 1px solid rgba(209,184,115,0.25);
box-shadow: 0 18px 38px rgba(0,0,0,0.28);
```

Hover:

```css
border-color: rgba(209,184,115,0.70);
box-shadow: 0 0 28px rgba(209,184,115,0.14);
```

### Pendant Format Cards

Use for Name / Initials, Picture Pendants, Custom Design, etc.

```css
border-radius: 28px;
background: rgba(0,0,0,0.90);
border: 1px solid rgba(255,255,255,0.15);
```

Active card:

```css
border: 3px solid #60A5FA;
box-shadow: 0 0 25px rgba(59,130,246,0.35);
```

### Result Panels

Use for generation selection and video/quote screens.

```css
border-radius: 24px;
background: rgba(0,0,0,0.35);
border: 1px solid rgba(113,69,31,0.60);
```

### Image Cards

Generated images and style thumbnails should sit on black or black/brown card surfaces.

Typical image-card radius:

```css
border-radius: 30px;
```

Selected generated draft:

```css
border: 3px solid #60A5FA;
box-shadow: 0 0 35px rgba(59,130,246,0.45);
```

## Buttons

### Primary Blue

Use for main customer action like `accept`, `get a quote`, and active controls.

```css
background: #3B82F6;
color: #FFFFFF;
border-radius: 16px;
font-weight: 600;
```

Hover:

```css
background: #60A5FA;
```

### Secondary Dark

Use for back/home/edit/cancel actions.

```css
background: rgba(0,0,0,0.45);
border: 1px solid rgba(255,255,255,0.15);
color: #FFFFFF;
border-radius: 16px;
```

### Pill Back Button

```css
border-radius: 999px;
background: rgba(0,0,0,0.35);
border: 1px solid rgba(255,255,255,0.20);
text-transform: uppercase;
letter-spacing: 0.025em;
```

### Gold Button

Used in lead/contact modal.

```css
background: #C9943B;
color: #000000;
border-radius: 16px;
font-weight: 600;
```

Hover:

```css
background: #F1B45A;
```

### Red Video Button

Use only for the gated video action.

```css
background: #DC2626;
color: #FFFFFF;
border-radius: 16px;
font-weight: 600;
```

## Inputs

```css
background: rgba(0,0,0,0.45);
border: 1px solid rgba(255,255,255,0.15);
border-radius: 16px;
color: #FFFFFF;
```

Focus:

```css
border-color: rgba(255,255,255,0.40);
```

Placeholder:

```css
color: rgba(255,255,255,0.30);
```

## Pagination Dots

Customer flow dots:

- Active: blue `#60A5FA` or gold `#D1B873` depending on page family.
- Inactive: `rgba(255,255,255,0.25)`.

Home/category dots:

```css
border: 2px solid #D1B873;
active background: #D1B873;
```

Builder flow dots:

```css
active background: #60A5FA;
inactive background: rgba(255,255,255,0.25);
```

## Imagery

Jewelry images should generally be:

- On black, suede, velvet, or matte dark backgrounds.
- High contrast.
- Centered and easy to inspect.
- Presented inside rounded black cards.
- Cropped with enough margin to show full pendant and bail.

Generated product photography prompt language should mention:

- black suede
- velvet black
- studio lighting
- diamond sparkle
- commercial jewelry photo

## Admin/Internal UI

The current internal review page has a more utilitarian SaaS style:

- Background: `#101114`.
- Cards: `#17191F`.
- Borders: `rgba(255,255,255,0.10)`.
- Text: zinc/gray scale.
- Small monospaced metadata.
- Collapsible prompt panels.

Future admin dashboard should merge this practicality with the brand warmth:

- Keep admin data dense enough to operate.
- Use quote request cards with large thumbnails.
- Keep dark SaaS styling.
- Use muted gold for quote-priority accents.
- Use blue for primary actions like `Send Quote`.

Current polished owner dashboard:

- Route: `/owner`.
- Purpose: store-owner quote and generation monitoring, separate from the customer ideation flow.
- Access: simple `OWNER_ACCESS_CODE` gate.
- Quote requests appear above other generations on mobile.
- Desktop uses an admin sidebar with quote requests and other generations side by side.
- `Send Quote` saves price/note/status for now; email sending is future scope.

## Figma Make Design Prompt Snippet

Use this when asking Figma Make to match the current product:

```text
Use the existing jewelry MVP visual language: a vertical warm brown-to-black gradient background with #C0883E at the top, #4A2510 in the middle, and #050101 at the bottom. Use matte black cards, rounded 28-30px corners, muted gold accents #D1B873, burnt brown borders #71451F, white primary text, soft white/gray secondary text, and selective blue action states #3B82F6 / #60A5FA. The feel should be premium jewelry, black suede, warm espresso, and modern SaaS. Typography should use a clean rounded sans for UI and a nostalgic italic script for the “we’ll build it.” subtitle.
```

## Do Not

- Do not default to purple gradients.
- Do not use bright white backgrounds for customer flows.
- Do not make cards square/sharp unless intentionally changing direction.
- Do not overcrowd cards with technical metadata.
- Do not use generic ecommerce styling; keep the black/gold jewelry mood.
- Do not expose API or prompt internals in customer-facing UI.
