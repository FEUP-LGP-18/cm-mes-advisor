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
