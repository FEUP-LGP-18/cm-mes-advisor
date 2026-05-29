# UI Revamp Foundation

Issue #57 owns the shared visual foundation for the MES Advisor UI Revamp.
Individual route redesigns should build on this foundation instead of adding a
parallel style system.

## Canonical Assets

- Design evidence lives under `docs/ui-revamp-assets/`.
- App source must consume logo assets only from `public/brand/`.
- Current stable app logo paths are:
  - `/brand/mes-logo-full.svg`
  - `/brand/mes-logo-full-white.png`
  - `/brand/mes-logo-full-black.png`

Do not import screenshots or design evidence from `docs/ui-revamp-assets/` into
application code.

## Foundation Classes

- `fv-shell`, `fv-topbar`, `fv-body`, `fv-sidebar`, and `fv-content` define the
  authenticated product shell.
- `fv-auth-bg`, `fv-auth-card`, and `fv-auth-*` field classes define the auth
  shell.
- `fv-card`, `fv-table`, `fv-btn-*`, `fv-badge-*`, `fv-dropzone`,
  `fv-detail-*`, `fv-modal-*`, and `fv-empty` are the shared route primitives
  for this revamp.

Use these before adding route-local CSS. If a new pattern repeats across
screens, promote it into the shared foundation layer with a small, named class.

## Token Boundaries

Canonical token values live in `src/app/theme-tokens.css`. The foundation keeps
dark navy product chrome, a light operational workspace canvas, white panels,
subtle borders, restrained blue primary actions, and semantic status colors.

Typography remains `Instrument Sans` for product UI and `IBM Plex Mono` for
metadata/traceability. That is supported by the current repo docs and source;
do not change fonts based on PDF metadata alone.

## Scope Guardrails

- Phase 1 remains complete on its own: source, generate, review, script, export.
- Phase 2 remains optional continuation work under `master-data/*`.
- Shell/token changes must not alter workflow routing, generation, review,
  export, API, server configuration, or settings behavior contracts.
- Legacy `theme-shell-*`, `theme-doc-*`, `premium-*`, and `phase-*` classes still
  exist for routes that have not been migrated yet. Contain their use on new
  foundation work rather than deleting them blindly.

## Shared Primitives For Implementation Issues

The shared primitive layer lives in `src/components/ui/fv/`. These components
are intentionally small presentational wrappers around the canonical `fv-*`
classes. They should help teammates compose route work consistently without
creating another design system or pulling workflow state into UI primitives.

## Settings Behavior Contracts

Issue #59 behavior contracts live in `src/lib/settings/` and are documented in
`docs/ui-revamp-settings-contracts.md`. Route redesigns should consume those
contracts instead of inventing local settings shapes. Keep provider secrets,
raw model IDs, prompts, export counters, and fake About metrics out of client UI
work.

Use `FvPageHeader` for route titles, breadcrumbs/eyebrows, descriptions, and
top-right actions. It maps to the dashboard, upload, generate, review, script,
settings, and Phase 2 page headers shown in the target screenshots. Do not add
route-local header spacing unless the route has a documented layout exception.

Use `FvStatCard` for compact operational counts and progress metrics. Target
evidence: `docs/ui-revamp-assets/target/phase1/dashboard-populated.png`,
`docs/ui-revamp-assets/target/phase1/ai-processing.png`, and
`docs/ui-revamp-assets/target/phase1/requirements-review.png`. Do not turn these
into executive dashboard KPI tiles.

Use `FvBadge` for statuses, confidence labels, stages, and compact metadata.
Use the existing tone set only: `neutral`, `info`, `success`, `warning`,
`error`, and `accent`. Do not invent new badge colors in route components.

Use `FvTable` for dense operational tables. It is a simple table wrapper, not a
data-grid abstraction. Target evidence:
`docs/ui-revamp-assets/target/phase1/dashboard-populated.png` and
`docs/ui-revamp-assets/target/phase1/requirements-review.png`. Do not build
one-off table chrome in every screen.

Use `FvToolbar` for search, filters, count text, and action groups above tables
or review queues. It should wrap on mobile and keep the current task visible.
Do not duplicate search/filter spacing in route-local inline styles.

Use `FvEmptyState` for no projects, no rows, no results, unavailable states, and
review queues with no current item. Pair it with one useful action when there is
a safe next step. Do not use decorative filler.

Use `FvDropzone` for upload surfaces only. It is presentational and must not
own file parsing, permissions, project state, or upload behavior. Target
evidence: `docs/ui-revamp-assets/target/phase1/upload-no-file.png`.

Use `FvProgressPanel` for generation, processing, validation, and export-status
progress displays. It owns layout for meters, stage rows, logs, and stats slots,
but not generation logic. Target evidence:
`docs/ui-revamp-assets/target/phase1/ai-processing.png`.

Use `FvInspectorPanel` for right-side or stacked detail panels: selected
requirement detail, settings summary, export readiness, and Phase 2 object
inspection. Target evidence:
`docs/ui-revamp-assets/target/phase1/requirements-review-row-selected.png` and
the settings targets. Do not hide the main work artifact behind inspector chrome.

Use `FvCallout` for inline status, guidance, warnings, and recoverable errors.
Only use `aria-live` when content changes after render. Do not use callouts to
repeat the page title or restate obvious instructions.

### Teammate Mapping

- Engineer A / #61 and #62: `FvPageHeader`, `FvStatCard`, `FvTable`,
  `FvToolbar`, `FvEmptyState`.
- Engineer B / #63 and #64: `FvDropzone`, `FvProgressPanel`, `FvCallout`,
  `FvStatCard`.
- Engineer C / #65 and #66: `FvPageHeader`, `FvStatCard`,
  `FvInspectorPanel`, `FvCallout`, `FvToolbar`.
- Engineer D / #67 and #68: `FvProgressPanel`, `FvInspectorPanel`, `FvTable`,
  `FvEmptyState`, `FvCallout`.

### Do-Not Rules

- Do not invent new color tokens in route components.
- Do not build one-off table CSS in every screen.
- Do not use `docs/ui-revamp-assets/` paths from app source.
- Do not change workflow gates from visual implementation issues.
- Do not move secrets, provider configuration, or generation settings into the
  client.
- Do not imply Phase 2 is required to complete Phase 1.
- Phase 1 standalone and Phase 2 optional remain non-negotiable.
