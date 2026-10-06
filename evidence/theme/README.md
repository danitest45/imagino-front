# Theme and controls evidence

Local compiled build, deterministic review fixtures and intercepted HTTP. The final run is recorded in `browser-*.json`, `browser-*.log` and `chromium/visual-results.json`. Screenshots contain no customer session or private media. This pass does not claim remote auth or download validation.

## Equivalent surfaces

| Surface | Light | Dark |
| --- | --- | --- |
| Landing, notebook | [Light](chromium/light-landing-1366.png) | [Dark](chromium/dark-landing-1366.png) |
| Create result, notebook | [Light](chromium/light-create-result-1366.png) | [Dark](chromium/dark-create-result-1366.png) |
| Library, notebook | [Light](chromium/light-library-1366.png) | [Dark](chromium/dark-library-1366.png) |
| Create empty | [Light](chromium/light-create-empty-1366.png) | [Dark](chromium/dark-create-empty-1366.png) |
| Create reference | [Light](chromium/light-create-reference-1366.png) | [Dark](chromium/dark-create-reference-1366.png) |
| Login | [Light](chromium/light-login-1366.png) | [Dark](chromium/dark-login-1366.png) |
| Account sample | [Light](chromium/light-account-1366.png) | [Dark](chromium/dark-account-1366.png) |
| Costs | [Light](chromium/light-costs-1366.png) | [Dark](chromium/dark-costs-1366.png) |
| Components closed | [Light](chromium/light-components-1366.png) | [Dark](chromium/dark-components-1366.png) |
| Appearance open | [Light](chromium/light-appearance-open-1366.png) | [Dark](chromium/dark-appearance-open-1366.png) |
| Select open | [Light](chromium/light-select-open-1366.png) | [Dark](chromium/dark-select-open-1366.png) |
| Select, long options | [Light](chromium/light-select-long-1366.png) | [Dark](chromium/dark-select-long-1366.png) |
| Select in native modal | [Light](chromium/light-select-dialog-1366.png) | [Dark](chromium/dark-select-dialog-1366.png) |
| Model picker modal | [Light](chromium/light-model-picker-1366.png) | [Dark](chromium/dark-model-picker-1366.png) |
| Model picker, 320px | [Light](chromium/light-model-picker-320.png) | [Dark](chromium/dark-model-picker-320.png) |
| Appearance, 320px | [Light](chromium/light-appearance-open-320.png) | [Dark](chromium/dark-appearance-open-320.png) |
| Select, 320px | [Light](chromium/light-select-open-320.png) | [Dark](chromium/dark-select-open-320.png) |
| Long options, 320px | [Light](chromium/light-select-long-320.png) | [Dark](chromium/dark-select-long-320.png) |
| Modal Select, 320px | [Light](chromium/light-select-dialog-320.png) | [Dark](chromium/dark-select-dialog-320.png) |
| Library filter open | [Light](chromium/light-library-filter-open.png) | [Dark](chromium/dark-library-filter-open.png) |
| Library detail | [Light](chromium/light-library-detail.png) | [Dark](chromium/dark-library-detail.png) |
| Tooltip | [Light](chromium/light-tooltip.png) | [Dark](chromium/dark-tooltip.png) |
| Toast | [Light](chromium/light-toast.png) | [Dark](chromium/dark-toast.png) |
| Forced colors | [Light preference](chromium/light-forced-colors-select.png) | [Dark preference](chromium/dark-forced-colors-select.png) |
| Forced colors, Appearance | [Light preference](chromium/light-forced-colors-appearance.png) | [Dark preference](chromium/dark-forced-colors-appearance.png) |
| 200% text, Create | [Light](chromium/light-create-text-200.png) | [Dark](chromium/dark-create-text-200.png) |

The same directory includes landing/Create/Library at 1920×1080, 1366×768, 768×1024, 390×844 and 320×900, plus loading, unavailable, no balance, queued, processing, failed, error, reduced-motion and legacy-shell states. Not every screenshot runs axe: per-state audit coverage is explicit in the JSON.

See [manual review](manual-review.md), [measured contrast](../theme-css/contrast.json), [design system](../../DESIGN_SYSTEM.md) and [validation](../../REBRAND_VALIDATION.md).
