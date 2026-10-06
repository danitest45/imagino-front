# Working Studio design system

Imagino / AI Creative Workspace. One system shared by marketing, Create, Library, account and Costs, now with System / Light / Dark appearance. The approved light composition remains; dark uses warm charcoal layers and adapted teal. Solid surfaces, deliberate frames, restrained color and editorial imagery remain the identity.

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

Production generation components: schema-driven controls, contextual model picker, AssetCard, large GenerationResult, native StudioDialog and shared Library grid. Modal Escape closes and returns focus; confirmed model/reuse changes describe discarded inputs. Rebrand selects use the shared Radix component; native details keep optional settings compact. Existing legacy-route native controls are retained and receive the resolved browser color-scheme.

App navigation exposes Create and Library with account/balance utilities. Marketing links target real sections and Costs. Legacy image/video/callback routes remain intact and retain readable legacy surfaces.

`/design-review` reuses production components with deterministic, explicitly labeled sample data. It has no auth restore, API generation, cancellation or download actions. Server gate: development, or Vercel Preview with `ENABLE_DESIGN_REVIEW=true`; otherwise 404. Noindex metadata. Samples demonstrate credit/state presentation, not real balances or backend verification.

## Wordmark

Original geometric SVG lettering with a restrained framing detail at the final `o`. Primary, monochrome and favicon: `public/brand/wordmark.svg`, `wordmark-mono.svg`, `favicon.svg`. The SVGs contain paths/shapes and have no font/runtime dependency. No trademark registration, ownership of imagino.ai or exclusivity is claimed.

The header and footer now render that same geometry through `BrandMark`, using semantic foreground/accent colors. No CSS filters or image dimming are used. The favicon retains its high-contrast teal/white treatment.

## Appearance behavior and rendering

`Appearance` is a discrete header menu on marketing and application routes, available signed in or out. It exposes labeled radio choices **System**, **Light**, **Dark** with monitor/sun/moon and a selection check. Compact headers keep the accessible Appearance name while collapsing its desktop text. The component is also exercised inside the sample modal.

`AppearanceProvider` wraps both the ordinary session provider and isolated design-review path. `next-themes` 0.4.6 manages reactive system detection and storage synchronization; only `imagino-theme=system|light|dark` is stored. System remains the selected preference when it resolves to dark. Explicit choices override later device changes until System is selected again. Storage errors retain in-memory state; invalid values and cross-tab clearing return to System. This is same-origin browser persistence, not cross-device synchronization.

A fixed first-party inline bootstrap validates the preference and resolves the initial `html[data-theme]`, `data-theme-preference`, and `color-scheme` before body paint. The short synchronous script is intentional for first paint; it contains no interpolated user content. Only `html` suppresses its expected attribute hydration difference. The menu reserves its icon size before hydration; the page is never hidden. CSS follows `prefers-color-scheme` when JavaScript is absent or no valid theme attribute exists. No CSP/header/security policy was added or relaxed; the repository has no nonce/CSP implementation to modify. `next-themes` disables transitions only during a theme switch; normal reduced-motion preferences remain honored.

No theme key remounts the app, resets a form, alters generation parameters or makes an API request. Theme handling stays outside auth/generation helpers.

## Dark tokens and complete state coverage

| Role | Dark value |
| --- | --- |
| Background / surface / elevated | `#121513` / `#1A201C` / `#222A25` |
| Image canvas | `#171B18` |
| Foreground / muted / placeholder | `#E9EFEA` / `#ADB9B0` / `#A0AFA5` |
| Decorative / functional border | `#354039` / `#75837A` |
| Accent text / button / on-accent | `#79C7B5` / `#79C7B5` / `#10241E` |
| Hover / pressed / selected | `#283A31` / `#344B3E` / `#304A40` |
| Focus | `#8DE1CB` |
| Disabled surface / text | `#29322C` / `#A0AFA5` |

Global semantic tokens also cover status foreground/background/borders, selection, neutral image canvas, tooltip, toast, shadows, backdrops, skeletons and honest sample-data notices. Literal light colors were removed from landing, studio, account and review styles. Legacy page content keeps its existing palette; its shared header follows appearance.

[Measured token evidence](evidence/theme-css/contrast.json) covers 27 pairs per theme. Normal text minimum: light 4.89:1, dark 4.75:1; primary button 6.41:1 / 8.24:1; functional boundaries meet 3:1. Open Select placeholders use selected-text for 7.37:1 / 6.85:1 contrast. These measurements supplement browser inspection and do not certify WCAG compliance. Forced-colors uses system colors with visible outlines/selection checks and does not disable forced-color adjustment. Images retain their source pixels, full opacity and no filter in either theme.

Notebook-height Create layouts reduce heading, divider and prompt whitespace while retaining one page scroll and a large result. No sticky overlay hides cost, actions or focus.

## Selectors and overlay composition

`Select<Value extends string>` accepts `value`, `onValueChange`, typed options, placeholder, disabled and associated-label props. Undefined means placeholder; an explicit empty string remains the real All filter. An internal prefix accommodates Radix's reserved empty value without changing consumer contracts. Numeric generation settings are converted explicitly at their schema boundary. All triggers use `type="button"`.

`@radix-ui/react-select` 2.3.8 supplies listbox navigation, Home/End, arrows, typeahead, disabled-item skipping, selection and focus management. `@radix-ui/react-dropdown-menu` 2.1.25 supplies Appearance radio-menu behavior. Both use the Imagino tokens, contained scroll, collision-aware sizing and visible focus/selection. Long popup labels wrap instead of losing their meaning. No premade dashboard or visual theme was installed.

Native dialogs retain browser top-layer/focus behavior. `OverlayHost` and trigger ancestry place popups **inside their open dialog**, not behind it in body. Popup Escape is prevented/stopped and closes the popup first; its trigger regains focus. A subsequent Escape closes the dialog. Header Escape only handles its own open mobile navigation. Z-index is not used to cross the browser top layer.

Select background branches are temporarily inert, matching Radix's modal focus containment and assistive-technology hiding. The helper stops at the nearest native dialog, preserves preexisting inert state, observes newly inserted branches and releases before focus restoration. Scrollable option groups are labeled and focusable; Radix arrows, Home/End and typeahead remain responsible for option navigation. Dialog accepts an explicit return-focus target for browsers that do not focus buttons on pointer activation. Mobile disclosure links have explicit tab stops for WebKit's link-navigation behavior.

Forced-colors highlighted Select options use Canvas/CanvasText and a Highlight outline. This avoids the browser's text backplate hiding HighlightText while retaining automatic system color adjustment.

New runtime dependencies are exact pinned MIT packages compatible with React 19; Next/React/Tailwind remain unchanged. [Third-party notices](THIRD_PARTY_UI_NOTICES.md) preserve their licenses. A development override keeps `playwright-core` at the existing 1.56.1 used by Playwright and axe, avoiding duplicate incompatible Page types. Official references: [next-themes](https://github.com/pacocoursey/next-themes), [Radix Select](https://www.radix-ui.com/primitives/docs/components/select), [Radix DropdownMenu](https://www.radix-ui.com/primitives/docs/components/dropdown-menu).
