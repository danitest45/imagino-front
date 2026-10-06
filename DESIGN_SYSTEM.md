# Working Studio design system

Imagino / AI Creative Workspace. One light system shared by marketing, Create, Library, account and Costs. Solid surfaces, deliberate frames, restrained teal, editorial imagery. No dark-mode product or new UI framework was introduced.

## Tokens and measured contrast

| Role | Value | Relevant contrast |
| --- | --- | --- |
| Canvas | `#F6F4EE` | — |
| Surface | `#FFFFFF` | — |
| Main text | `#202421` | 14.29:1 on canvas |
| Secondary text | `#59635E` | 5.66:1 on canvas |
| Accent / focus | `#166A63` | 5.83:1 on canvas |
| Primary button text | `#FFFFFF` | 6.41:1 on accent |
| Functional control border | `#858F87` | 3.35:1 on white |
| Decorative divider | `#DADDD5` | Decorative only |
| Hover / pressed | `#10554F` / `#0C443E` | White foreground |
| Soft accent | `#E7EFEB` | Dark accent foreground |
| Error | `#9C3434` on `#FFF0EE` | Text and message, not color alone |
| Warning | `#795016` on `#F8EFD9` | Text and message, not color alone |

Ratios computed from sRGB relative luminance. Automated browser checks are evidence for tested states, not a WCAG certification. Focus: 3px solid teal with 4px offset; main controls 44px minimum; disabled controls remain labeled and never imply an available operation.

## Typography, spacing and imagery

Inter variable Latin 100–900 is bundled locally from the existing build, with `next/font/local` and `font-display: swap`. No Google font request at runtime/build. License: SIL Open Font License 1.1; copyright and full license are in `public/fonts/OFL-Inter.txt` ([upstream license](https://github.com/rsms/inter/blob/master/LICENSE.txt)). Arial/sans-serif fallback. One family; no font purchase. UI body 15px, inputs 14px; display scales to 68px desktop/40px small mobile. Amounts and dates use tabular numerals.

4px spacing rhythm, 8px action radii, 12–16px containers, subtle shadows. Content limits 1344px marketing, 1680px studio, 1520px Library. Create uses a 352px panel and flexible result, switching to linear layout at 850px. Library moves from 4/3 columns to 2 and 1. Reduced motion disables nonessential animation and smooth scrolling.

Local presentation derivatives total about 170 KB, plus an 11.7 KB reference. Below-fold images lazy-load with reserved dimensions. Main result uses `object-fit: contain`; thumbnail/display crops do not change download bytes. Private generation images retain the existing media proxy; authenticated downloads use the existing helper and revoke object URLs.

## Components and states

`StudioUI`: Button (primary/secondary/ghost/danger, disabled/loading), IconButton with accessible label, Input, Textarea, Select, StatusBadge, native Dialog, Tooltip, EmptyState and Skeleton. Existing toast helper now uses solid system surfaces. All have keyboard focus; inputs expose labels and error descriptions.

Production generation components: schema-driven controls, contextual model picker, AssetCard, large GenerationResult, native StudioDialog and shared Library grid. Modal Escape closes and returns focus; confirmed model/reuse changes describe discarded inputs. Native selects and details keep optional controls understandable without another dependency.

App navigation exposes Create and Library with account/balance utilities. Marketing links target real sections and Costs. Legacy image/video/callback routes remain intact and retain readable legacy surfaces.

`/design-review` reuses production components with deterministic, explicitly labeled sample data. It has no auth restore, API generation, cancellation or download actions. Server gate: development, or Vercel Preview with `ENABLE_DESIGN_REVIEW=true`; otherwise 404. Noindex metadata. Samples demonstrate credit/state presentation, not real balances or backend verification.

## Wordmark

Original geometric SVG lettering with a restrained framing detail at the final `o`. Primary, monochrome and favicon: `public/brand/wordmark.svg`, `wordmark-mono.svg`, `favicon.svg`. The SVGs contain paths/shapes and have no font/runtime dependency. No trademark registration, ownership of imagino.ai or exclusivity is claimed.
