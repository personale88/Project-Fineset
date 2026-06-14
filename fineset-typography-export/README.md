# FineSet Typography Export

Portable typography tokens and reference for use in other projects.

## Files

| File | Purpose |
|------|---------|
| `TYPOGRAPHY.md` | Full reference: fonts, sizes, weights, spacing, colors, Tailwind patterns |
| `typography-tokens.css` | Drop-in CSS variables + optional `.fs-*` utility classes |

## Quick start

1. Copy `typography-tokens.css` into your project (e.g. `styles/`).
2. Import in global CSS: `@import "./typography-tokens.css";`
3. Load **Inter** and **Playfair Display** and expose `--font-inter` / `--font-playfair` (see TYPOGRAPHY.md).
4. Add Tailwind `fontFamily` and `text`/`brand`/`status` color tokens from TYPOGRAPHY.md.
5. Apply body defaults: `font-sans text-text-primary tabular-nums antialiased`.

## Source

Exported from Project-Fineset.
