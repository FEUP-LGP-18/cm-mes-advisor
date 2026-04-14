# Phase 1 Epic-Based Implementation Plan

Last updated: 2026-04-14

## Plan Review

The previous Phase 1 architecture direction was broadly correct:

- Build a separate React / Next.js application rather than building directly on top of LibreChat.
- Keep the current scope Excel-first.
- Use the provided LibreChat / MCP / RAG package as documentation-grounding support, not as the final app shell.
- Keep AI calls and credentials server-side only.
- Preserve a human-in-the-loop workflow where consultants review, edit, approve, flag, or skip generated output.
- End Phase 1 with both an in-app output and a separate generated demo document.

The problem with the previous implementation plan is that it described too much of the future app at once. It mixed baseline app setup, Excel parsing, UI review flows, AI generation, document export, and future Phase 2 hooks into one large build. That is risky because it would make the first implementation hard to review, hard to test, and easy to scope-creep.

The revised approach is to deliver Phase 1 as staged vertical slices. Each epic should produce a concrete reviewable result before the team moves on.

## Phase 1 Target

Client-aligned Phase 1 scope:

- Input: a customer requirements Excel file.
- Current sample input: `06_example-inputs/Customer X Functional Requirements (1).xlsx`.
- The app parses the `Requirements` sheet and displays requirement rows to the consultant.
- The app generates draft requirement-level comments explaining how Critical Manufacturing MES addresses each requirement.
- The app generates step-by-step demo guidance for requirements selected for demonstration.
- A consultant reviews and edits the generated comments and demo steps.
- The successful Phase 1 output is available in the app UI and as a separate generated demo document.
- Rui's 2026-04-14 guidance: if a requirement is partially supported, suggest a workaround when possible; if not possible, mark it for consultant review. The ideal demo script is click-by-click MES guidance with exact screens, modules, and actions, if time allows.

Plain-language target:

- Help a consultant answer: "Can CM MES address this customer requirement, how should we explain it, and how would we demo it?"

## Non-Goals For Phase 1 MVP

- Do not implement Phase 2 Master Data generation in the Phase 1 MVP.
- Do not generate importable Master Data packages yet.
- Do not auto-import anything into MES.
- Do not build broad supporting-document ingestion unless Rui explicitly expands the scope.
- Do not build the full Settings / Templates management system yet.
- Do not build directly inside LibreChat or treat LibreChat as the product UI.
- Do not overwrite the original Excel file by default.
- Do not expose Bedrock keys, MES passwords, ZIP passwords, or other credentials in the browser, logs, exported documents, or notes.

## Architecture To Preserve

- Frontend: separate React / Next.js app.
- Backend: server-side route handlers or server actions for parsing, generation, review state, and export.
- Storage: local file-backed storage first, behind an adapter so it can later be replaced by a real database.
- Excel parser: parse `Requirements` using row 2 as the real header row.
- AI integration: server-only Bedrock LLM adapter.
- MES knowledge integration: server-only adapter around the partner-provided MCP / RAG access.
- LibreChat package: useful local reference and documentation-grounding support, not the app shell.
- Phase 1 completion: consultant can complete upload, review, and demo document export without touching Phase 2.

## Epic 0 - Repo And Technical Baseline

Goal:

- Establish the separate application foundation without implementing product logic yet.

Implementation:

- Create the app repo or app folder.
- Set up a React / Next.js baseline.
- Add lint, type-check, build, and dev scripts.
- Add environment handling for server-only variables.
- Add a small README explaining how to run the app locally.
- Add placeholder routes/pages for dashboard or home.
- Do not integrate AI yet.
- Do not parse Excel yet.

Reviewable output:

- The app runs locally.
- The app shows a placeholder home/dashboard page.
- The build and lint/type-check scripts run.
- The README tells a teammate how to start the app.

Acceptance checks:

- `npm run dev` or equivalent starts the app.
- `npm run build` or equivalent succeeds.
- No secrets are committed.

## Epic 1 - Excel Parsing Foundation

Goal:

- Turn the Customer X Excel file into reliable structured requirement data.

Implementation:

- Add local sample ingestion or upload handling for `Customer X Functional Requirements (1).xlsx`.
- Parse the `Requirements` sheet.
- Treat row 1 as a title/group row and row 2 as the real header row.
- Preserve original Excel row number for traceability.
- Preserve these fields:
  - requirement ID from `#`
  - requirement description
  - L2 process
  - L3 process
  - operation
  - demo flag
  - detail description and motivation
  - Prio EMS
  - Prio CWS
  - MVP flag
  - availability
  - availability CM
  - description availability
  - supported percentage
  - existing `Comment`
- Treat existing `Comment` as `sourceComment`, not generated output.
- Normalize demo/MVP flags case-insensitively.
- Keep the original uploaded file separate from parsed data.

Reviewable output:

- Parsed requirements appear in logs or a simple table.
- The row count and key fields match the sample Excel.
- Demo/MVP counts can be inspected.

Acceptance checks:

- Parser detects the `Requirements` sheet.
- Parser uses row 2 as headers.
- Parser preserves source row numbers.
- Parser does not overwrite or reinterpret the original `Comment` column as generated output.

## Epic 2 - Requirement Review UI Without AI

Goal:

- Let a consultant inspect the parsed Excel requirements in the app before generation exists.

Implementation:

- Build a minimal project/workspace page for parsed requirements.
- Add a requirements table.
- Add filters for:
  - all rows
  - demo rows
  - MVP rows
  - pending rows
  - review rows
  - approved rows
- Add a row detail panel.
- Show requirement fields and `sourceComment` in the detail panel.
- Avoid supporting-document upload in the MVP UI unless it is clearly disabled or marked future-scope.

Reviewable output:

- A consultant can inspect the Customer X Excel data in the app without any AI generation.

Acceptance checks:

- Table shows parsed requirement IDs and descriptions.
- Selecting a row opens detail.
- Filters behave predictably.
- The UI does not imply broad heterogeneous-document ingestion is supported.

## Epic 3 - Local Project State And Review Actions

Goal:

- Add enough state management for a real consultant review loop.

Implementation:

- Add local persistence for:
  - project metadata
  - uploaded file metadata
  - parsed requirements
  - generated-output placeholders
  - review status
- Support review actions:
  - approve
  - edit
  - flag
  - skip
  - reset to draft
- Track whether a row has generated output or only source data.
- Keep storage behind an adapter so it can later move to a real database. For this local prototype slice, browser localStorage is acceptable as long as it is isolated and replaceable.
- Keep `sourceComment` read-only and separate from manual consultant notes or future generated output.

Reviewable output:

- A user can mark rows and refresh without losing local prototype state.

Acceptance checks:

- Status changes persist locally.
- Edited draft text persists locally.
- Reset restores the latest draft output, not the original Excel source comment unless explicitly intended.
- Skipped rows have their own state/filter so intentionally ignored rows do not disappear.

## Epic 4 - Generation Contract With Mock AI

Goal:

- Define and test the generation workflow before integrating the real LLM/MCP stack.

Implementation:

- Define the structured output contract for a generated requirement result:
  - requirement ID
  - generated comment
  - demo steps
  - confidence
  - assumptions
  - warnings
  - source references
  - review status
- Define the demo step structure:
  - title
  - instructions
  - related requirement IDs
  - MES module or screen if known
  - source references
  - review status
- Implement a mocked generator returning realistic draft comments and demo steps.
- Add a generation progress state using the deck-aligned stages:
  - Excel / requirement parsing
  - MES knowledge lookup
  - comment generation
  - demo script generation
- Process only selected rows first.

Reviewable output:

- Selected rows can go through a fake generation flow and appear in the review UI.

Acceptance checks:

- Mock output follows the same schema expected from real AI.
- Generation state appears in the UI.
- Review actions work on mocked generated output.

## Epic 5 - Real Phase 1 AI Integration

Goal:

- Replace the mock generator with real Phase 1 AI generation for a small validation set.

Implementation:

- Add a server-only Bedrock LLM adapter.
- Add a server-only MES knowledge adapter for MCP / RAG access.
- Keep both adapters behind interfaces so mock mode remains available.
- Prompt only for Phase 1 outputs:
  - consultant-facing requirement comment
  - step-by-step demo guidance
  - confidence or uncertainty
  - assumptions and warnings
  - source references when available
- For partial support, prefer workaround suggestions; if no good workaround is available, flag for consultant review.
- Aim for click-by-click MES screens/modules/actions where the MCP context supports that level of detail.
- Do not ask the model to generate Master Data.
- Do not include the same row's existing `sourceComment` in evaluation prompts if the goal is to assess model quality.
- Optionally use a few existing comments from other rows as style examples.
- Require uncertainty handling instead of hallucinated confidence.
- Start with 5 selected requirements before expanding.

Reviewable output:

- A small selected set of requirements generates real AI drafts with traceability or explicit uncertainty.

Acceptance checks:

- Bedrock key stays server-only.
- MCP/RAG details stay server-only.
- Mock mode still works if the real integration is unavailable.
- AI output can be reviewed, edited, approved, flagged, or skipped.
- AI output does not claim unsupported certainty when context is missing.

## Epic 6 - Demo Script Assembly

Goal:

- Convert approved requirement-level outputs into a coherent demo script view.

Implementation:

- Build the script output screen as the successful end of Phase 1.
- Generate a script from approved rows.
- Group steps by process/category where possible.
- Keep steps editable.
- Preserve traceability from demo steps back to requirement IDs.
- Show assumptions and warnings clearly.
- Keep Phase 2 as optional/future from this screen.

Reviewable output:

- Approved requirement outputs become a readable script inside the app.

Acceptance checks:

- A user can reach a complete Phase 1 output without entering Phase 2.
- Script steps remain editable.
- Script references requirement IDs.
- `Generate Master Data` is not required to finish Phase 1.

## Epic 7 - Separate Document Export

Goal:

- Produce the separate Phase 1 document expected by the client.

Implementation:

- Export the reviewed Phase 1 result as a separate demo document.
- Start with Markdown for speed and traceability unless Rui or the team confirms PDF/Word first.
- Include:
  - project name
  - customer
  - source Excel filename
  - selected requirements
  - approved generated comments
  - demo steps
  - assumptions
  - warnings
  - traceability notes
- Do not include secrets or internal credentials.
- Do not claim Master Data output is ready.

Reviewable output:

- A user can download or open a separate demo-script document.

Acceptance checks:

- Exported document is readable outside the app.
- Exported document includes requirement IDs.
- Exported document reflects consultant edits and approvals.
- Exported document does not include secrets.

## Epic 8 - Validation And Rui Feedback Pass

Goal:

- Align the Phase 1 prototype with partner expectations before expanding.

Implementation:

- Fold in Rui's answers about:
  - quality bar
  - comment style
  - demo-step detail
  - traceability expectations
  - unsupported or ambiguous requirement handling
- Test the first 5-10 requirement outputs.
- Compare generated comments against existing sample comments as a quality reference, without treating those comments as the only acceptable answer.
- Adjust prompts, UI labels, review statuses, and acceptance criteria.
- Decide whether to add PDF/Word export or updated Excel export based on confirmed expectations.

Reviewable output:

- A small demo-ready Phase 1 workflow aligned with Rui's feedback.

Acceptance checks:

- Rui/team can review a small sample output.
- Feedback is captured in discovery notes or project issues.
- Prompt and UI changes are traceable to feedback.
- The prototype remains Excel-first and Phase-1-only.

## Suggested First Validation Slice

Use a small subset before expanding:

- Start with 5 requirements where both `Demo` and `MVP` are marked.
- Include mostly `Standard available` examples plus at least one ambiguous or custom-development-needed requirement.
- The sample Excel appears to have a useful `Demo` and `MVP` intersection, so the team can pick from that set while waiting for Rui's exact recommendation.

Do not treat this subset as final. Replace or adjust it when Rui replies.

## Cross-Epic Rules

- Every epic must be reviewable on its own.
- No epic should require finishing the entire app before showing progress.
- Keep Phase 1 independent and useful without Phase 2.
- Keep the current MVP Excel-first unless Rui expands the scope.
- Keep generated content editable by consultants.
- Keep original Excel comments as source/reference data.
- Keep credentials server-only.

## Testing Strategy

- Unit test Excel parsing against the sample workbook.
- Unit test demo/MVP flag normalization.
- Unit test review status transitions.
- Unit test generation output schema validation.
- Integration test upload or ingest sample Excel, parse rows, generate mock output, review output, and export a document.
- Manual test that a user can complete Phase 1 without entering Phase 2.
- Security scan that Markdown notes, exported documents, and client UI do not include secrets.

## Open Decisions To Revisit

- Final Phase 1 document format: Markdown, PDF, Word, Excel, or multiple formats.
- Whether to write generated comments back to a copy of the Excel file.
- Exact role of MCP/RAG integration in the separate app.
- Whether the first demo should include auth or use a dev-only/mock user.
