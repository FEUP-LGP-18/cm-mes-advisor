# Critical Manufacturing MES Demo Advisor

Excel-first MES demo advisor for the FEUP LGP project with Critical Manufacturing.

## Phase 1 Scope

Phase 1 starts from a customer requirements Excel file. The MVP will parse the `Requirements` sheet, let consultants review requirements, generate requirement-level comments explaining how Critical Manufacturing MES addresses them, generate step-by-step demo guidance, and export a separate demo document.

Phase 2 Master Data generation is intentionally out of scope for this baseline unless it is explicitly requested later.

## Getting Started

Use Node `20.19.0` and pnpm through Corepack:

```bash
corepack enable
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Scripts

- `pnpm dev`: start the local Next.js dev server
- `pnpm build`: create a production build
- `pnpm lint`: run ESLint
- `pnpm typecheck`: run TypeScript without emitting files
- `pnpm test`: run Vitest
- `pnpm format`: format supported text files with Prettier
- `pnpm format:check`: check formatting without rewriting files

## Project Docs

- `docs/discovery/project-context.md`: curated discovery context
- `docs/discovery/ui-ux-decisions.md`: review meeting UI/UX decisions
- `docs/discovery/rui-answers-2026-04-14.md`: latest partner answers for Phase 1/2 implementation assumptions
- `docs/discovery/rui-scope-message.md`: partner scope message
- `docs/discovery/teams-client-thread-summary.md`: partner conversation summary
- `docs/discovery/librechat-mcp-notes.md`: safe LibreChat/MCP package notes
- `docs/phase-1-epic-plan.md`: Phase 1 epic plan

## Fixture

The only committed Excel workbook is:

```text
fixtures/customer-x-functional-requirements.xlsx
```

Do not commit raw PDFs, ZIPs, archive folders, exported documents, uploads, local data, or additional partner workbooks without an explicit review.

## Epic 1 Parser Validation

The Excel parser lives in:

```text
src/lib/requirements/
```

It parses the `Requirements` sheet from the committed fixture, treats row 2 as the real header row, and preserves the original Excel row number as `sourceRowNumber`.

The existing Excel `Comment` column is mapped to `sourceComment`. Epic 1 does not generate AI output and does not create a `generatedComment` field.

Run the fixture-backed review workspace with:

```bash
pnpm dev
```

Then open `http://localhost:3000` to scan and inspect requirement data parsed from the fixture.

Run the parser tests with:

```bash
pnpm test
```

## Epic 2 Requirements Review Without AI

The home page now shows a fixture-backed requirements review workspace for the
committed Customer X Excel workbook. Consultants can scan parsed rows, use
read-only filters, select a requirement, and inspect the full source row details.

All requirements default to `pending` until Epic 3 adds review actions and local
persistence. The Review and Approved filters are intentionally empty for now.
Epic 2 does not generate AI comments, demo guidance, uploads, or Phase 2 Master
Data output.

## Epic 3 Local Review State

The review workspace now supports local prototype review actions. Consultants
can add manual notes, approve rows, flag rows for review, skip rows, reset rows
back to draft, and refresh without losing those local decisions.

This state is stored in browser localStorage behind a small adapter. It is not a
production database. The original Excel `sourceComment` remains read-only source
data.

## Epic 4 Mock Generation Contract

The review workspace can generate deterministic mock drafts for selected
requirements. Drafts include a consultant-facing comment, demo steps,
confidence, assumptions, warnings, and mock source references labeled as
`mock-ai` or `mcp-placeholder`.

This is not a real AI integration. Epic 4 does not call Bedrock, MCP, LibreChat,
MES services, document export, uploads, authentication, or Phase 2 Master Data
generation. Resetting a generated row restores the latest mock draft; resetting a
non-generated row clears manual local edits.

## Epic 5A Server-Side Generation Foundation

Epic 5A moves generation behind a server route at
`/api/requirements/generate` while keeping the Epic 4 mock draft contract.
Mock mode remains the default so every teammate can run the app without
credentials. Real Bedrock/MCP generation is guarded behind server-only config
and currently returns a safe unavailable response until the protocol is
finalized.

Use `GENERATION_MODE=mock` for normal development. The `.env.example` file only
contains placeholder names and values for the server-side integration boundary.

## Epic 5B Safe Real Integration Discovery

We verified the support package is a local LibreChat/RAG setup that runs
LibreChat at `http://localhost:3080`, the RAG container on port `8080`, and the
ClickHouse containers on `8123` and `9000`. The package instructions also point
to the `rag` MCP server for MES documentation lookup.

What is still blocked:

- The exact callable MCP or HTTP protocol contract is not yet verified in this
  repo, so real generation remains unavailable.
- Mock mode stays the safe default and preserves the existing
  `GeneratedRequirementDraft` contract for the UI.

Next step:

- Once the safe instruction/config files are directly inspectable or a trusted
  protocol contract is shared, wire a server-only real adapter behind the
  existing provider boundary.

## Secret Safety

Do not commit `.env` files, MES passwords, ZIP passwords, Bedrock keys, AWS credentials, MCP credentials, or partner secrets. Keep AI credentials server-side only. Use `.env.example` for placeholder names and safe example values.
