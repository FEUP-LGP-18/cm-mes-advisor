# UI/UX Decisions - Review Meeting Deck

Last updated: 2026-04-14

## Source And Status

Primary source: `03_review-meeting/Review Meeting (1).pdf`

Related earlier copy: `98_archive/duplicates/Review Meeting.pdf`

Status:

- The Review Meeting deck is the strongest current source for the intended application flow and UI/UX direction.
- The screens are explicitly marked as preliminary and may change later.
- Treat the deck as a product-flow reference, not a pixel-perfect visual specification.
- Current canonical scope remains Excel-first unless Rui Barbosa expands it.

## Locked Product Decisions

- Phase 1 output should be available both inside the application UI and as a separate generated document.
- The team is building a separate application, not building directly on top of LibreChat.
- LibreChat, the MCP server, and the provided RAG package should be treated as support/reference infrastructure unless the architecture is changed later.
- Rui clarified the first Phase 2 object-type scope on 2026-04-14: start with enterprise, site, facility, area, and resource; ideally add material and product if time allows.
- Supporting-doc upload appears in the deck, but it should stay optional or future-scope until Rui confirms that non-Excel inputs are in scope.
- Master Data generation should remain review-first and should not auto-import directly into MES without a consultant approval step.

## Product UX Principles

- Consultant-facing: the primary users are Critical Manufacturing implementation consultants and pre-sales engineers preparing customer demos.
- Project-based: work is organized around customer demo projects, not one-off chat sessions.
- Human-in-the-loop: AI output is draft material that consultants review, edit, approve, flag, or skip.
- Traceable: generated comments, demo steps, and Master Data objects should trace back to source requirements and supporting MES documentation.
- Export-oriented: the app should produce usable deliverables, including Phase 1 documents and Phase 2 Master Data packages.
- Safe by default: show confidence, issues, and review status before export or import.

## UX Review Notes / MVP Guardrails

- The overall flow makes sense for the end user: project, upload Excel, AI-generated comments and demo script, consultant review, export, then optional Master Data.
- Phase 1 should feel complete on its own. Users should be able to finish a valuable workflow with in-app review and a generated demo document without needing to enter Phase 2.
- Phase 2 should be an optional continuation, not a forced step after script generation.
- For partial or ambiguous requirements, the UX should guide the consultant toward a workaround when possible, then mark the row for review if no good workaround is clear.
- The UI should avoid promising broader document ingestion while the canonical partner scope remains Excel-first.
- The UI should avoid implying that Master Data generation is fully solved before the team has validated the import format against MES.
- Keep the user-facing MVP simple: shippable Phase 1, optional and validated Phase 2, clear review gates, and no hidden auto-import behavior.

## Global Shell

- Product name in the UI: `Critical Manufacturing MES Advisor`.
- Main authenticated navigation includes `Projects`, `Settings`, `User`, and `Logout`.
- Project context appears as a badge such as `PRJ-0041` in processing/review screens.
- Phase-specific flows use a left-side progress rail or sidebar to show where the user is in the workflow.
- Settings include areas for industry templates, AI configuration, MES connection, and user management.

## Phase 1 Flow - Requirements To Comments And Demo Script

### Screen 0 - User Authentication

- Login screen has email and password fields.
- Successful login navigates to the dashboard.
- Failed login should show an inline error below the password field.

### Screen 1 - Dashboard

- Dashboard lists projects with search, filter, sort, metrics, and actions.
- Metrics shown in the deck include active projects, average AI accuracy, average time saved, and pending review.
- `Avg. AI Accuracy` is risky unless there is ground-truth evaluation data. Safer MVP metrics are `Pending Review`, `Requirements Processed`, `Approved Outputs`, and `Low Confidence Items`.
- Project table columns include project, customer, industry, stage, status, AI score, updated date, and actions.
- Example actions include `Open`, `View`, and `Resume`.

### Screen 1a - Creating A Project

- Empty dashboard state says there are no projects yet.
- Primary action is to create the first project.
- This state should make the starting path obvious for a new consultant.

### Screen 2 - New Project Setup

- Project setup captures project name, customer name, industry template, description, and assigned consultants.
- Industry template is required in the deck.
- Consultant assignment is represented as a searchable field with selected chips.
- Data isolation notes mention project-contained documents, no external sharing, Bedrock processing, and MCP scoping.
- Navigation uses `Back` and `Continue`.

### Screen 3 - Upload Requirements

- Requirements upload uses a wizard/progress sidebar.
- The main required upload is an Excel file.
- Empty state accepts `.xlsx` files, includes a browse button, and indicates a maximum file size.
- After upload, the UI previews requirement rows and shows validation status.
- The deck shows optional supporting documents, but this must be treated as optional or future-scope until confirmed.
- For MVP, supporting documents should be hidden, disabled, or clearly marked as future-scope so the UI does not revive the older heterogeneous-document input scope.
- The AI configuration area shows MCP server connection status.
- Primary action is `Run AI Analysis`.

### Screen 4 - AI Processing

- AI processing shows the uploaded filename and overall progress.
- Stages shown are Excel/requirement parsing, MES knowledge lookup via MCP, comment generation, and demo script generation. The deck labels this as document parsing, but MVP language should stay Excel-first.
- The screen includes a live activity log with timestamps and confidence-style messages.
- Processing state includes pause/cancel behavior.
- Done state changes the main action to proceed.
- The deck includes a demo shortcut to skip to review, which should be treated as prototype-only unless needed.

### Screen 5 - Requirements Review

- Requirements review is a table-plus-detail workspace.
- Left filters include status and category counts.
- Table columns include ID, category, requirement, AI comment, confidence, and status.
- Requirement states include pending, approved, review/flagged, and skipped.
- Consultants can approve all, export CSV, select a row, edit the AI comment, save, reset to AI, approve, flag, or skip.
- The selected-row panel shows traceability sources from MES documentation.
- Rui's 2026-04-14 guidance means the review flow should support workaround notes and consultant-review flags for partial or uncertain requirements.
- The `Generate Script` action should be disabled or risky while review is pending.

### Screen 5A - Requirements Review (No Row Selected)

- No-row-selected state prompts the user to select a row from the table.
- The empty side panel should explain that row selection is needed to view the AI comment, edit it, and approve or flag the requirement.

### Screen 6 - Script Output

- Script output shows a generated demo guide for the customer project.
- It groups steps into script sections such as materials setup, process flows, quality gates, reporting demo, and integration.
- It shows coverage counts such as requirements addressed and demo steps generated.
- Demo steps should be editable and traceable to requirement IDs and source references.
- Rui's ideal target is click-by-click MES guidance with exact screens, modules, and actions, if time allows.
- Top actions include export `.xlsx`, export PDF, and `Generate Master Data`.
- The primary Phase 1 export should be the generated demo document, with an optional updated Excel/comments export if the team decides to support it.
- `Generate Master Data` should be presented as an optional continuation into Phase 2, not as a required completion step for Phase 1.
- This screen is the Phase 1 bridge into Phase 2.

## Phase 2 Flow - Requirements To Master Data

### Screen 7 - Master Data Setup / Select Object Types

- Master Data setup reuses project context and the left progress rail.
- Requirements analysis identifies applicable rows and maps them to MES object types.
- The preview table includes requirement ID, category, description, MES object, and confidence.
- First implementation scope from Rui is enterprise, site, facility, area, and resource; material and product are desirable if time allows.
- Selection summary groups generated candidates by object type and should keep later object types such as operations, data collection, and routing out of the MVP path unless the team has time.
- Primary action is `Generate Master Data`.

### Screen 7a - AI Processing

- Master Data processing shows generation progress and the currently processed requirement.
- Generation steps include parsing requirement text, mapping to MES object schema, populating required fields, validating cross-references, and packaging Master Data files.
- A log panel shows OK/WARN/RUN messages for generated objects and issues.
- The screen includes a cancel action.

### Screen 7B - AI Processing Complete

- Completion state confirms Master Data objects were generated successfully.
- It summarizes counts by object type, such as materials, resources, operations, and data collection.
- It warns when objects still require manual review before export.
- Primary action is to review results.

### Screen 8 - Master Data Review

- Review screen groups generated objects by object type, such as materials, resources, operations, and data collection.
- Selecting an object opens editable fields and shows source context.
- Fields include auto-generated IDs, names, types, units of measure, and descriptions.
- The UI shows how many objects have been reviewed.
- Each object needs explicit approval before moving on.

### Screen 8A - Export And Download

- Export screen summarizes object totals, approved counts, modified counts, and needs-review counts.
- It shows issues such as missing fields or low-confidence mappings.
- Output format options include ZIP with XML, Excel workbook, or both.
- Filename is editable.
- MCP server connection status is shown.
- Primary action is to download the Master Data package.
- Before offering official-looking ZIP/XML/Excel downloads, the team should validate the import format against the MES environment or clearly mark the output as a draft.
- Rui's minimum useful Phase 2 output is something directly importable in MES and working; missing required fields should use safe defaults so the import succeeds.

### Screen 9 - Traceability Matrix / Full Audit Trail

- Traceability matrix maps requirements to generated MES objects.
- Filters include search, object type, status, confidence, and reviewed-by.
- Table columns include requirement ID, requirement text, MES object, object name, confidence, status, reviewer, timestamp, and source document.
- Audit summary includes requirements, MES objects, approved count, modified count, coverage, review audit, and export audit report context.
- Export actions include Excel and full audit report PDF.

### Screen 10 - Settings And Templates

- Settings has a left navigation for industry templates, AI configuration, MES connection, and user management.
- Industry templates shown include Electronics / PCB, Semiconductor Fab, and Medical Devices.
- Templates have active or draft states and edit/duplicate actions.
- This screen implies the app may support reusable industry-level configuration, but initial implementation can keep this minimal unless needed.
- Full Settings/Templates management should be treated as post-MVP unless the team needs it for the first prototype; a hardcoded or lightly configurable template is enough for the first implementation.

## Implementation Implications For Later Repo Work

- The app should model projects as first-class entities with stage/status, uploaded files, generated outputs, review progress, and exports.
- Requirement rows need stable IDs and status fields so the UI can track approved, flagged, review, skipped, and pending states.
- AI jobs need progress events, stage labels, logs, confidence values, and resumable or retryable states.
- Phase 1 should support editing comments and demo script steps before export.
- Phase 2 should support editing generated Master Data objects and preserving a requirement-to-object audit trail.
- Export capability is part of the product, not an afterthought.

## Known Cautions And TBDs

- Do not let the older unstructured-document scope override the current Excel-driven scope.
- Do not assume supporting documents are required for MVP until Rui confirms it.
- Do not auto-import generated Master Data into MES; keep export and consultant review as the safe default.
- Do not make Phase 2 feel mandatory for a successful Phase 1 demo-script workflow.
- Do not promise importable Master Data until the package format has been validated against MES.
- Phase 2 object types are now clarified at a first-pass level: enterprise, site, facility, area, resource, and ideally material/product.
- Confirm the exact Phase 1 separate document format later: PDF, Word, Markdown, Excel, or another format.
