# Project Context

Last updated: `2026-05-10`

This is the current-state source of truth for the GitHub repo. Use this before relying on older discovery notes.

## Product Summary

- Product: Critical Manufacturing MES Demo Advisor
- Current repo scope: Phase 1 plus optional Phase 2 continuation
- Primary users: Critical Manufacturing consultants and pre-sales engineers
- Input: customer requirements Excel workbook
- Output: consultant-reviewed requirement comments, demo guidance, a separate Markdown demo document, and an optional Master Data package continuation

The current product direction is a project-based, route-based workflow. A user starts from project home, opens a project, then moves through:

1. `source`
2. `generate`
3. `review`
4. `script`
5. `export`

Optional continuation after export:

6. `master-data/setup`
7. `master-data/process`
8. `master-data/review`
9. `master-data/export`
10. `master-data/traceability`

## Scope Boundaries

In scope now:

- Excel-first requirements ingestion
- `Requirements` sheet parsing with source-row traceability
- local project persistence for prototype review flows
- mock generation as the default experience
- server-side generation boundary for mock and real mode
- consultant review before final output
- Markdown export for the Phase 1 handoff
- Supabase Auth (email/password) with full auth flows and route protection

Out of scope unless explicitly requested:

- direct LibreChat product UI
- broad unstructured document ingestion
- client-side exposure of partner or cloud credentials
- treating historical discovery notes as the primary onboarding layer

## Current Architecture

- App framework: Next.js App Router
- Auth: Supabase Auth (`@supabase/ssr`); email/password only; PKCE callback flow
- Auth pages: `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/callback`
- Route protection: `src/proxy.ts` via the Next.js 16 `proxy` export; gracefully skips when `NEXT_PUBLIC_SUPABASE_URL` is unset (local mock mode stays functional)
- Supabase helpers: `src/lib/supabase/` — `client.ts` (browser), `server.ts` (server components / route handlers), `middleware.ts` (session refresh)
- Home screen: project home that creates or reopens local Phase 1 projects
- Routed workflow: `src/app/projects/[projectId]/`
- Project state: local registry and workflow snapshot helpers in `src/lib/phase1/`
- Persistent source uploads: DB-backed approach using `project_files` for workbook metadata and `project_phase_states` with `phase_key = 'source'` for the parsed Source workspace. The `project_files.storage_path` value is a durable logical reference in the form `db-backed://projects/<projectId>/source/<upload>-<checksum>.xlsx`; raw workbook bytes are not stored in the repo or database in this mode.
- Requirements domain: parsing, review, generation, validation, and export in `src/lib/requirements/`
- Generation boundary: `src/app/api/requirements/generate/route.ts`
- Default fixture: `fixtures/customer-x-functional-requirements.xlsx`
- Phase 2 template fixture: `fixtures/master-data-sample.xlsx`

Important implementation truths:

- the project, not the raw workbook screen, is the current top-level UX object
- workbook upload exists alongside the committed sample workbook
- export is Markdown for Phase 1 and a workbook-centered ZIP package for Phase 2
- mock mode is the safe default path for teammates
- real mode depends on server-side environment config and partner access

## Current Status

What is effectively present in the repo:

- project home and per-project workflow routes
- fixture-backed and upload-backed source handling
- consultant review and local persistence
- server-backed generation route with `mock` and `real` modes
- demo script assembly and Markdown download
- Supabase Auth flows: login, signup, forgot/reset password, PKCE callback, logout
- proxy-based route protection for all non-auth surfaces (`src/proxy.ts`)

What is still blocked:

- manual MES-side validation of the generated Phase 2 package format

Reference:

- [phase-1-real-mode-validation-2026-04-20.md](phase-1-real-mode-validation-2026-04-20.md)

## Repo Truths Before Coding

- Open `http://localhost:3000/docs` after startup for the searchable codebase onboarding guide.
- Read `README.md` for setup and doc map.
- Use the root `start.sh` script as the preferred local startup path; it always starts the full local stack and safely restarts the known local services before launching the app.
- Read `AGENTS.md` for coding and scope guardrails.
- Use `.nvmrc` and `package.json` as the source of truth for local runtime and commands.
- Use `.env.example` only for placeholder names and safe example values.
- Do not present Phase 2 as mandatory for a successful Phase 1 workflow.
- Do not claim the generated Phase 2 package is MES-validated until the manual import pass is complete.

## Supporting Sources And History

Use these as supporting documents, not as the primary onboarding layer:

- [rui-scope-message.md](rui-scope-message.md): partner scope statement
- [rui-answers-2026-04-14.md](rui-answers-2026-04-14.md): partner guidance on ambiguity, demo specificity, and Phase 2 simplification
- [ui-ux-decisions.md](ui-ux-decisions.md): product flow and UX notes from the review material
- [phase-1-demo-readiness.md](phase-1-demo-readiness.md): operator shortlist for the Phase 1 demo path
- [phase-1-librechat-fallback.md](phase-1-librechat-fallback.md): fallback runbook if the approved short-term path uses LibreChat support
- [teams-client-thread-summary.md](teams-client-thread-summary.md): timeline and partner context
- [librechat-mcp-notes.md](librechat-mcp-notes.md): safe notes on the local partner support package

Older discovery and epic-history-heavy material may still be useful for background, but this file is the current repo-level summary that new teammates and agents should trust first.
