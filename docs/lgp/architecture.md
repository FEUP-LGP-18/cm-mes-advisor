# Architecture and Technologies

Last updated: 2026-06-07

---

## Overview

CM MES Demo Advisor is a consultant-facing web application that turns customer requirements Excel workbooks into reviewable MES demo outputs. It was built for Critical Manufacturing as a two-phase workflow: Phase 1 produces a demo script from approved requirements; Phase 2 generates a Master Data package for direct MES import.

The application operates in two modes: **mock** (local, no partner credentials needed) and **real** (server-side AWS Bedrock and Critical Manufacturing MCP integration).

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | CSS custom properties (design tokens), shared CSS primitives (`fv-*` classes) |
| Authentication | Supabase Auth — email/password, PKCE callback |
| Database | Supabase PostgreSQL with Row Level Security (RLS) |
| File storage | Supabase Storage — private `project-files` bucket |
| AI generation (real mode) | AWS Bedrock via partner-provided API key |
| MES integration (real mode) | Critical Manufacturing MCP Server |
| Deployment | Vercel (Git Integration) + GitHub Actions (CI and fallback) |
| Unit/surface testing | Vitest |
| End-to-end testing | Playwright |
| Component explorer | Storybook |
| Package manager | pnpm (via Corepack) |

The in-app developer documentation is served at `/docs` (powered by Fumadocs) and covers architecture, flow, setup, testing, and deployment in detail. See `content/docs/` for those source files.

---

## Application Structure

```
src/
├── app/                          # Next.js App Router pages and API routes
│   ├── projects/[projectId]/     # Phase 1 routed workflow (source → export)
│   │   └── master-data/          # Phase 2 Master Data sub-flow
│   ├── api/                      # Server-side generation, export, and auth routes
│   └── settings/                 # Global settings and profile surfaces
├── components/
│   ├── phase1/                   # Phase 1 workflow components
│   ├── phase2/                   # Phase 2 Master Data components
│   └── icons.tsx                 # Shared SVG icon components
├── lib/
│   ├── phase1/                   # Project registry, routing, workflow state
│   ├── master-data/              # Phase 2 domain logic, templates, generation, export
│   ├── requirements/             # Requirements parsing, review, generation, export
│   └── supabase/                 # Auth/client/server/middleware helpers
content/docs/                     # In-app onboarding documentation (MDX, served at /docs)
fixtures/                         # Committed sample workbooks for local QA
tests/e2e/                        # Playwright smoke and visual QA tests
supabase/                         # Database migrations and schema
docs/ui-revamp-assets/            # Target mockups from MM design package and current screenshots
.storybook/                       # Storybook configuration for shared primitives
```

---

## Phase 1 Workflow

Routes under `/projects/[projectId]/`:

```
source → generate → review → script → export
```

| Step | Description |
|---|---|
| `source` | Upload or confirm the customer requirements `.xlsx` workbook |
| `generate` | Generate AI-assisted draft comments for selected requirements |
| `review` | Approve, flag, skip, or edit generated output per requirement |
| `script` | Assemble the consultant-facing demo narrative |
| `export` | Download the Markdown Phase 1 handoff document |

The `Requirements` sheet is parsed with row 2 as the real header row, preserving Excel row numbers as traceability identifiers.

---

## Phase 2 Workflow (Pilot Demo Path)

Routes under `/projects/[projectId]/master-data/`:

```
setup → process → review → export → traceability
```

| Step | Description |
|---|---|
| `setup` | Analyze applicable requirements and select MES object types |
| `process` | Generate Master Data drafts with template-backed defaults |
| `review` | Edit and approve generated objects field-by-field |
| `export` | Download the Master Data package (Excel + JSON manifest) |
| `traceability` | Inspect the requirement-to-object-to-field audit trail |

Phase 2 is only accessible after Phase 1 rows are approved. Supported MES object types (partner-defined hierarchy): Enterprise, Site, Facility, Area, Resource, Product, Material.

---

## Design System — UI Revamp

The application underwent a full UI revamp in May–June 2026, implementing a design package provided by the Multimedia Masters (MM) program. The MM team produced screen-level mockups for all Phase 1, Phase 2, and Settings surfaces.

Key components of the design system:
- **Design tokens**: CSS custom properties for color, spacing, typography, border-radius, and shadows. No ad hoc values permitted.
- **Shared CSS primitives**: `fv-*` classes for the app shell, auth shell, stat cards, tables, badges, buttons, forms, panels, and empty states.
- **Brand assets**: MES Advisor logo (SVG and PNG) at `public/brand/`.
- **Target mockups**: canonical reference screenshots at `docs/ui-revamp-assets/target/` — Phase 1 (login, dashboard, source, generate, review, script), Phase 2 (7 screens), and Settings (4 tabs).
- **Visual language**: dark navy topbar + light operational canvas; utility-first, not decorative.
- **Mobile-first**: all surfaces are required to work on mobile viewports.

The design system was delivered as issue #57 (foundation) and applied per-surface across issues #60–#68. Storybook provides a component explorer for shared primitives.

---

## Authentication and Authorization

- Supabase Auth handles email/password sign-in, signup, password reset, and PKCE callback.
- Route protection enforced by `src/proxy.ts` (Next.js 16 `proxy` export).
- When Supabase env vars are absent, the proxy skips auth and the app runs in local mock mode.
- Project roles: `owner`, `editor`, `viewer` — RLS policies enforce permissions at the database layer.
- Server-side API routes return `401` for unauthenticated requests.

Auth routes: `/login` · `/signup` · `/forgot-password` · `/reset-password` · `/auth/callback`

---

## State Persistence

| State | Supabase mode | Mock mode |
|---|---|---|
| Phase 1 workflow state | `project_phase_states` (phase key `phase1`) | `localStorage` |
| Phase 2 Master Data state | `localStorage` (pilot scope) | `localStorage` |
| Project metadata and roles | `projects`, `project_memberships`, `project_invites` | `localStorage` |
| Uploaded workbook bytes | Supabase Storage (`project-files` bucket) | In-memory |
| Activity events | `project_activity_events` | — |
| User profile | `profiles` | — |

---

## Generation Architecture

All AI and MES calls are server-side only — partner credentials are never exposed to the browser.

**Mock mode** (`GENERATION_MODE=mock`, default):
- Deterministic output; no partner credentials required.
- Safe for local development, CI, and onboarding.

**Real mode** (`GENERATION_MODE=real`):
- Requires: `MCP_SERVER_URL`, `BEDROCK_MODEL_ID`, `AWS_REGION`, and AWS credentials or bearer-token auth.
- Phase 1: `/api/requirements/generate` calls AWS Bedrock with MCP-sourced MES documentation context.
- Phase 2: `/api/master-data/generate` uses the same server boundary.

Real-mode validation status: integration is implemented and reaches the partner Bedrock endpoint. A credential authorization issue (403) was identified during live testing in April 2026 — see `docs/discovery/phase-1-real-mode-validation-2026-04-20.md`. Mock mode is the safe and tested default for the MVP.

---

## Deployment

| Target | Method |
|---|---|
| Production | Vercel Git Integration — auto-deploys from `main` |
| Preview | Vercel preview deployments on each pull request |
| CI | GitHub Actions — lint, typecheck, Vitest, Playwright, build |

Both Preview and Production use `GENERATION_MODE=mock` for safe builds without partner credentials. Database migrations use the Supabase CLI (`supabase db push`) — see `supabase/README.md`.

---

## Key Architecture Decisions

| Decision | Rationale |
|---|---|
| Project-first UX | One project per customer engagement; multiple concurrent projects supported |
| Server-side generation boundary | Partner credentials (Bedrock, MCP, MES) stay server-side only |
| Mock-first development | Team can develop without partner access; CI always runs in mock mode |
| Excel-first input | Scope defined by partner — broad document ingestion is explicitly out of scope |
| Human-in-the-loop review | All AI output is reviewed and approved by the consultant before export |
| Phase 2 as pilot demo path | Package is a draft artifact until partner validates the MES import format |
| Shared design token system | Prevents visual divergence across surfaces worked on by multiple engineers |
| No LibreChat shell | Product is a dedicated consultant workspace, not a chat interface wrapper |
