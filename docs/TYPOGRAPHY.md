# FineSet Typography Reference

Portable typography system for reuse in other projects. Source: `styles/globals.css`, `tailwind.config.ts`, `app/layout.tsx`, and UI components.

## Font families

| Role | Tailwind | CSS stack | Usage |
|------|----------|-----------|-------|
| Body / UI | `font-sans` | `var(--font-inter), Inter, system-ui, sans-serif` | Default body, buttons, forms, tables |
| Headings | `font-display` | `var(--font-playfair), Playfair Display, Georgia, serif` | `h1`–`h6`, page titles, card titles |
| Numbers | `font-numeric` | Same as sans (Inter) | KPIs, charts, currency |
| Monospace | `font-mono` | Tailwind default | Rare (e.g. employee IDs) |

### Next.js font setup

```ts
import { Inter, Playfair_Display } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

// <body className={`${inter.variable} ${playfair.variable}`}>
```

### Global body defaults

- `font-sans`
- `text-text-primary`
- `tabular-nums` — aligned numeric columns
- `antialiased` — font smoothing
- All `h1`–`h6` use `font-display`

## Font sizes (Tailwind defaults — no custom scale)

| Class | Size | Default line-height | Common usage |
|-------|------|---------------------|--------------|
| `text-[10px]` | 10px | — | Filter chips, badge counts |
| `text-[11px]` | 11px | — | Analytics category labels |
| `text-xs` | 12px / 0.75rem | 16px | Badges, meta, chart tooltips, mobile nav |
| `text-sm` | 14px / 0.875rem | 20px | Buttons, labels, tables, body copy |
| `text-base` | 16px / 1rem | 24px | Section titles, mobile form inputs |
| `text-lg` | 18px / 1.125rem | 28px | Section titles, dialog titles, portal logo |
| `text-xl` | 20px / 1.25rem | 28px | Toolbar headings |
| `text-2xl` | 24px / 1.5rem | 32px | Page titles, card titles |
| `text-3xl` | 30px / 1.875rem | 36px | Responsive page titles (`sm:text-3xl`) |
| `text-[0.8rem]` | ~12.8px | — | Calendar cells |

### Responsive patterns

- Page title: `text-2xl sm:text-3xl`
- KPI value: `text-lg sm:text-2xl lg:text-3xl`
- KPI label: `text-xs sm:text-sm`
- Inputs: `text-base md:text-sm` (prevents iOS Safari zoom on focus)

### Chart font sizes (Recharts)

- Axis ticks: `10px`–`12px`
- Tooltips / legends: `0.75rem` (12px)

## Font weights

| Class | Weight | Usage |
|-------|--------|-------|
| `font-normal` | 400 | Calendar, some dialog text |
| `font-medium` | 500 | Buttons, labels, nav active, table headers |
| `font-semibold` | 600 | Section titles, dialog titles |
| `font-bold` | 700 | Page titles, KPI values |

## Letter spacing

| Class | Value | Usage |
|-------|-------|-------|
| `tracking-tight` | -0.025em | Page titles, card titles |
| `tracking-wide` | 0.025em | Uppercase section labels |
| `tracking-wider` | 0.05em | Analytics category labels |

**Uppercase label pattern:** `text-xs font-medium uppercase tracking-wide text-text-muted`

## Line height

| Class | Value | Usage |
|-------|-------|-------|
| `leading-none` | 1 | Labels, dialog titles, card titles |
| `leading-tight` | 1.25 | Large KPI numbers |
| `leading-snug` | 1.375 | KPI labels, list items |
| `leading-relaxed` | 1.625 | Long-form copy, chat intros |

## Text colors

### Semantic text

| Token | Hex | Tailwind |
|-------|-----|----------|
| `--text-primary` | `#1c1c1e` | `text-text-primary` |
| `--text-secondary` | `#4b4b4b` | `text-text-secondary` |
| `--text-muted` | `#9ca3af` | `text-text-muted` |

### Brand

| Token | Hex | Tailwind |
|-------|-----|----------|
| `--brand-gold` | `#b8972e` | `text-brand-gold` |
| `--brand-gold-light` | `#d4af37` | `text-brand-gold-light` |
| `--brand-gold-dark` | `#8b6914` | `text-brand-gold-dark` |
| `--brand-charcoal` | `#1c1c1e` | `text-brand-charcoal` |

### Status

| Token | Hex | Tailwind |
|-------|-----|----------|
| `--status-success` | `#22c55e` | `text-status-success` |
| `--status-warning` | `#f59e0b` | `text-status-warning` |
| `--status-error` | `#ef4444` | `text-status-error` |
| `--status-info` | `#3b82f6` | `text-status-info` |

### Interactive patterns

- Links / accents: `text-brand-gold`
- Nav inactive: `text-text-secondary hover:text-brand-gold`
- Nav active: `font-medium text-brand-gold`
- Primary button: `text-white` on `bg-brand-gold`
- Placeholders: `placeholder:text-text-muted`

## Component class patterns

```tsx
// Page title (h1)
"font-display text-2xl font-bold text-text-primary sm:text-3xl"

// Page subtitle
"text-sm text-text-secondary"

// Section title (h2)
"font-display text-lg font-semibold text-text-primary"

// Card title (h3)
"font-display text-2xl font-semibold leading-none tracking-tight text-text-primary"

// Card description
"text-sm text-text-secondary"

// Dialog title
"font-display text-lg font-semibold leading-none text-text-primary"

// Form label
"text-sm font-medium leading-none text-text-primary"

// Button
"text-sm font-medium"

// Badge
"text-xs font-medium"

// Table head / cell
"font-medium text-text-secondary"  // th
"text-text-primary"                // td

// KPI label
"text-xs font-medium leading-snug text-text-secondary sm:text-sm"

// KPI value
"font-numeric text-lg font-bold leading-tight text-text-primary sm:text-2xl lg:text-3xl"

// Uppercase filter label
"text-xs font-medium uppercase tracking-wide text-text-muted"

// Desktop nav
"text-sm" + active: "font-medium text-brand-gold" / inactive: "text-text-secondary hover:text-brand-gold"

// Mobile nav chips
"text-xs" + active: "bg-brand-gold text-white" / inactive: "text-text-secondary"
```

## Tailwind config (typography slice)

```ts
fontFamily: {
  sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
  display: ["var(--font-playfair)", "Playfair Display", "Georgia", "serif"],
  numeric: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
},
colors: {
  brand: {
    gold: "var(--brand-gold)",
    "gold-light": "var(--brand-gold-light)",
    "gold-dark": "var(--brand-gold-dark)",
    charcoal: "var(--brand-charcoal)",
    ivory: "var(--brand-ivory)",
    cream: "var(--brand-cream)",
  },
  text: {
    primary: "var(--text-primary)",
    secondary: "var(--text-secondary)",
    muted: "var(--text-muted)",
  },
  status: {
    success: "var(--status-success)",
    warning: "var(--status-warning)",
    error: "var(--status-error)",
    info: "var(--status-info)",
  },
},
```

## Copy to another project

1. Copy `styles/typography-tokens.css` into your project.
2. Import it in your global CSS (before or alongside Tailwind).
3. Add the `fontFamily` and `text` / `brand` / `status` color entries to `tailwind.config.ts`.
4. Load Inter and Playfair Display (see Next.js setup above).
5. Apply body defaults: `font-sans text-text-primary tabular-nums antialiased`.

## Source files in this repo

- `styles/globals.css` — CSS variables + base typography
- `styles/typography-tokens.css` — portable token export
- `tailwind.config.ts` — font families + color tokens
- `app/layout.tsx` — Google font loading
- `lib/utils/typography.ts` — numeric font constant for charts
- `lib/charts/theme.ts` — chart tooltip/legend sizes
- `components/shared/PageTitle.tsx` — page/section title patterns
