# Critical Manufacturing MES Demo Advisor

Consultant-facing Phase 1 workspace for turning customer requirements Excel workbooks into reviewable MES demo outputs.

The current product direction is project-based and route-based:

- `source`
- `generate`
- `review`
- `script`
- `export`

Mock generation is the default so teammates can run the app locally without partner credentials. Real grounded generation is implemented behind the server route boundary, but live validation is still blocked by partner Bedrock access.

## What The Product Does Now

- Creates local Phase 1 projects with a project home and per-project workflow.
- Starts from the committed Customer X sample workbook or an uploaded `.xlsx` workbook.
- Parses the `Requirements` sheet with row 2 as the real header row and preserves Excel row traceability.
- Generates draft requirement comments and demo guidance through the server-side generation route.
- Supports consultant review, approval, and script shaping before export.
- Downloads a separate Markdown Phase 1 handoff document.

## Phase 1 Scope

Phase 1 is Excel-first and consultant-reviewed.

Input:

- customer requirements workbook

Output:

- requirement-level MES comments
- demo guidance for selected requirements
- separate Markdown demo document

Phase 2 Master Data generation is not required to complete Phase 1 in this repo.

## Non-Goals

- Phase 2 Master Data generation
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

The top-level home screen creates or reopens local projects. Project state is stored locally so a teammate can continue where the last review stopped.

## Quick Start

Use Node `20.19.0` and pnpm through Corepack:

```bash
./start.sh
```

Run that command from the workspace root, one level above this app directory.

The root `start.sh` script is the preferred local entrypoint for teammates and agents. It:

- validates the expected Node version from `.nvmrc`
- enables Corepack and installs dependencies only when needed
- reads `.env.local` to detect whether startup should stay app-only or include the archived partner support stack
- safely stops the existing CM MES Advisor app on `3000` when it owns the port
- refuses to kill unrelated processes on required ports
- in `real` mode, restarts `clickhouse`, `rag`, `LibreChat`, `ferretdb`, and `postgres` from `../98_archive/large-artifacts/LGP2026`

After startup:

- app: [http://localhost:3000](http://localhost:3000)
- LibreChat in `real` mode: [http://localhost:3080](http://localhost:3080)

## Manual App-Only Fallback

If you need to start only the Next.js app manually from this directory:

```bash
corepack enable
pnpm install
pnpm dev
```

## Environment Modes

Default local mode:

- `GENERATION_MODE=mock`

Startup behavior:

- if `.env.local` is missing or `GENERATION_MODE` is not `real`, `./start.sh` starts only the app
- if `GENERATION_MODE=real`, `./start.sh` also restarts the archived local partner support stack before launching the app

Real mode requires the server-side values shown in [`.env.example`](.env.example), including:

- `MCP_SERVER_URL`
- `BEDROCK_MODEL_ID`
- `AWS_REGION`
- either bearer-token auth or working AWS credentials

Current status:

- mock mode is the safe default and should work for normal teammate onboarding
- real mode is implemented, but live validation is still blocked by partner credential access
- see [docs/discovery/phase-1-real-mode-validation-2026-04-20.md](docs/discovery/phase-1-real-mode-validation-2026-04-20.md)

## Quality Commands

- `pnpm dev`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm format`
- `pnpm format:check`

## Where To Read Next

Canonical docs:

- [AGENTS.md](AGENTS.md): agent instructions and coding guardrails
- [docs/discovery/project-context.md](docs/discovery/project-context.md): current-state product and repo context
- [docs/phase-1-epic-plan.md](docs/phase-1-epic-plan.md): current roadmap and status
- [`../start.sh`](../start.sh): root local startup orchestrator for app-only and real-mode runs

Supporting project notes:

- [docs/discovery/rui-scope-message.md](docs/discovery/rui-scope-message.md)
- [docs/discovery/rui-answers-2026-04-14.md](docs/discovery/rui-answers-2026-04-14.md)
- [docs/discovery/ui-ux-decisions.md](docs/discovery/ui-ux-decisions.md)
- [docs/discovery/phase-1-demo-readiness.md](docs/discovery/phase-1-demo-readiness.md)
- [docs/discovery/phase-1-librechat-fallback.md](docs/discovery/phase-1-librechat-fallback.md)

Design references:

- [docs/design/agent-ui-canon.md](docs/design/agent-ui-canon.md)
- [docs/design/phase1-ui-audit-2026-04-21.md](docs/design/phase1-ui-audit-2026-04-21.md)

## Status

This repo should currently be understood as:

- a Phase 1-only product
- project-first instead of workbook-page-first
- route-based instead of one oversized workspace route
- locally persistent for prototype review flows
- server-backed for generation boundaries

What is still not done:

- fully validated direct real-mode partner generation
- Phase 2 Master Data generation
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

Keep all partner, MES, MCP, Bedrock, and AWS secrets server-side only.
