# Creative Hub UI stack audit

Audit completed before implementing the Creative Hub shell. Base: the approved Working Studio branch at `46c64a646dd1504369ef917c8075ea80e45b432c`. Validation results and the fetched branch record are included in the delivery report.

## Official stack

| Responsibility | Decision | Rationale |
| --- | --- | --- |
| Styling | Tailwind 4 and Working Studio semantic tokens in `src/app/globals.css` | Existing off-white, charcoal, teal, typography, contrast, forced-colors and reduced-motion behavior remain the visual foundation. Component CSS is scoped to Imagino classes. |
| Accessible interaction | Radix UI | Existing Select and DropdownMenu already use Radix. Add only Dialog for shared focus containment, nested dismissable layers, modal drawer, Escape and focus restoration. |
| Icons | Lucide | Already installed; use the same icon family with visible navigation labels. |
| Theme | next-themes with the existing bootstrap/preferences | Preserve System/Light/Dark and persistence. No competing theme state. |
| Visual components | Imagino components under `src/components/ui` | Radix supplies interaction; existing Imagino tokens and component classes supply appearance. No complete design-system dependency. |

## Inventory before changes

| Element | Existing implementation | Consolidation decision |
| --- | --- | --- |
| Button | `ui/StudioUI.tsx` exports Button; generation/account/landing links share `ui-button`; legacy routes contain inline Tailwind buttons | Keep the shared primitive and semantic variants. Do not migrate dormant legacy screens in this pass. |
| IconButton | `ui/StudioUI.tsx`; separate `studio-icon-button`, zoom and remove-reference buttons | Keep the accessible named shared primitive; specialized controls retain their purposeful labels/classes. |
| Input | `ui/StudioUI.tsx`, `account/AuthFields.tsx`, schema field consumers | Keep Input as the base; consumers own labels, validation and schema conversions. |
| Textarea | `ui/StudioUI.tsx`; prompt uses shared control styling with generation-specific sizing | Keep one base with contextual sizing. |
| Select | `ui/Select.tsx`, Radix Select; empty-string-safe value mapping; schema-driven consumers | Retain for ordinary schema settings and real asset filters. Model selection needs its own richer presentation. |
| Dropdown | `Appearance.tsx`, Radix DropdownMenu radio group | Preserve System/Light/Dark behavior; let it inherit the shared modal portal host. |
| Dialog | Native modal implementation in `ui/StudioUI.tsx` and another in `generation/StudioDialog.tsx` | Replace duplicated focus/scroll/Escape code with `ui/Dialog.tsx`, backed by Radix. Preserve wrapper APIs for consumers. |
| Tabs | Account uses real buttons with `aria-pressed`; create intent uses a segmented button group; review screen controls are ordinary state buttons | Navigation destinations remain links. Do not assign tab roles without the corresponding tab keyboard behavior. |
| Tooltip | `ui/StudioUI.tsx`, CSS hover/focus description used in review | Keep this small informational helper; essential information must remain visible and labeled without relying on hover. |
| Toast | `lib/toast.tsx` event listeners and `role=status`; mounted once in Providers | Keep the current event API and semantic token appearance. No new toast suite. |
| Badges | `StudioUI.StatusBadge`; `GenerationPresentation.JobStatus`; studio availability/credit/sample classes | Retain state-specific rendering and semantic status tokens. Model capabilities use the same visual vocabulary. |
| Segmented controls | `studio-intent`, review controls, account section buttons | Retain button semantics; Image/Video route navigation is shared, clearly labeled links. |
| Cards | `GenerationPresentation.AssetCard`, result, account summary, legacy `ImageCard` | Reuse the generation card for recent jobs/Assets; keep capability checks at the action boundary. |
| Navigation | Global Navbar mixes marketing/product links; legacy image Sidebar/MobileModelNav; no product sidebar | Keep public marketing navigation. New `shell/AppShell` owns Image, Video, Assets and utilities on product routes only. |
| Loading/skeleton | `StudioUI.Skeleton`, `Button.loading`, generation loading/processing states | Preserve actual lifecycle messages; never fabricate progress percentages. |
| Model picker | Native StudioDialog with a flat button list in GenerationWorkspace; ordinary settings already use Radix Select | Replace the flat model list with a catalog-driven rich picker; keep normal settings Select. |
| Empty states | `StudioUI.EmptyState`; richer studio canvas and generation library empty surfaces | Retain the purposeful studio/library empty states; one generic primitive remains for simpler consumers. |

## Duplication and legacy boundaries

- The two modern modal implementations had different scroll-lock/focus restoration and outside-click behavior. Consolidating these is the accessibility-critical duplication to resolve before adding another drawer or picker.
- `OverlayHost` exists to keep nested select/dropdown portals in the active modal. It remains the shared boundary after moving from native dialogs to Radix Dialog.
- Modal content scrolls inside a separate surface so nested fixed popups stay visible within the focus boundary in WebKit. Appearance defers touch opening until release/click, avoiding synthesized-click focus dismissal; mouse and keyboard retain Radix behavior.
- Shared `ui-button`/`ui-icon-button` and specialized studio classes overlap visually. New controls use the shared primitives; existing domain-specific controls are retained when their layout is useful.
- `ImageCardModal`, `PromptConfigModal`, `OutOfCreditsDialog`, and `UpgradePlanDialog` contain the previous dark/purple inline styling and bespoke overlays. They belong to legacy generation/profile flows; this pass neither extends them nor changes their contracts. `RouteSurface` continues to isolate legacy routes.
- `/images`, `/videos`, and `/google-auth` keep their compatibility surfaces. No dormant provider or payment behavior is migrated into the Creative Hub.
- Model descriptions, grouping and capability descriptors belong to catalog metadata or a central catalog presentation adapter, not permanent provider-specific JSX branches.

## Dependency decision

The approved base already includes `@radix-ui/react-select`, `@radix-ui/react-dropdown-menu`, Lucide, next-themes and Tailwind 4. The only new UI dependency is `@radix-ui/react-dialog@1.2.0`: existing Select/DropdownMenu cannot cleanly provide modal dialog/drawer focus management, and keeping two bespoke modal behaviors would multiply risk. It belongs to the existing official primitive family and adds one package because its dependencies are already shared. Root validation records before/after First Load JS. No Material UI, Ant Design, Chakra, Mantine, theme suite, icon suite or default shadcn styling is introduced.

## Implementation boundaries

The app shell is route-scoped to `/create/*`, `/library` and `/profile`, plus explicitly marked sample usage in `/design-review`. The shell consumes existing auth/logout and credit APIs, ignores stale balances after a session change, and never requests credits in sample mode. `/library` remains the compatible URL, labeled Assets. Future Canvas/actions may be added through typed navigation/action metadata when implemented; they are absent from navigation today. Landing identity and the approved theme remain unchanged.
