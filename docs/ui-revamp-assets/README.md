# UI Revamp Assets

This folder stores curated visual evidence for the MES Advisor UI Revamp. The
target screenshots and logo files come from the design package provided for the
revamp and are canonical until a Figma URL or replacement design source is
available.

Implementation guidance for the shared foundation lives in
[`../ui-revamp-foundation.md`](../ui-revamp-foundation.md).

Do not copy raw ZIPs, secrets, `.env` files, partner source documents, generated
exports, or private working files into this folder. App source should consume
stable assets from `public/brand/`, not from `docs/ui-revamp-assets/`.

## Structure

- `target/phase1/`: canonical Phase 1 route and state screenshots.
- `target/phase2/`: canonical optional Phase 2 continuation screenshots.
- `target/settings/`: canonical settings screenshots.
- `target/logos/`: design-package logo reference files.
- `current/`: captured current-app evidence from the prior UI audit worktree.

The raw visual package is intentionally not committed here. The visual
documentation PDF was also not copied in this slice because the curated PNG and
logo evidence is enough for implementation planning.

## Target Route And State Mapping

- `/login`: `target/phase1/login-page.png`
- `/`: `target/phase1/dashboard-empty.png`,
  `target/phase1/dashboard-populated.png`
- New project dialog: `target/phase1/new-project.png`
- `/projects/[projectId]/source`: `target/phase1/upload-no-file.png`,
  `target/phase1/upload-requirements.png`
- `/projects/[projectId]/generate`: `target/phase1/ai-processing.png`,
  `target/phase1/ai-processing-complete.png`
- `/projects/[projectId]/review`: `target/phase1/requirements-review.png`,
  `target/phase1/requirements-review-rows-checked.png`,
  `target/phase1/requirements-review-row-selected.png`,
  `target/phase1/requirements-review-no-results.png`
- `/projects/[projectId]/script`: `target/phase1/script-output.png`
- Settings routes: `target/settings/general.png`,
  `target/settings/ai-configuration.png`, `target/settings/about.png`,
  `target/settings/industry-templates.png`
- Optional Phase 2 continuation: `target/phase2/screen-1.png` through
  `target/phase2/screen-7.png`

## Current Evidence Status

The `current/` folder contains existing screenshots copied from the prior
evidence worktree. They are useful for comparison, but they are not a substitute
for fresh browser verification after UI source changes.

Current evidence includes auth, Phase 1, Phase 2, settings, mobile, and reference
failure screenshots for the known generate-to-review and process-to-review-ready
flow blockers.

Fresh Slice B verification screenshots live in `current/slice-b/` and cover
desktop and mobile states for login, dashboard/home, Phase 1 source shell, and
global settings.

Slice C adds shared implementation primitives under `src/components/ui/fv/`.
Those components may reference stable `fv-*` classes and public brand assets,
but they must not import screenshots, target evidence, or files from this docs
folder.

## Stable Public Brand Assets

Future app implementation should reference these stable public paths:

- `public/brand/mes-logo-full.svg`
- `public/brand/mes-logo-full-white.png`
- `public/brand/mes-logo-full-black.png`

The copies under `target/logos/` are retained as design evidence only.
