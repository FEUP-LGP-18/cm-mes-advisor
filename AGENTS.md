<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# AI Agent Instructions

Start with these files in order:

- `README.md`
- `docs/discovery/project-context.md`
- `docs/phase-1-epic-plan.md`
- `docs/discovery/rui-answers-2026-04-14.md`
- `docs/discovery/ui-ux-decisions.md`

For frontend or user-facing workflow changes, also read:

- `docs/design/agent-ui-canon.md`
- `docs/design/phase1-ui-audit-2026-04-21.md`

## Product Truth

Treat the current product as a project-based, routed Phase 1 workspace:

- home creates or reopens local projects
- each project follows `source -> generate -> review -> script -> export`
- the committed fixture is only the default starting point, not the whole product
- consultant review is required before Phase 1 output is final

Keep the MVP Excel-first. Phase 1 starts from a customer requirements Excel file, supports human review, generates requirement-level MES comments, generates demo guidance, and exports a separate Markdown demo document.

Do not implement Phase 2 Master Data generation unless the user explicitly requests it. Do not build the product directly on top of LibreChat; treat LibreChat/MCP notes as context and support material only.

Keep AI credentials, Bedrock access, MCP access, MES credentials, and all partner secrets server-side only. Never expose them in browser code, logs, Markdown, exported documents, fixtures, or commits.

Real-mode generation exists, but external partner credential access is still the live blocker. Do not describe it as fully validated unless the repo and validation notes change.

Preserve human-in-the-loop review for generated comments and demo guidance.

## Repo Orientation

- `src/app/projects/[projectId]/` contains the routed Phase 1 steps.
- `src/components/phase1/` contains the project shell and step orchestration.
- `src/lib/phase1/` contains project registry and workflow helpers.
- `src/lib/requirements/` contains parsing, review state, generation, export, and server integration boundaries.
- `/api/requirements/generate` is the server generation route boundary.

## Documentation Maintenance

If you change product behavior, workflow, setup, scope boundaries, or teammate onboarding, update the canonical docs in the same PR when relevant:

- `README.md`
- `AGENTS.md`
- `docs/discovery/project-context.md`
- `docs/phase-1-epic-plan.md`

For local startup, prefer the root `../start.sh` entrypoint before falling back to manual `pnpm` or Docker commands. It is the canonical teammate and agent startup path for this workspace.

## Frontend Done Criteria

- Treat this as a consultant-facing product UI, not a marketing site or fake executive dashboard.
- For UI changes, classify the surface first: `product workspace`, `wizard/form`, `settings/admin`, `landing/marketing`, or `empty/onboarding`.
- Product surfaces must use utility copy, clear status/action hierarchy, and restrained visual treatment.
- Prefer table-detail, queue-detail, editor-detail, or progress-rail layouts over dashboard-card mosaics.
- Phase 1 must feel complete without forcing Phase 2 as the next required step.
- Do not imply broader document ingestion or Phase 2 capability beyond the confirmed MVP scope.
- Before calling material UI work done, verify desktop and mobile states and check relevant empty, loading, error, and overflow states.

Before finalizing changes, run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
