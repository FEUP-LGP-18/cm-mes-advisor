# Critical Manufacturing MES Demo Advisor

Consultant-facing MES workspace for turning customer requirements Excel workbooks into reviewable demo outputs. The current completion bar is pilot-ready: Phase 1 remains the main consultant workflow, and Phase 2 is required for the pilot demo path after approved Phase 1 rows exist.

The current product direction is project-based and route-based. Phase 1 is the primary consultant handoff:

- `source`
- `generate`
- `review`
- `script`
- `export`

The required pilot Phase 2 demo continuation lives under:

- `master-data/setup`
- `master-data/process`
- `master-data/review`
- `master-data/export`
- `master-data/traceability`

Mock generation is the default so teammates can run the app locally without partner credentials. Real grounded generation is implemented behind the server route boundary, but live validation is still blocked by partner Bedrock access. Phase 2 exports are not MES-validated until a partner manually imports and accepts the package.

## What The Product Does Now

- Creates local or Supabase-backed projects with a project home and per-project workflow.
- Starts from the committed Customer X sample workbook or an uploaded `.xlsx` workbook.
- Parses the `Requirements` sheet with row 2 as the real header row and preserves Excel row traceability.
- Generates draft requirement comments and demo guidance through the server-side generation route.
- Supports consultant review, approval, and script shaping before export.
- Downloads a separate Markdown Phase 1 handoff document.
- Supports the required pilot Phase 2 demo flow: approved Phase 1 rows, setup, Master Data generation, review, export, and traceability.
- Supports project roles, invites, collaboration settings, profile persistence, activity records, and owner-only project lifecycle controls when Supabase is configured.

## Phase 1 Scope

Phase 1 is Excel-first and consultant-reviewed.

Input:

- customer requirements workbook

Output:

- requirement-level MES comments
- demo guidance for selected requirements
- separate Markdown demo document

Phase 2 is required for the pilot demo after Phase 1 approvals. The exported package is a demo artifact and is not MES-validated until manual partner import validation is completed.

## Non-Goals

- direct LibreChat product shell
- broad unstructured document ingestion
- browser-exposed Bedrock, AWS, MCP, or MES credentials
- committing raw partner artifacts, generated exports, or extra workbooks

## Workflow

The current routed Phase 1 flow lives under `src/app/projects/[projectId]/`:

1. `source`: confirm the active workbook, inspect parsed rows, or upload a replacement workbook
2. `generate`: create drafts for selected rows in `mock` or `real` mode
3. `review`: approve, flag, skip, or edit generated output
4. `script`: shape the assembled consultant-facing narrative
5. `export`: download the Markdown handoff

The required pilot Phase 2 demo continuation lives under `src/app/projects/[projectId]/master-data/`:

1. `setup`: analyze applicable requirements and select object types
2. `process`: generate Master Data drafts with template-backed defaults
3. `review`: edit and approve generated objects
4. `export`: download the Master Data package
5. `traceability`: inspect the requirement-to-object audit trail

The top-level home screen creates or reopens projects. Without Supabase, project state stays local for mock-mode review. With Supabase, project metadata, roles, workbook source state, Phase 1 state, profile data, and activity records are persisted server-side.

## Quick Start

Use Node `20.19.0` and pnpm through Corepack:

```bash
corepack enable
pnpm install
pnpm dev
```

App available at [http://localhost:3000](http://localhost:3000). Onboarding docs at [http://localhost:3000/docs](http://localhost:3000/docs).

Mock generation is enabled by default — no partner credentials needed.

> **Archived partner stack:** a `start.sh` script exists one level above this repo that starts the full partner support stack (LibreChat, clickhouse, rag, ferretdb, postgres). It is not committed to this repo, is specific to a particular macOS setup, and is not required for normal development or the MVP demo.

## Authentication

The app uses Supabase Auth for email/password sign-in, signup, password reset, and `/auth/callback` session exchange. To enable it, set these variables in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key-here
```

If these variables are absent, the Next.js proxy skips auth entirely so local mock mode continues to work without a Supabase project.

Auth and account routes:

- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`
- `/auth/callback`
- `/profile`
- `/settings`

Server-side Supabase helpers live in `src/lib/supabase/`. Use `server-config.ts` for actionable server-only config checks. `SUPABASE_SERVICE_ROLE_KEY` is optional and should only be set for explicit server-only admin operations; never expose it through `NEXT_PUBLIC_*` variables.

## Supabase Migrations

The Supabase migration scaffold and project collaboration schema live in `supabase/`.

Use the Supabase CLI for local schema work:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase migration new <short_description>
supabase start
supabase db reset
```

The current schema includes profiles, project metadata, memberships, invites, phase-state JSON, file metadata, activity events, role helpers, and RLS policies. See [content/docs/project-collaboration-schema.mdx](content/docs/project-collaboration-schema.mdx) for the role and permission contract.

Apply reviewed migrations to the linked remote project deliberately with:

```bash
supabase db push
```

See [supabase/README.md](supabase/README.md) for the local and production migration workflow.

## Environment Modes

Default local mode:

- `GENERATION_MODE=mock`

Startup behavior:

- `pnpm dev` starts only the Next.js app — the normal path for development and demo
- `GENERATION_MODE` controls generation behavior independently of how the app is started

Real mode requires the server-side values shown in [`.env.example`](.env.example), including:

- `MCP_SERVER_URL`
- `BEDROCK_MODEL_ID`
- `AWS_REGION`
- either bearer-token auth or working AWS credentials

Current status:

- mock mode is the safe default and should work for normal teammate onboarding
- real mode is implemented for both requirement generation and Phase 2 Master Data generation
- use the existing validation notes in `docs/discovery/` for partner-stack history and retest evidence

## Quality Commands

- `pnpm dev`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm storybook`
- `pnpm storybook:build`
- `pnpm test:e2e`
- `./scripts/codex/review-ui.sh`
- `pnpm format`
- `pnpm format:check`

## Deployment Automation

This repo uses Vercel Git Integration as the primary deployment path, with GitHub Actions kept for CI and token-based Vercel fallback workflows.

- Pushes to `main` deploy to production when the Vercel project is connected to `FEUP-LGP-18/cm-mes-advisor`.
- Pull requests create Vercel preview deployments when Git Integration is connected.
- `.github/workflows/vercel-preview.yml` and `.github/workflows/vercel-production.yml` remain available as token-based fallbacks and skip gracefully when secrets are missing.

Optional GitHub Actions repository secrets for the fallback workflows:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

The Vercel project is currently configured with `GENERATION_MODE=mock` for both Preview and Production so review builds stay safe without partner credentials.

## LGP Project Documentation

Artefacts produced for the FEUP LGP 2025/2026 academic milestone:

- [docs/lgp/requirements.md](docs/lgp/requirements.md): user stories and functional requirements by area
- [docs/lgp/architecture.md](docs/lgp/architecture.md): stack, app structure, design system, key decisions
- [docs/lgp/user-manual.md](docs/lgp/user-manual.md): consultant-facing guide for Phase 1 and Phase 2
- [docs/lgp/handover.md](docs/lgp/handover.md): what is delivered and how Critical Manufacturing can take it over
- [docs/lgp/findings.md](docs/lgp/findings.md): partner validation, metrics, development stats, lessons learned

See also [COLLABORATORS.md](COLLABORATORS.md) for the full team list.

## Where To Read Next

Canonical docs:

- [http://localhost:3000/docs](http://localhost:3000/docs): searchable codebase onboarding guide
- [AGENTS.md](AGENTS.md): agent instructions and coding guardrails
- [docs/codex-frontend-setup-macos.md](docs/codex-frontend-setup-macos.md): repo-specific Codex setup on macOS
- [docs/frontend-ui-quality-workflow.md](docs/frontend-ui-quality-workflow.md): frontend execution and verification playbook
- [docs/codex-figma-mcp.md](docs/codex-figma-mcp.md): Figma MCP readiness and manual auth steps
- [docs/discovery/project-context.md](docs/discovery/project-context.md): current-state product and repo context
- [docs/phase-1-epic-plan.md](docs/phase-1-epic-plan.md): current roadmap and status
- [content/docs/release-checklist.mdx](content/docs/release-checklist.mdx): pilot-ready release checklist

Supporting project notes:

- [docs/discovery/rui-scope-message.md](docs/discovery/rui-scope-message.md)
- [docs/discovery/rui-answers-2026-04-14.md](docs/discovery/rui-answers-2026-04-14.md)
- [docs/discovery/ui-ux-decisions.md](docs/discovery/ui-ux-decisions.md)
- [docs/discovery/phase-1-demo-readiness.md](docs/discovery/phase-1-demo-readiness.md)
- [docs/discovery/phase-1-librechat-fallback.md](docs/discovery/phase-1-librechat-fallback.md)

Design references:

- [docs/design/agent-ui-canon.md](docs/design/agent-ui-canon.md)
- [docs/design/phase1-ui-audit-2026-04-21.md](docs/design/phase1-ui-audit-2026-04-21.md)
- [docs/design/phase1-design-system-guidelines.md](docs/design/phase1-design-system-guidelines.md)

## Status

This repo should currently be understood as:

- pilot-ready, not production-ready
- project-first instead of workbook-page-first
- route-based instead of one oversized workspace route
- locally persistent for mock-mode review flows
- server-backed for Supabase auth, profiles, roles, collaboration, and Phase 1 state
- server-backed for generation boundaries
- Phase 2-ready for the required pilot demo path, but not MES import-validated

What is still not done:

- fully validated direct real-mode partner generation
- manual partner MES import validation for Phase 2 packages
- production operations hardening beyond the documented pilot checklist
- alternative export formats such as PDF or Word

## Fixture And Artifact Rules

Committed fixture:

- `fixtures/customer-x-functional-requirements.xlsx`

Do not commit:

- `.env` files
- passwords, tokens, API keys, or AWS credentials
- raw partner PDFs or ZIPs
- generated exports
- uploads or local-only data
- additional partner workbooks without explicit review
- Supabase CLI local state or SQL scratch snippets

Keep all partner, MES, MCP, Bedrock, and AWS secrets server-side only.
