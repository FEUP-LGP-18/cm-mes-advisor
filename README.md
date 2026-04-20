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

- `docs/discovery/phase-1-demo-readiness.md`: canonical 7-row shortlist, walkthrough, and output-quality rubric
- `docs/discovery/phase-1-librechat-fallback.md`: fallback runbook if direct credentials remain blocked
- `docs/discovery/phase-1-pr-shipping-note.md`: draft PR body for the current Phase 1 branch
- `docs/discovery/ui-ux-decisions.md`: review meeting UI/UX decisions
- `docs/discovery/rui-answers-2026-04-14.md`: latest partner answers for Phase 1/2 implementation assumptions
- `docs/discovery/rui-scope-message.md`: partner scope message
- `docs/discovery/teams-client-thread-summary.md`: partner conversation summary
- `docs/discovery/librechat-mcp-notes.md`: safe LibreChat/MCP package notes
- `docs/discovery/epic-8-validation-slice.md`: small Phase 1 validation slice
- `docs/discovery/phase-1-real-mode-validation-2026-04-20.md`: live real-mode validation result and current blocker
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
credentials. Real generation now uses server-only MCP and Bedrock adapters when
the required environment is present.

Use `GENERATION_MODE=mock` for normal development. The `.env.example` file only
contains placeholder names and values for the server-side integration boundary.

## Epic 5B Safe Real Integration Discovery

We verified the support package is a local LibreChat/RAG setup that runs
LibreChat at `http://localhost:3080`, the RAG container on port `8080`, and the
ClickHouse containers on `8123` and `9000`. The package instructions also point
to the `rag` MCP server for MES documentation lookup.

What the repo now supports:

- real server-side MCP lookup through the documented streamable HTTP endpoint
- real Bedrock-backed draft generation through the existing provider boundary
- bounded per-row orchestration with safe fallback drafts when evidence or model
  output is weak
- mock mode as the safe default for teammates without credentials

Real mode expects:

- `GENERATION_MODE=real`
- `MCP_SERVER_URL`
- `BEDROCK_MODEL_ID`
- `AWS_REGION`
- either standard AWS credentials or `AWS_BEARER_TOKEN_BEDROCK`
- optional `MCP_USER_ACCOUNT`

Still future-facing:

- richer click-by-click MES specificity where documentation allows
- optional PDF or Word export
- Phase 2 Master Data generation

## Epic 6 Demo Script Assembly

Approved generated requirement drafts now assemble into a grouped, traceable
Phase 1 demo script inside the review workspace. The script stays editable in
local prototype state, keeps requirement IDs and Excel row numbers visible, and
shows generated comments, demo steps, assumptions, warnings, confidence, and
source references where available.

This is no longer the final stop in the workflow: Epic 7 adds the separate
Markdown export, and Phase 2 Master Data remains optional and out of the Phase 1
completion path.

## Epic 7 Separate Demo Document Export

The assembled Phase 1 demo script can now be downloaded as a separate Markdown
document from the app. The export uses the current script title, project
context, summary counts, grouped sections, ordered steps, traceability, and
consultant edits so the document is readable outside the app.

Markdown is the first export format. PDF or Word exports can come later if the
team decides they are worth the added scope. The export flow stays browser-side
and does not write files back into the repo or workspace.

## Epic 8 Phase 1 Validation And Rui Feedback Pass

The mock Phase 1 output now leans harder into Rui's guidance:

- partial or custom rows start with a workaround-first explanation
- ambiguous rows stay in consultant review instead of sounding final
- missing descriptions are flagged clearly so they are not approved blindly
- the review workspace shows lightweight validation badges so consultants can
  spot rows that look safe to approve versus rows that still need human
  judgment

The validation pass is still Phase 1 only. Phase 2 Master Data remains optional
and future-facing.

## Phase 1 Hardening And MVP Completion

The prototype now supports the complete Phase 1 review loop on either the
committed Customer X fixture or an uploaded `.xlsx` workbook:

- browser-side workbook upload with row 2 headers and `Requirements` sheet
  validation
- source-aware local storage so fixture and upload state stay separate
- explicit mock / heuristic mode labeling near generation controls
- real grounded generation when MCP and Bedrock auth are configured
- review, generation, demo script assembly, validation cues, and Markdown
  export all working from the same workspace flow

The workbook-copy Excel export is intentionally deferred for now. Markdown is
the separate document export shipped in this repo, and a workbook round-trip can
be revisited later if the team wants it.

Remaining validation before we call Phase 1 fully done:

- run a live real-mode smoke pass against the partner MCP + Bedrock stack
- tune prompt specificity if real demo steps are still too generic
- verify Markdown export preserves grounded references from real generation

Current validation status:

- the live 2026-04-20 run confirmed the local MCP stack and direct Bedrock
  wiring are reachable from the app
- the partner-provided direct Bedrock credentials are still blocking successful
  generation, so Phase 1 should not be marked complete yet
- the remaining blocker is partner credential intent and permission setup, not
  missing app architecture
- see [docs/discovery/phase-1-real-mode-validation-2026-04-20.md](docs/discovery/phase-1-real-mode-validation-2026-04-20.md)
  for the exact blocker summary

Recommended operator docs while waiting for Rui:

- use [docs/discovery/phase-1-demo-readiness.md](docs/discovery/phase-1-demo-readiness.md)
  to validate the 7-row shortlist first
- use [docs/discovery/phase-1-librechat-fallback.md](docs/discovery/phase-1-librechat-fallback.md)
  if the approved short-term path is LibreChat-assisted
- use [docs/discovery/phase-1-pr-shipping-note.md](docs/discovery/phase-1-pr-shipping-note.md)
  as the draft Phase 1 PR body once the external blocker is resolved

Still future-facing:

- exact click-by-click MES documentation lookup depends on documentation quality
  and may require prompt tuning
- optional PDF or Word export
- Phase 2 Master Data generation

Manual smoke checklist:

- see [docs/discovery/phase-1-hardening-smoke-checklist.md](docs/discovery/phase-1-hardening-smoke-checklist.md)



## Secret Safety

Do not commit `.env` files, MES passwords, ZIP passwords, Bedrock keys, AWS credentials, MCP credentials, or partner secrets. Keep AI credentials server-side only. Use `.env.example` for placeholder names and safe example values.
