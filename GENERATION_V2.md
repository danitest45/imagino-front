# Generation 2.0 Preview

Branch codex/imagino-ai-revival-v2, base fix/revival-operational-security. No production deploy or merge.

New routes /create/image and /create/video render fields, reference roles and validation rules from the catalog. Submission/quotes/history/download use the authenticated staging API. A public same-origin catalog route serves the live backend catalog when available; during downtime it serves a versioned snapshot marked deployment_pending, with all creation disabled and a visible notice. The snapshot is not a successful job or an authoritative quote.

Preview-only variables for this branch: NEXT_PUBLIC_API_URL=https://imagino-api-ai-staging.onrender.com, MEDIA_ALLOWED_HOSTS=pub-56f86851d1884a3b8e7a73f1624e4239.r2.dev, NEXT_PUBLIC_GENERATION_V2_ENABLED=true. next.config.ts refuses a wrong API/bucket/target for this branch.

Validation: 26 Node tests and TypeScript passed. Next build passed; legacy warnings remain. Real authenticated Generation V2 flow on Render is pending because a pre-existing startup configuration gate blocked the API deployment. No paid provider call was made. A synthetic success/failure provider is implemented in the companion API, but its deployed worker/R2 flow has not yet been verified.

The final Google deprecation check found Veo 3.1 Gemini Preview retirement scheduled for October 22, 2026. The companion API blocks activation of those endpoints as migration_required, including older ACTIVE catalog rows, and rejects quotes once retired. Both video tools remain unavailable compatibility previews. The public snapshot revision is 2026-10-02.2; underlying image/pricing versions remain .1. A launch video integration requires a current endpoint and its own verified contract.

Market research, provider/catalog decisions, economics, architecture, UX notes and implementation report are in imagino-api/docs on the same branch. Refresh src/data/generation-catalog-preview.json from the public projection of the compiled API catalog whenever its immutable revision changes; preserve deployment_pending for every fallback entry. Never copy credentials or private pricing metadata into the snapshot.
