# Hand-Over Document

Last updated: 2026-06-15

**From:** FEUP LGP Team 18
**To:** Critical Manufacturing (partner contact: Rui Barbosa)

---

## What Is Being Delivered

The CM MES Demo Advisor — a consultant-facing web application that automates the preparation of MES demo scripts and pilot Master Data packages from customer requirements Excel workbooks.

The deliverable includes:

1. **Source code** — full repository at `github.com/FEUP-LGP-18/cm-mes-advisor`
2. **Deployed application** — running on Vercel, auto-deploys from the `main` branch
3. **In-app documentation** — accessible at `/docs` in the running app
4. **Technical documentation** — in `docs/` within the repository

---

## What the Application Does

### Phase 1 — Demo Script Generation

Input: customer requirements `.xlsx` workbook (same format as `Customer X Functional Requirements.xlsx`)

Process:
1. Parse the `Requirements` sheet
2. Generate AI-assisted comments explaining how each requirement is addressed in MES
3. Consultant reviews, edits, and approves each comment
4. A demo script is assembled from approved requirements
5. Export as a Markdown document

Output: a consultant-ready demo script document

### Phase 2 — Master Data Generation (Pilot)

Input: approved Phase 1 requirements

Process:
1. Identify requirements applicable for Master Data
2. Generate Master Data objects (Enterprise, Site, Facility, Area, Resource, Product, Material)
3. Consultant reviews and approves each object
4. Export as an Excel workbook + JSON manifest package

Output: a pilot Master Data package intended for partner import validation via **Administration → Master Data Package**

> **Important:** the Phase 2 package is a pilot demo artifact. It was designed to be import-compatible but has not been validated by a live MES import. Critical Manufacturing should validate by importing it into the test MES environment.

---

## Access and Infrastructure

### Repository

- URL: `https://github.com/FEUP-LGP-18/cm-mes-advisor`
- Branch to use: `main`
- To transfer ownership: GitHub org transfer or fork to Critical Manufacturing's own GitHub organization

### Deployed Application

- Hosted on Vercel — connected to the GitHub repository via Git Integration
- Auto-deploys on every push to `main`
- To transfer: provide a Vercel account and the team will transfer the project, or set up a fresh Vercel project linked to the repository

### Partner Infrastructure Used

The application was built to integrate with the infrastructure Critical Manufacturing provided:

| Resource | Usage |
|---|---|
| MES environment (`lgp2026.apps.rhosdmz.criticalmes.dev`) | Reference for MES object types and import format |
| MCP Server | Provides MES documentation context for real-mode AI generation |
| AWS Bedrock | Supported LLM provider path for real-mode requirement comment and Master Data generation |
| Anthropic direct API | Practical fallback LLM provider path added after Bedrock key, budget, and IAM access issues |

In mock mode (the deployed default) none of these are required — the app runs with deterministic generation.

### Supabase (Optional)

Authentication and server-side state persistence use Supabase. To enable:

1. Create a Supabase project
2. Set the env vars in Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Run migrations: `supabase db push`

Without Supabase the app runs in local mode — all state stays in the browser, and the login flow is bypassed.

---

## Running the Application Locally

Requirements: Node 20.19.0, pnpm (via Corepack)

```bash
corepack enable
pnpm install
pnpm dev
```

App available at `http://localhost:3000`. See `README.md` for the full setup guide.

To enable real-mode AI generation, set `GENERATION_MODE=real`, configure `MCP_SERVER_URL`, and choose a server-side provider with `REQUIREMENT_GENERATION_PROVIDER`. Bedrock requires `BEDROCK_MODEL_ID`, `AWS_REGION`, and either AWS credentials or Bedrock bearer-token auth. Anthropic requires `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL`. Keep all values in server-side environment variables only.

---

## What Still Needs Validation

| Item | Status | Action needed |
|---|---|---|
| Real-mode Bedrock generation | Implemented, not the only real-mode path | Prior validation hit partner-side Bedrock budget and IAM access issues. Revalidate when Critical Manufacturing provides working Bedrock access |
| Real-mode Anthropic generation | Implemented fallback path | Direct Anthropic provider support exists for Phase 1 and Phase 2 real generation. Revalidate in the final target runtime with server-side credentials before making production claims |
| Phase 2 MES import validation | Not validated | Import generated package via **Administration → Master Data Package** in MES and confirm format |
| Phase 2 DEE file generation | Out of scope (stretch goal) | Future iteration if needed |

---

## Repository Structure for Handover

```
README.md                        ← setup, commands, deployment
AGENTS.md                        ← coding and scope guardrails
COLLABORATORS.md                 ← full team list with roles
docs/
├── lgp/
│   ├── architecture.md          ← system architecture and technology decisions
│   ├── requirements.md          ← user stories and functional requirements
│   ├── user-manual.md           ← consultant-facing usage guide
│   ├── handover.md              ← this document
│   ├── findings.md              ← build-measure-learn findings and metrics
│   └── final-deliverables-checklist.md ← closure deliverables checklist
├── discovery/                   ← partner conversations, validation notes, scope history
├── design/                      ← UI design guidelines and audit docs
└── ui-revamp-assets/            ← design mockups from MM and current screenshots
content/docs/                    ← in-app developer documentation (served at /docs)
supabase/                        ← database migrations and schema
fixtures/                        ← sample workbooks for testing
```

---

## Contacts

| Role | Person |
|---|---|
| Partner contact | Rui Barbosa (Critical Manufacturing) |
| LGP Team 18 | Available via GitHub: `FEUP-LGP-18` organization |
