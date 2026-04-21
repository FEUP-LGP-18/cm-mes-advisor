# Phase 1 Roadmap And Status

Last updated: `2026-04-21`

This file is the current roadmap/status view for Phase 1. It replaces the older epic-by-epic build diary as the main planning reference for the repo.

## Summary

Phase 1 should be understood as a consultant-reviewed, Excel-first workflow that ends with a separate Markdown demo handoff. The product direction in the repo is now project-based and route-based, with local prototype persistence and a server-backed generation boundary.

## Effectively Present In The Repo

- Project home for creating or reopening local Phase 1 projects
- Routed Phase 1 flow:
  - `source`
  - `generate`
  - `review`
  - `script`
  - `export`
- Parsing for the `Requirements` sheet with row 2 headers and Excel row traceability
- Customer X committed fixture plus workbook upload support
- Consultant review actions and local persistence
- Server route for requirement generation
- Mock mode as the default teammate-safe path
- Real generation path behind the server provider boundary
- Demo script assembly and Markdown export

## Current Direction

The next meaningful work should stay aligned with this product shape:

- harden the routed project workflow instead of re-expanding into one oversized page
- keep the review workspace as the core Phase 1 artifact surface
- keep setup and onboarding docs aligned with the current project-first model, with the root `start.sh` script as the preferred full-stack local startup entrypoint
- improve real-mode confidence only after the partner access blocker is resolved
- preserve honest scope language so Phase 1 feels complete without forcing Phase 2

## External Blockers

The main external blocker is still partner-side access for live Bedrock-backed generation.

What that means:

- mock mode remains the reliable default for onboarding and local demos
- real mode exists in code, but should not be described as fully validated
- prompt tuning is secondary until real access succeeds

Reference:

- [docs/discovery/phase-1-real-mode-validation-2026-04-20.md](discovery/phase-1-real-mode-validation-2026-04-20.md)

## Explicitly Deferred Future Work

These are not part of current Phase 1 completion unless the task explicitly changes scope:

- Phase 2 Master Data generation
- direct LibreChat product shell
- broader heterogeneous document ingestion
- alternative export formats such as PDF or Word
- production-grade backend persistence replacing the current local prototype storage
- authentication, team collaboration, or settings/template systems beyond what the repo already contains

## Delivery Rule

When the product behavior, setup story, or scope boundaries change, update the canonical docs in the same change:

- `README.md`
- `AGENTS.md`
- `docs/discovery/project-context.md`
- this file

## Supporting Notes

Use these to guide specific workstreams:

- [docs/discovery/phase-1-demo-readiness.md](discovery/phase-1-demo-readiness.md)
- [docs/discovery/ui-ux-decisions.md](discovery/ui-ux-decisions.md)
- [docs/design/phase1-ui-audit-2026-04-21.md](design/phase1-ui-audit-2026-04-21.md)
- [docs/discovery/rui-answers-2026-04-14.md](discovery/rui-answers-2026-04-14.md)
