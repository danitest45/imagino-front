# Working Studio validation

Validated 2026-10-05. Frontend-only rebrand, built from `codex/imagino-ai-revival-v2` at `c57f923d533ce92b92525a2e9f963958dd0c8b0a`. The base checkout was clean and its remote SHA matched before implementation. Work is isolated on `feat/imagino-working-studio`; implementation agents used separate worktrees and one integrator reviewed the combined result. No merge or production promotion.

## Implemented

Editorial landing with the verified call-3 reference/result relationship; local wordmark, licensed font and shared tokens; Create with schema-driven controls, current quotes, large contained output, recent selection and detail/zoom; authenticated Library with search and model/status filters across the last 30 jobs; owned-image reference preparation and prompt/settings reuse; unified auth, account and Costs. Unsupported AIStaging actions are visibly unavailable. Legacy routes remain intact.

Auth, catalog, quote, jobs, cancellation and authenticated download retain existing contracts. Stale account responses are rejected, logout clears the visible session even when revocation fails, quote changes/expiry block submission, ambiguous retries preserve the request and idempotency key, and reuse never submits generation. No backend, provider, Stripe, OAuth, credit policy, bucket policy or DNS change was made.

## Commands and results

Local environment: Windows, Node 24.11.1, installed Next 15.5.27 / React 19.1.0 from the existing application dependency range and lock. Runtime versions were not migrated. Playwright and axe are development-only additions for browser behavior and accessibility verification.

| Check | Result | Evidence |
| --- | --- | --- |
| `npm ci --offline --no-audit --no-fund --cache ./.npm-cache` (after initial online install) | PASS, 346 packages with current lock | [npm-ci.log](evidence/rebrand/npm-ci.log) |
| `npm test` | PASS, 29 tests, existing tests preserved | [unit-tests.log](evidence/rebrand/unit-tests.log) |
| `npm exec tsc -- --noEmit` | PASS, no diagnostics | [typecheck.log](evidence/rebrand/typecheck.log) |
| `npm run lint` | PASS, zero errors; 5 existing legacy image warnings | [lint.log](evidence/rebrand/lint.log) |
| `npm run build` with Preview variables below | PASS | [build.log](evidence/rebrand/build.log) |
| `npm run test:browser` against compiled build | PASS, 14 tests | [browser-tests.log](evidence/rebrand/browser-tests.log), [JSON](evidence/rebrand/browser-results.json) |
| `node scripts/capture-review.cjs` | PASS, 57 captures / 27 axe audits; no horizontal overflow, broken images, page errors or axe violations | [visual-results.json](evidence/rebrand/visual-results.json) |
| Manual keyboard review in Codex browser | PASS: Enter opens full-image dialog; focus enters Close; Tab remains in modal; Escape closes and restores image-trigger focus | Observed on compiled `/design-review`; automated Library dialog and mobile-menu checks supplement this |
| Production isolation, same compiled build with production runtime environment | PASS: `/design-review` returns 404, no review controls/data in response; Preview returns 200 with noindex | [review-isolation.json](evidence/rebrand/review-isolation.json) |

The obsolete `next lint` command was replaced with ESLint over source/config/browser tests; no lint rule was disabled. The build guard protects both the original and rebrand branches. Unit tests reject production, wrong API, wrong media host, and disabled Generation V2 for both branches.

Preview configuration is restricted to this branch and Preview target:

```text
NEXT_PUBLIC_API_URL=https://imagino-api-ai-staging.onrender.com
MEDIA_ALLOWED_HOSTS=pub-56f86851d1884a3b8e7a73f1624e4239.r2.dev
NEXT_PUBLIC_GENERATION_V2_ENABLED=true
ENABLE_DESIGN_REVIEW=true
```

Local reproduction: build with these variables plus `VERCEL_ENV=preview` and `VERCEL_GIT_COMMIT_REF=feat/imagino-working-studio`, then `npm start -- --port 3110`. Browser tests use installed Chrome and `PLAYWRIGHT_BASE_URL` (default `http://127.0.0.1:3110`). The capture script also expects the untouched baseline build on port 3111 for before/after screenshots.

## Visual review and evidence

Captured the running compiled pages, inspected the initial layout, corrected wordmark geometry, spacing, contrast, mobile overflow and component states, then recaptured. `landing-first.png` is an early iteration, not the final result. Screenshots contain controlled sample data or signed-out states, not customer media or real sessions.

| Surface / state | Evidence |
| --- | --- |
| Landing before / after, same 1440px viewport | [Before](evidence/rebrand/baseline-landing-1440.png) / [After](evidence/rebrand/landing-1440.png) |
| Create baseline, 1440px | [Before](evidence/rebrand/baseline-create-1440.png); baseline is signed out, not an authenticated feature comparison |
| Landing mobile | [390px](evidence/rebrand/landing-390.png) / [320px](evidence/rebrand/landing-320.png) |
| Create empty / reference / result | [Empty](evidence/rebrand/create-empty.png), [Reference](evidence/rebrand/create-reference.png), [Result](evidence/rebrand/create-result-1440.png) |
| Library full / empty / filtered / detail | [Full](evidence/rebrand/library-full.png), [Empty](evidence/rebrand/library-empty.png), [Filtered](evidence/rebrand/library-filtered.png), [Detail](evidence/rebrand/library-detail.png) |
| Use as reference, real components with intercepted HTTP | [Before](evidence/rebrand/http-mock-reference-before.png) / [Prepared](evidence/rebrand/http-mock-reference-prepared.png) |
| Error / no balance / unavailable / refunded | [Error](evidence/rebrand/create-error.png), [No balance](evidence/rebrand/create-no-balance.png), [Unavailable](evidence/rebrand/create-unavailable.png), [Refunded](evidence/rebrand/create-refunded.png) |
| Login / account / Costs | [Login](evidence/rebrand/login-1440.png), [Account sample](evidence/rebrand/account-sample.png), [Costs](evidence/rebrand/pricing-1440.png) |
| 200% text size | [Landing](evidence/rebrand/landing-text-200.png) / [Create](evidence/rebrand/create-text-200.png) |

Landing, Create, Library, login and Costs were checked at 320, 390, 768, 1440 and 1920px. Additional `real-*.png` captures show real application routes with authentication intercepted to return signed-out and environment-unavailable states; they are not authenticated staging evidence. Accessibility results apply to these tested states; they are not certification. Token contrast measurements and keyboard/focus behavior are documented in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

The new Create composition uses a 352px control panel and flexible large result instead of a stack of equally weighted forms. The landing uses one genuine reference relationship and separately captioned independent outputs. Library offers useful density without invented persistence.

## Behavioral coverage and integration boundaries

The 14 browser tests exercise quote invalidation by prompt/settings/reference changes; valid and invalid uploads; model-change cancel/confirm; duplicate-click prevention and exact ambiguous-submit replay; filters and keyboard detail; owned-image reference download/preparation; settings reuse without invented references; failed-download draft preservation; empty/error/signed-out states; immediate logout despite revocation failure; quote expiry with a replacement pending; unavailable model blocking; design-review isolation; and 320px mobile navigation/focus.

**Real implementation:** production React components, compiled Next routes, schemas/helpers/guards, actual authorized existing demonstration assets, authenticated API wiring. The UI shows actual API/session state outside design review.

**Controlled simulations:** browser test HTTP responses, dummy in-memory test token, and clearly labeled deterministic design-review presentation data. External browser requests in the automated suite are intercepted. These demonstrate frontend behavior, not provider execution, remote authentication, billing, backend security or CORS acceptance. No shared Pipeline Demo job was submitted.

**Remote limitation:** the API is configured for the previous exact Preview origin. The new origin needs a separately authorized operational CORS change. Remote authenticated E2E and browser download are not marked PASS. The earlier inconclusive remote download remains inconclusive. No proxy/bypass, old alias reuse or backend change was introduced.

No new provider generation was called or paid for. The existing recorded `PaidGenerationEnabled=false` configuration was not changed. No payment or plan was enabled.

## Performance observations

Compiled local Chrome timings (HTTP auth intercepted): landing DOMContentLoaded/load 334/347ms; Create 80/93ms; Library 29/40ms; login 34/43ms; Costs 46/53ms. These are local observations, not production benchmarks or promises. See [local-timings.json](evidence/rebrand/local-timings.json). Build first-load JS: landing 114 KB, Create 125 KB, Library 120 KB. Optimized presentation images total about 170 KB plus the original 11.7 KB reference; font and images are local and dimensions are reserved.

## Before any promotion

1. Founder visual review of the isolated Preview.
2. Separately authorize the exact new origin in AIStaging; then perform remote session/history/reference/download smoke tests without paid generation.
3. Obtain explicit approval for any future payment activation, paid generation, backend change or production promotion. None is implied by this PR.

## Published Preview and remote observations

- [Draft PR #88](https://github.com/danitest45/imagino-front/pull/88), stacked on the verified base above.
- [Preview](https://imagino-front-mcy70revp-danitest45s-projects.vercel.app) and [design review](https://imagino-front-mcy70revp-danitest45s-projects.vercel.app/design-review).
- Vercel deployment `dpl_GeQELCN3KUPm64yLrmmyUzGWmocs`: **READY**, Preview target, implementation commit `8f0d5d80299e2d6e531614c4afc3c6f2b7da9818`. Vercel completed the build in 54s, on the existing Node 22.x project setting. [Build log](evidence/rebrand/vercel-build.log). Subsequent evidence/documentation changes do not modify application source.
- The four public configuration variables were created only for `feat/imagino-working-studio`, target `preview`. Production and the original staging branch/alias were not modified.
- At 2026-10-06 00:35 UTC (2026-10-05 local), an unauthenticated OPTIONS to the existing login endpoint with the new exact origin returned **204 without Access-Control-Allow-Origin**. This origin is not authorized for browser authentication. [Sanitized observations](evidence/rebrand/remote-preview.json).
- Unauthenticated GET requests to the landing and design review returned **302 to Vercel SSO**. The existing deployment protection remains active. Automatic approval review rejected the remote browser navigation because of the SSO access boundary; no protected content was inspected, no bypass link was created, and no access setting was changed. Local compiled visual/keyboard checks passed; remote visual inspection behind SSO is not claimed.
- No provider generation request was sent. Remote authenticated E2E and browser download remain pending as described above.
