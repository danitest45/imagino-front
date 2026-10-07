# Creative Hub fixed-workspace layout

Founder layout polish on the existing `feat/imagino-creative-hub-core` branch and [Draft PR #89](https://github.com/danitest45/imagino-front/pull/89). Before baseline: `42f199ba9db9c21872bfef9ea5052ebf857a12ea`. PR #88 remains the unchanged, unmerged base. This pass changes layout and local review fixtures; it adds no dependency and changes no provider, economic catalog, API, auth, CORS, infrastructure or billing contract. No real generation is submitted.

## Cause and final structure

The former shell had a minimum viewport height without a bounded Main/Studio height chain. Large result/empty-canvas minimum heights, a spacious page header and a sticky creation panel kept the workspace in document flow. Notices outside the input scroller also consumed footer space. In the review, the sidebar used `min-height:760px` and `height:calc(100dvh - 160px)`, while the toolbar occupied Main content: sidebar and workspace did not share one allocated height.

At desktop widths of at least 1120 px, AppShell now owns `height:100dvh` and hides document overflow. Sidebar fills its allocated height, with utilities pushed to the bottom. Main and Studio propagate `height:100%` and `min-height:0`; flex/grid distribute the remaining height without viewport subtraction constants. The compact page header retains the `h1`. Redundant top-level Open Assets and eyebrow copy are removed.

The creation panel has a fixed tool header, one input/notice scroller and a non-shrinking cost/Generate footer. The result column uses a flexible canvas with bounded actions/details and a compact horizontal recent-assets strip. Expanding result metadata scrolls its own details region. Long Assets scroll in the library content region while its heading and sidebar remain in place. Generic Account and review-component pages retain a Main content scroller.

The review is a viewport grid: toolbar plus `minmax(0,1fr)` preview container. The shell fills that container and reaches the physical viewport bottom. Below 1120 px, the fixed workspace rules do not apply: tablet/mobile use natural document flow and the existing navigation drawer.

Native scroll regions receive a focus stop, region role and accessible name only when content actually overflows. Their observers clean up. Control focus has 12 px scroll margins; compact fixed-region spacing keeps the last Audio control fully visible at doubled text size. Empty-canvas content cannot shrink into overlapping captions. Generation-status content uses safe centering so overflowing Failed/Queued text starts inside its scroll region and remains reachable. `position:relative` on each scroll region contains Radix's absolutely positioned hidden native selects; without that containing block those invisible elements still enlarged document scroll height.

## Before / after

All pairs use the same compiled local sample data and exact viewport dimensions. [Before geometry](before/geometry.json) and [after geometry](after/geometry.json) include document, sidebar, controls, footer and canvas rectangles and scroll offsets. Captures block API/external HTTP and record page errors and broken images.

| Surface / viewport | Before | After |
| --- | --- | --- |
| Image 1366×768 | [Top](before/light-image-1366x768-top.png) · [Bottom](before/light-image-1366x768-document-bottom.png) | [Top](after/light-image-1366x768-top.png) · [Bottom](after/light-image-1366x768-document-bottom.png) |
| Video 1366×768 | [Top](before/light-video-1366x768-top.png) · [Bottom](before/light-video-1366x768-document-bottom.png) | [Top](after/light-video-1366x768-top.png) · [Bottom](after/light-video-1366x768-document-bottom.png) |
| Image 1440×900 | [Before](before/light-image-1440x900-top.png) | [After](after/light-image-1440x900-top.png) |
| Video 1440×900 | [Before](before/light-video-1440x900-top.png) | [After](after/light-video-1440x900-top.png) |
| Image 1920×1080 | [Before](before/light-image-1920x1080-top.png) | [After](after/light-image-1920x1080-top.png) |
| Video 1920×1080 | [Before](before/light-video-1920x1080-top.png) | [After](after/light-video-1920x1080-top.png) |
| Dark Image 1366×768 | [Before](before/dark-image-1366x768-top.png) | [After](after/dark-image-1366x768-top.png) |
| Dark Video 1366×768 | [Before](before/dark-video-1366x768-top.png) | [After](after/dark-video-1366x768-top.png) |

| Desktop review viewport | Before Image document | Before Video document | After Image / Video document | After sidebar bottom |
| --- | ---: | ---: | ---: | ---: |
| 1366×768 | 1502 px | 1308 px | 768 px | 768 px |
| 1440×900 | 1514 px | 1376 px | 900 px | 900 px |
| 1920×1080 | 1514 px | 1376 px | 1080 px | 1080 px |

Standard Image and Video screenshots also include controls-half and controls-bottom for every desktop size. Their result and Generate rectangles remain unchanged. Representative sequences:

- Image 1366×768: [before half](before/light-image-1366x768-controls-half.png), [before bottom](before/light-image-1366x768-controls-bottom.png), [after half](after/light-image-1366x768-controls-half.png), [after bottom](after/light-image-1366x768-controls-bottom.png).
- Long Video 1366×768: [top](after/light-long-video-1366x768-top.png), [half](after/light-long-video-1366x768-half.png), [bottom](after/light-long-video-1366x768-bottom.png). The fixture includes First frame, Last frame, Prompt, Model, Aspect ratio, Duration, Resolution and Audio. Audio is explicitly layout-only sample data and never enters the provider catalog.
- Long Assets 1366×768: [top](after/light-long-assets-1366x768-top.png), [bottom](after/light-long-assets-1366x768-bottom.png). Thirty local sample jobs prove content scroll without moving the sidebar or shell.
- Mobile/tablet Video: [768×1024](after/light-video-768x1024-top.png), [390×844](after/light-video-390x844-top.png), [320×900](after/light-video-320x900-top.png); [390 bottom](after/light-video-390x844-document-bottom.png) retains natural document scrolling.

The [capture script](../../scripts/capture-layout-polish.cjs) produces 48 before and 66 after screenshots: both themes and all six requested dimensions, desktop top/document-bottom/control-half/control-bottom, long Video and Assets, forced colors and browser-zoom-equivalent reflow.

## Accessibility and verification

[Geometry tests](../../e2e/fixed-workspace.spec.ts) assert actual rectangles and scroll heights on the compiled production build. They exercise authenticated Image/Video fixtures with eight recent cards at all three desktop sizes, complete sidebar/utilities, Generate visibility, stationary result during control scroll, mouse wheel, Tab to Audio, PageDown/PageUp, keyboard focus to the last of 30 Assets, mobile/tablet flow and axe audits of long Video and Assets.

200% checks use two explicitly separate methods:

- Whole-interface browser-zoom layout equivalent: 384×512 CSS px with device scale factor 2 corresponds to a 768×1024 physical viewport at 200%. The test operates Prompt and Audio, reaches Generate, and checks horizontal overflow. It does not claim to automate a browser's zoom menu.
- Actual text pressure at 1366×768: [script](../../scripts/check-layout-text-scale.cjs) doubles precomputed font sizes on all 194 currently rendered HTML elements without CSS zoom. Audio remains fully inside its 99 px input scroller; Generate remains inside the viewport; selection works and the document stays 1366×768. [Geometry/method](doubled-computed-text.json), [screenshot](doubled-computed-text-1366x768.png). Newly mounted popup content retains normal type size; whole-interface reflow is covered separately above.

The same text-pressure script checks **Failed** and **Queued** result states: the first heading remains reachable at scroll offset zero, and internal scrolling exposes the final paragraph. [Failed top](doubled-computed-text-failed-1366x768-top.png) / [bottom](doubled-computed-text-failed-1366x768-bottom.png), [Queued top](doubled-computed-text-queued-1366x768-top.png) / [bottom](doubled-computed-text-queued-1366x768-bottom.png).

Final validation uses the compiled frontend and intercepted HTTP fixtures. Engine reports and adjacent text logs: [Chrome](browser-chromium.json), [Firefox](browser-firefox.json), [WebKit](browser-webkit.json). The existing behavior suite retains auth privacy/logout, catalog availability, quote expiry/invalidation, submission recovery, downloads/references, model transitions, drawer/dialog focus, themes, select menus and touch coverage. Unexpected requests are blocked; the tests do not spend credits or homologate providers.

All **58/58 tests pass in each engine** (174 successful cases), with zero failed, skipped or flaky tests. The 47 existing cases are retained and 11 geometry/accessibility cases added. Final captures record zero desktop document overflow, horizontal overflow, broken images, page errors or attempted API/external requests. Full engine suites and captures were refreshed against the final compiled source after the focus and safe-centering fixes.

- [Unit tests](unit-tests.log): 39 passed.
- [TypeScript](typecheck.log): passed, empty log on success.
- [Lint](lint.log): zero errors, five unchanged legacy image warnings.
- [Production build](build-after.log): passed.

## Bundle comparison

Same public staging settings, Next 15.5.27 and build command. Rounded build-reported First Load JS estimates; not runtime transfer measurements. No package or lockfile changes in this polish pass.

| Route | PR #89 before polish | Fixed workspace | Delta |
| --- | ---: | ---: | ---: |
| Public landing `/` | 114 kB | 114 kB | 0 kB |
| `/create/[kind]` | 163 kB | 163 kB | 0 kB |
| `/library` | 155 kB | 155 kB | 0 kB |
| `/profile` | 149 kB | 149 kB | 0 kB |
| Sample `/design-review` | 185 kB | 186 kB | +1 kB |
| Shared by all routes | 103 kB | 103 kB | 0 kB |

Sources: [before build](build-before.log), [after build](build-after.log). Picker/detail conditional loading remains intact.

## Founder review

Use the [branch Preview design review](https://imagino-front-git-feat-imagino-crea-9cdb36-danitest45s-projects.vercel.app/design-review). State **Long video form** selects Video; **Long asset list** selects Assets. On desktop, scroll the controls and observe Generate, result and sidebar remain in place. Resize to the six documented viewports, then use Appearance for Light/Dark/System.

The exact final Preview identity and status are recorded in PR #89. Existing Preview SSO and backend origin restrictions are preserved; local compiled UI results are distinct from authenticated remote API verification. No Render, R2, Stripe, CORS, OAuth or production settings changed. The PR remains a draft and is not merged.

Creative Hub fixed-workspace layout ready for founder review.
