# Imagino 2.0 — Working Studio implementation brief

Approved direction: 2026-10-05. The user's pasted Working Studio request takes precedence over the earlier strategy documents.

## Product and audience

**Imagino — AI Creative Workspace.** The platform vision is a creative workspace across models, with room for future video. Initial communication focuses on freelance marketers, social creators, and small-brand product visuals. Freeform creation remains available. This focus is a launch hypothesis, not demonstrated product-market fit.

The supported working loop is reference → generation → selection → preparation of the next variation. Model identity, configuration, and current backend quote stay visible. Only homologated capabilities may be described as available. The Preview keeps paid generation disabled.

## Scope and isolation

Frontend base: `danitest45/imagino-front`, `codex/imagino-ai-revival-v2`, verified SHA `c57f923d533ce92b92525a2e9f963958dd0c8b0a`. Rebrand branch: `feat/imagino-working-studio`, in an isolated worktree, with a draft PR stacked on the base branch. The existing base PR, branch, and alias remain untouched.

Only the authorized AI staging API, `https://imagino-api-ai-staging.onrender.com`, is in scope. No backend, database, bucket policy, OAuth, Stripe, plans, balances, production deployment, DNS, merge, or provider activation changes are permitted.

## Visual system

Working Studio uses warm off-white `#F6F4EE`, solid white surfaces, graphite text `#202421`, decorative borders `#DADDD5`, and deep teal `#166A63`. Functional input borders and all text/focus states require measured contrast. Use clear sans typography, tabular numerals for amounts, restrained shadows, moderate radii, and a coherent 4px spacing scale. Local font licenses must be documented. A legible Imagino wordmark and compatible vector/favicon applications carry the identity.

The visual gesture is framing and continuity: a small reference, a prominent related output, and a clear next action. It must never imply a false image lineage. Marketing can use editorial composition; the application prioritizes useful density, large results, legible controls, and predictable keyboard/focus behavior.

## Information architecture and copy

Marketing navigation: How it works, Models, Costs, Sign in, and an availability-aware studio CTA. Application navigation: Create and Library, with balance/account as utilities. Preserve `/create/image` and legacy routes; unavailable video remains truthful and outside primary navigation.

For these synthetic demonstrations use the conservative headline **“Explore campaign visuals from your references.”** Explain references, chosen-image reuse, and cost before generating. Use **“Explore the studio”** for the Preview and **“Open studio”** when authenticated. Do not claim a free trial, customer outcomes, perfect fidelity, subscriptions, model breadth, or unsupported tools.

## Required experiences

- **Landing:** one verified reference/result story, concise workflow, visible model/cost control, reuse, supported-model limits, Costs/FAQ, and real destinations for every CTA.
- **Create:** compact creation panel, large contained result, schema-driven settings and inputs, current quote, explicit pending/error/credit states, real history, download, and preparation of a chosen output as a new reference.
- **Library:** authenticated recent jobs; model/status filters and search over loaded records; honest recent-history scope; large detail, prompt, settings, credit state, reuse, and download. No fake folders, favorites, pagination, or projects.
- **Account and Costs:** consistent visual treatment across existing routes; preserve normal auth contracts. AIStaging must visibly distinguish unsupported signup/reset/profile/billing capabilities and avoid requests to an older API. No invented plan prices or credit-to-USD conversion.
- **Accessibility:** keyboard operation, focus restoration/traps for dialogs, functional contrast, reduced-motion support, responsive layouts, and explicit error/loading/empty/signed-out states.

## Contract invariants

Auth tokens remain in memory and cookies use existing helpers. No token/media storage in localStorage, URLs, or logs. The public catalog fallback is unavailable; it never authorizes creation or supplies a valid quote.

Prompt, model, settings, and reference changes invalidate quotes. Generation uses the current quote and existing API. Ambiguous submission recovery retains the same idempotency key; there is no automatic new job, double click, overlapping polling, invented progress, or inferred refund. Old async responses must not refill another account's UI. Logout clears private UI state.

“Reuse prompt & settings” does not claim to restore discarded references. “Use as reference” downloads an owned image through the existing authenticated route, validates/prepares it with the existing input path, preserves the form on failure, and only prepares a new request. It must never submit generation automatically or fetch arbitrary URLs through a new proxy.

## Baseline coverage and regression priorities

The existing Node tests cover auth refresh/logout races; authenticated generation helper/idempotency; schema defaults and constraints; terminal-state normalization; catalog fallback/target/no-store gates; and media SSRF, DNS pinning, redirects, MIME, and size guards. These remain required. TypeScript, production build, and lint should be checked with the authorized Preview environment.

The rebrand's consequential browser scenarios are: quote invalidation and stale-response suppression; double-click and ambiguous-submit recovery; signed-out/authenticated history transitions and logout clearing; non-overlapping polling cleanup; schema-compatible model/reference changes; owned-image reuse preparation and failed-download form preservation; Library loading versus failure versus empty/filter-empty states; unavailable catalog/model/video actions; dialog keyboard behavior; and mobile result/control visibility. Use mocks or controlled fixtures where a real operation would generate cost. Passing helper tests alone does not establish these UI flows.

## Research used

Read the six 2026-10-05 sources in `research/imagino-2-strategy-2026-10-05`: `IMAGINO_2_PRODUCT_BRIEF.md`, `IMAGINO_VISUAL_DIRECTION.md`, `IMAGINO_PRODUCT_STRATEGY.md`, `IMAGINO_BRAND_STRATEGY.md`, `IMAGINO_LANDING_STRATEGY.md`, and `IMAGINO_PRICING_BENCHMARK_USD.md`.

Their broader product-positioning, batch/favorite/project suggestions, pricing hypotheses, and requests for further validation do not override the approved implementation scope. Competitor screenshots are research references, not republication assets. The pricing range is research, not an Imagino offer. Naming investigation and new interviews are not prerequisites for this implementation.
