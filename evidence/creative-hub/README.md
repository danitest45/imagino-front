# Creative Hub Core review evidence

Base: `feat/imagino-working-studio` at `46c64a646dd1504369ef917c8075ea80e45b432c`, fetched and verified clean before creating `feat/imagino-creative-hub-core`. This is a stacked frontend change; PR #88 is unchanged and unmerged.

## Review guide

The [implementation report](../../CREATIVE_HUB_CORE.md) describes the shell, shared Image/Video studio, catalog-driven model picker, contextual settings and recent Assets. The [UI audit](../../CREATIVE_HUB_UI_AUDIT.md) records the component inventory, official stack, dependency decision and retained legacy boundaries.

Use `/design-review` in the published Preview. All fixtures are explicitly sample data. Surface selects Image, Video, Assets, Account, Costs or Components. State exposes model picker, alternate schema/settings, result, reference, empty, queued, refunded and error states. Appearance preserves the existing System/Light/Dark behavior. The review makes no account, catalog, quote, generation, payment or media preparation calls.

## Before and after

Before images are the approved Working Studio evidence already committed at the base SHA. After images use the compiled Creative Hub frontend with local fixtures; no generated output was recolored or replaced.

| Surface | Approved before | Creative Hub after |
| --- | --- | --- |
| Light Image, desktop | [Before](../theme/chromium/light-create-result-1366.png) | [After](screenshots/light-image-1366.png) |
| Dark Image, desktop | [Before](../theme/chromium/dark-create-result-1366.png) | [After](screenshots/dark-image-1366.png) |
| Light Image, mobile | [Before](../theme/chromium/light-create-result-390.png) | [After](screenshots/light-image-390.png) |
| Dark Image, mobile | [Before](../theme/chromium/dark-create-result-390.png) | [After](screenshots/dark-image-390.png) |

Additional review surfaces: [Video unavailable](screenshots/dark-video-1366.png), [model picker desktop](screenshots/light-picker-1366.png), [model picker mobile](screenshots/dark-picker-390.png), [Assets desktop](screenshots/light-assets-1366.png), [Assets mobile](screenshots/dark-assets-390.png), [empty](screenshots/light-empty-1366.png), [error](screenshots/dark-error-390.png), [alternate settings](screenshots/light-alternate-settings-1366.png), [drawer](screenshots/light-drawer-390.png).

The capture script covers 320, 390, 768, 1366, 1440 and 1920 CSS px in both themes, plus forced colors and 200% zoom. [Visual checks](visual-checks.json) record 64 screenshots and 24 axe audits: zero horizontal overflow, broken images, page errors, unexpected requests or accessibility violations. Chrome version is recorded in that file. The screenshot script is [reproducible](../../scripts/capture-creative-hub.cjs).

## Validation

- `npm ci --no-audit --no-fund`: PASS; 389 packages installed from lockfile ([log](npm-ci.log)).
- `npm test`: PASS, 39 tests ([log](unit-tests.log)). Includes model metadata/grouping, schema compatibility and asset action policy.
- `npx tsc --noEmit`: PASS ([log](typecheck.log), empty on success).
- `npm run lint`: PASS, zero errors; five existing legacy `no-img-element` warnings ([log](lint.log)).
- `npm run build`: PASS ([log](build-after.log)).
- Browser suite: **47/47 PASS in each engine**, zero failed, skipped or flaky tests (141 successful cases total). [Chrome](browser-chromium.json), [Firefox](browser-firefox.json), [WebKit](browser-webkit.json), with adjacent text logs. All 31 existing tests are retained, with 16 new tests for shell, picker and Assets.

Browser tests use the compiled production build and intercepted HTTP fixtures. They exercise auth privacy/logout, history failures, quote expiry/invalidation, idempotent recovery, download/reference preparation, Image/Video navigation, real availability gates, model keyboard/search, compatible input preservation, cancellation, cross-media continuation, actual asset selection/filtering, responsive drawer, focus return, nested menus, themes and touch. The capture suite additionally checks forced colors, reduced motion and 200% zoom. This is contract-level frontend verification; it does not claim new provider homologation or remote authenticated generation.

The complete engine suites were rerun after correcting two WebKit regressions: a nested Appearance popup clipped by its scrolling dialog, and touch release dismissing the newly opened menu. Final reports replace intermediate runs. On this Windows host Firefox requires the normal approved unrestricted browser-launch path; no app configuration was changed for that environment constraint.

## First Load JS

Both measurements use the same public staging configuration and Next build command. Values are the build report's rounded first-load estimates, not runtime transfer measurements.

| Route | Approved base | Creative Hub | Change |
| --- | ---: | ---: | ---: |
| Public landing `/` | 114 kB | 114 kB | 0 kB |
| `/create/[kind]` | 158 kB | 163 kB | +5 kB |
| `/library` | 153 kB | 155 kB | +2 kB |
| `/profile` | 148 kB | 149 kB | +1 kB |
| Sample `/design-review` | 174 kB | 185 kB | +11 kB |
| Shared by all routes | 103 kB | 103 kB | 0 kB |

Sources: [before build](build-before.log), [after build](build-after.log). Model picker and Assets detail load conditionally. The only added package is Radix Dialog, shared by drawers, model selection, confirmation and detail; no full UI suite was introduced.

## Deployment and access boundary

The Preview uses the existing Vercel project, with the same four public staging values scoped only to `feat/imagino-creative-hub-core` and target `preview`. Its guard rejects production, a different API/media host or disabled Generation V2. Published deployment identity and read-only access observations are recorded alongside this report when deployment completes.

Backend CORS and Vercel SSO are preserved. A new Preview origin is not automatically allowed to perform authenticated backend calls. No Render, Atlas, R2, Stripe, provider key, economic pricing, OAuth, production or backend changes; no paid generation.
