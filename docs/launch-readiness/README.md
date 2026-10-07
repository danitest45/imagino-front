# Frontend launch readiness
2026-10-07. TECHNICAL LAUNCH READINESS = BLOCKED until final backend staging deployment/private-image migration and public-access removal.

Stacked on Creative Hub [PR #89](https://github.com/danitest45/imagino-front/pull/89), base `109c9dbbb8bbde55b93436949c1db961590ab570`; exact branch `feat/imagino-launch-readiness`. Backend contracts and the 14 operational deliverables live in [backend launch docs](https://github.com/danitest45/imagino-api/tree/feat/imagino-launch-readiness/docs/launch-readiness).

Private images/video now fetch owner bytes with Authorization and cache:no-store. Object URLs are memory-only, aborted/revoked on unmount/job/session/logout. Assets lazy-load image bytes; no provider URL rendering or token query string. Downloads/reuse/Animate use the existing authenticated contract. Public optimization route retired with 410. Legacy job storage removed and old image-jobs/userEmail storage cleared. Generic error boundary and existing unavailable/session/retry states retained.

Preview is noindex. Robots disallows all, sitemap empty and no canonical by default. Production indexing needs approved HTTPS PUBLIC_SITE_URL plus INDEX_PUBLIC_SITE=true with VERCEL_ENV=production; temporary Vercel URLs rejected. Landing has favicon/title/description/OG/Twitter; private routes remain noindex. No tracking vendor added.

Validation: 41 unit tests, existing 60 browser tests plus private-media/logout and noindex/baseline tests; lint has zero errors (five existing img warnings), staging Preview build passes. Runtime npm audit zero reported vulnerabilities. Full audit still has five high development lint-chain findings in unpatched braces; only run lint on trusted sources. Next 15.5.27/eslint-config-next same-major patch and transitive patched overrides; no React major upgrade.

Build first-load JS: landing 114kB, Image 165kB, Library 156kB, shared 103kB. One controlled local Chromium navigation (mocked API, loopback): landing TTFB ~74ms/DOMContentLoaded 303ms, Image ~71/157ms, Library ~53/110ms; script transfers ~169/189/195kB. These are local samples, not real-user latency/LCP or production capacity. Across the three navigations: two history reads and five private-media reads; zero submissions. Large-video Blob buffering (up to 100MiB) needs actual-tier/browser capacity validation.

License declarations in lock: MIT 369, Apache 36, MPL 13, LGPL 10 plus mixed/native notices; one undeclared root. This is an inventory, not a legal clearance. Preserve distribution notices and review native Sharp/libvips obligations. No unused overlapping UI dependency was removed during this security phase; accessible custom Select/Appearance tests remain intact.

Keep compact sanitized summaries in Git; preserve existing review evidence. Put future screenshots/traces in release artifacts and local ignored runner output. Do not commit tokens/prompts/private bytes or raw provider responses.
