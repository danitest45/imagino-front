# Imagino Creative Hub Core

## Scope and baseline

This is a stacked frontend change on `feat/imagino-creative-hub-core`, based on the fetched HEAD of `feat/imagino-working-studio`: `46c64a646dd1504369ef917c8075ea80e45b432c`. The approved checkout was clean before work. PR #88 remains the base, unchanged and unmerged.

The approved Vercel Preview was verified READY: `dpl_H6v4cP2FZf1PZQnQ5NbQnbDFNV7e`, with the same Git SHA, project `imagino-front` / `prj_2Av1b3qZgj0EwyQKwQK7W7TbnIgy`, team `danitest45s-projects`.

## Product changes

- Shared app shell for Image, Video, Assets and Account. A labeled 208 px sidebar becomes a focus-contained drawer below 1120 px. Credits and appearance use the existing APIs and theme preference. Public landing retains Working Studio.
- Image and Video share a 360 px desktop creation panel, schema controls, quote footer, Generate action and asset workspace. On desktop controls scroll inside the panel; on narrow screens they return to document flow.
- Catalog-driven model picker groups by intent, exposes native/provider information, capabilities, availability and estimated starting cost; a current selected quote is shown when present. Search appears at eight models. Unavailable models have disabled Choose plus a separate View controls action; inspection cannot quote or generate. The picker loads on demand.
- Presentation metadata accepts optional catalog fields. A central adapter maps existing catalog categories and verified exact native IDs; it never changes capabilities, availability, billing, prices or request schemas. Unknown providers remain unnamed rather than guessed.
- Model changes preserve compatible settings and exact reference bytes. Incompatible inputs/settings are listed before confirmation; cancel preserves the setup. Quotes invalidate with request changes. Continuing with an asset in another media studio asks before replacing a draft.
- Workspace thumbnails change the selected asset without navigation. Media filters appear only for types in loaded history. Status, reserved/charged/refunded credits and media errors are server-derived.
- `/library` remains compatible and is labeled Assets. Search/model/status/media/refund filters apply only to up to 30 owned recent jobs. Detail loads on demand. No folders, persistent labels, uploads library, projects or global search are implied.
- Owned completed results expose supported reference preparation and download; prompt/settings reuse also recovers existing failed or cancelled drafts. The reusable action policy has no Edit, Animate, Compare or unimplemented variation actions. API ownership remains authoritative.
- `/design-review` uses production components with explicit local sample fixtures for Image, Video migration/unavailable, model picker, alternate schemas, Assets, result/empty/loading/error/queued/refund states. It performs no account, catalog, quote, download or generation requests.

## UI stack

See [UI dependency audit](CREATIVE_HUB_UI_AUDIT.md) for the complete before-change inventory and legacy boundaries.

Official stack: Tailwind 4 + Working Studio semantic tokens; Radix primitives; Lucide icons; next-themes; Imagino visual components. The only added dependency is MIT `@radix-ui/react-dialog@1.2.0`. It consolidates `StudioUI.Dialog` and `StudioDialog` into `components/ui/Dialog.tsx` and supplies drawer/picker/detail focus behavior. Existing Radix Select/DropdownMenu share modal portal boundaries. No additional design-system suite or default shadcn styling.

## Contracts and limits

Auth, refresh/logout privacy, catalog, quote expiry/invalidation, idempotent recovery, jobs/history, authenticated download, ownership, reference preparation and themes retain their existing contracts. The Preview build guard explicitly includes the new branch and refuses production/wrong API/wrong media host/disabled V2 configuration.

No backend code, Render, Atlas, R2, Stripe, provider key, economic pricing, CORS, OAuth or production setting is changed. No real generation or payment is executed. Tests intercept external HTTP and local catalog/media proxy paths; unexpected requests are blocked. Sample review actions cannot spend credits.

New Preview origins are not added to the backend CORS allowlist in this frontend pass. Remote authenticated generation/download PASS is not claimed. Vercel SSO remains intact. See deployment evidence for the exact published status and observed access boundary.

## Validation and bundle

Final command results, browser engines, screenshot/accessibility counts and exact deployment are recorded in [evidence](evidence/creative-hub/README.md). Build-reported First Load JS is compared with the unchanged approved base using the same public staging settings. ModelPicker and Assets detail are conditional dynamic imports. No micro-optimization changes billing/auth semantics.

## Founder review

Open `/design-review` on the Preview. Switch Surface between Image, Video and Assets; switch State to Model picker, Alternate settings, Reference, Empty, Queued, Refunded and Error. Use Appearance for System/Light/Dark, and the mobile drawer at narrow widths. All fixture credits/models/output images are explicitly sample presentation data.

Creative Hub Core UX ready for founder review.
