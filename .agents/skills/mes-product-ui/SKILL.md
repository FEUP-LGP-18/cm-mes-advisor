---
name: mes-product-ui
description: Use when editing consultant-facing screens in the MES Demo Advisor, especially review workspaces, dashboards, upload/setup flows, export flows, or onboarding and empty states. Trigger for user-facing UI work that should feel like a credible product workspace with review-first workflow, utility copy, clear table-detail or progress-rail structure, honest Phase 1 and Phase 2 scope, and no fake executive-dashboard visuals. Do not use for backend-only tasks or generic marketing pages detached from this product.
---

# MES Product UI

Use this skill for the product surfaces in this repository.

## Product Truth

- The primary users are implementation consultants and pre-sales engineers.
- The workflow is project-based, review-first, and export-oriented.
- Phase 1 must feel complete on its own.
- Phase 2 is optional continuation work, not the main completion path.

## Default Layout Patterns

- `dashboard`: project list plus filtering, stage/status context, useful summary only
- `setup/upload`: progress rail or guided step layout with explicit validation and next-step confidence
- `review workspace`: table-detail, queue-detail, or editor-detail layout with actions close to the artifact being reviewed
- `script/export`: document-oriented editing surface with readiness and traceability visible before export
- `empty state`: orientation plus the first useful action, no decorative filler

## Hard Rules

- Treat this as product UI, not a fake analytics showcase.
- Prefer utility copy over marketing or aspirational language.
- Keep traceability, review status, and approval state visible where decisions are made.
- Do not imply support for broader input types or future workflow stages that are not confirmed in scope.
- Do not visually pressure users into Phase 2 when Phase 1 is the current success path.

## Visual Rules

- Use restrained emphasis and a consistent shell.
- Prefer strong hierarchy and scanning over ornamental styling.
- Use cards only when they are the interaction unit.
- Avoid executive KPI tiles, ornamental metric banners, and decorative dashboard patterns.

## Screen-Specific Notes

- On review screens, the work artifact must dominate over decoration.
- On upload screens, trust comes from clarity, status, and constraint communication.
- On export screens, readiness and consequences matter more than spectacle.

## Completion Rule

For material UI changes, combine this skill with browser-based verification before signoff.
