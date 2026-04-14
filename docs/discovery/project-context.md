# LGP Discovery

Last updated: 2026-04-14

## Project Snapshot

Program: FEUP LGP

Team: LGP-18

Partner: Critical Manufacturing

Partner contact seen so far: Rui Barbosa

Academic supervisor seen so far: Joao Pascoal Faria / Joao Faria, FEUP

Current best project summary:

- The team is building an AI-guided assistant for preparing Critical Manufacturing MES demos from customer requirements.
- The best-supported current scope is Excel-requirements-driven, not broad unstructured-document ingestion.
- The tool should help consultants explain how each requirement is addressed in MES, generate a demo script, and later produce Master Data for applicable requirements.
- The team is now in the Build-Measure-Learn implementation phase, after the 2026-03-27 Review Meeting.

## Current Canonical Scope

Treat Rui Barbosa's pasted WhatsApp message plus the real example files as the canonical scope until a newer partner statement says otherwise.

The Teams thread and Review Meeting deck now both support this same scope.

### Phase 1 - Requirement Comments And Demo Script

Input:

- An Excel file with a customer's requirements.
- Current reference file: `06_example-inputs/Customer X Functional Requirements (1).xlsx`.

Expected output:

- Populate a `Comment`-style column with how each requirement is addressed in the MES.
- Produce a step-by-step guide or demo script showing how to demonstrate each capability to the customer.

Plain-language meaning:

- For each customer requirement, the system should help answer: "Can CM MES do this, how does it do it, and how would we show it in a demo?"

### Phase 2 - Master Data Generation

Input:

- The same requirements Excel file, or a selected applicable requirement from that list.

Expected output:

- Master Data that can be imported into MES to create the objects needed for the demo, such as Materials and Resources.
- Current reference file: `06_example-inputs/MasterData_CookieFactory .zip`.

Plain-language meaning:

- Once the demo story is known, the system should help create the MES configuration data needed to make that demo executable in the test environment.

### Provided Supporting Assets

- MES environment: `https://lgp2026.apps.rhosdmz.criticalmes.dev/`
- MCP Server access: expected to answer questions about Critical Manufacturing MES using internal documentation
- Bedrock API key: expected to provide access to LLMs
- LibreChat / MCP local package: `98_archive/large-artifacts/(Copy) LGP2026.zip`

Security note:

- The MES initial password from the screenshot is intentionally not stored in this file.

## Source Register

| Source | Workspace Location | Confidence | Role |
| --- | --- | --- | --- |
| Rui WhatsApp scope message | `02_partner-conversation/rui-whatsapp-scope-message.md` | current canonical | Defines the live two-phase scope |
| Rui answers from 2026-04-14 | `docs/discovery/rui-answers-2026-04-14.md` | current canonical | Clarifies Phase 1 ambiguity handling, demo-step detail target, traceability priority, and Phase 2 Master Data MVP guidance |
| Teams client thread summary | `02_partner-conversation/teams-client-thread-summary.md` | current canonical / supporting | Adds timeline, partner guidance, Phase 2 advice, and security caveats |
| Review Meeting deck | `03_review-meeting/Review Meeting (1).pdf` | current canonical / supporting | Active copy; confirms product vision, Phase 1/2 functionality, UI flow, architecture, and BML plan |
| UI/UX decisions note | `03_review-meeting/ui-ux-decisions.md` | synthesized support | Screen-by-screen UI/UX reference extracted from the Review Meeting deck |
| Customer X Functional Requirements Excel | `06_example-inputs/Customer X Functional Requirements (1).xlsx` | current canonical | Concrete input artifact |
| MasterData CookieFactory ZIP | `06_example-inputs/MasterData_CookieFactory .zip` | current canonical | Concrete Phase 2 reference output/import format |
| LGP2026 LibreChat / MCP ZIP | `98_archive/large-artifacts/(Copy) LGP2026.zip` | current canonical support package / archived large artifact | Local LibreChat + RAG/MCP setup for MES documentation access |
| LGP2026 ZIP notes | `08_librechat-mcp-package/lgp2026-zip-notes.md` | supporting | Safe summary of package contents and instructions without secrets |
| MES access screenshot notes | `07_mes-environment/mes-access-screenshot-notes.md` | supporting / image-only | Confirms MES URL and account setup context |
| Project Charter screenshot notes | `01_project-charter/project-charter-screenshot-notes.md` | image-only / partial | Confirms team and approval context only |
| Strategic Plan | `04_strategic-plan/Strategic_Plan.pdf` | supporting / potentially legacy-scope | Active copy; formal long-term plan; may include old scope |
| Strategic Plan archived duplicate | `98_archive/duplicates/Strategic_Plan_LGP.pdf` | archived duplicate | Byte-identical duplicate of `Strategic_Plan.pdf` |
| PM Report | `05_pmr/PM_Report (2).pdf` | supporting / more current | Active 19-page PM report, confirms structured Excel requirements and BML phase |
| PM Report archived older copy | `98_archive/older-versions/PM_Report (1).pdf` | archived older version | Earlier 16-page copy preserved for comparison only |
| MVP Google Docs PDF | `98_archive/legacy-scope/Project Documentation_ AI-Guided MES Configuration Advisor (MVP) - Google Docs.pdf` | archived outdated / partial | Useful architecture context, but appears to describe older scope |
| Teammate summary in chat | not a local file | supporting | Gave reading order and warned about scope drift |
| Teams folder screenshot | not a local file | image-only | Shows document folder structure in Teams |
| Unclassified chat image | `98_archive/low-confidence-notes/unclassified-chat-image-notes.md` | archived image-only / unclear | Attached image had no reliable extractable project context |

## Source-by-Source Notes

### Rui WhatsApp Scope Message

What it confirms:

- Phase 1 is about generating demo scripts for prospective customers.
- The input is an Excel requirements file.
- The tool should populate a `Comment` column and produce a step-by-step demo guide.
- Phase 2 is about generating Master Data for requirements where this is applicable.
- Critical Manufacturing will provide a working MES environment, MCP Server access, and Bedrock API access.

What it conflicts with:

- It narrows or replaces older wording about ingesting heterogeneous unstructured customer documentation.

What it implies for the team:

- The first useful prototype should focus on the real requirements spreadsheet and produce consultant-friendly explanations and demo steps.
- Master Data generation should be treated as a second phase and should be grounded in the provided CookieFactory example.

### Teams Client Thread

What it confirms:

- The team initially asked for MES configuration examples, synthetic customer documents, and a description of consulting pain points on 2026-03-11.
- Rui replied on 2026-03-12 that Critical Manufacturing was collecting information and preparing the MES test environment.
- Rui defined the current two-phase scope on 2026-03-16.
- MES users were created for the team, and Rui invited the team to explore MES and try creating new objects.
- Rui said he could provide a quick demo if useful.
- On 2026-04-01, Rui shared the LibreChat / MCP ZIP package to help Phase 1.
- Rui advised that Phase 2 should start by creating a simple Master Data file with just a couple of objects, then importing it through `Administration -> Master Data Package`.
- After the Review phase, Goncalo shared the Review Meeting deck, Strategic Plan, and PM Report, and said the Build-Measure-Learn phase runs until 2026-06-05.

What it conflicts with:

- The earliest request still mentioned SOPs and equipment lists, but Rui later narrowed the expected input to an Excel customer requirements file.

What it implies for the team:

- The team should prioritize Excel-based Phase 1 and use the provided LibreChat/MCP package as the documentation-grounded assistant.
- Phase 2 should be incremental: build and import a simple Master Data file before attempting broad automatic generation.

Security implications:

- Do not store the ZIP/MES password in notes.
- Do not copy the Bedrock API key out of `.env` into notes.
- Do not broadly share the API key because Rui said it has a usage limit.

### Rui Answers From 2026-04-14

What it confirms:

- Partial support should be handled by suggesting a workaround when possible.
- If no good workaround exists, the row should be marked for consultant review.
- The team should avoid framing gaps as hard "limitations"; the workflow should be workaround-first, then review-needed.
- The ideal demo script is click-by-click MES guidance with exact screens, modules, and actions, although Rui recognizes this may be time-limited.
- MCP-based traceability to MES documentation is useful if time allows.
- Phase 2 can be simplified around requirements that make sense for Master Data generation, including team-created simpler requirements for demonstration.
- First Phase 2 object types should follow `enterprise -> site -> facility -> area -> resource`, ideally adding `material` and `product` if time allows.
- The minimum useful Phase 2 output is something directly importable in MES that works.
- DEE file generation is an end goal but should be treated as a stretch goal.
- Naming conventions are flexible for now.
- Missing or uncertain required Master Data fields should use defaults so the Master Data import works.

What it conflicts with:

- It reduces several previous open questions. Phase 2 is still complex, but the first object-type subset and missing-field policy are no longer unknown.

What it implies for the team:

- Phase 1 generation should produce safe consultant-facing output: explain the MES path, propose a workaround, or flag for review.
- Epic 4/5 generation contracts should leave room for warnings, assumptions, and MCP traceability references.
- Phase 2 should start with a small importable hierarchy before broad CookieFactory-level generation.

### Review Meeting Deck

What it confirms:

- Review Meeting date: 2026-03-27.
- Latest copied source now available as `03_review-meeting/Review Meeting (1).pdf`.
- Product vision: automatically turn customer requirements into MES demo scripts and Master Data.
- Primary users: Critical Manufacturing implementation consultants and pre-sales engineers.
- Secondary stakeholders: prospective industrial customers.
- Phase 1 input: requirements Excel.
- Phase 1 outputs: comment column, demo script, consultant review.
- Phase 2 input: same requirements Excel.
- Phase 2 output: Excel workbook in Critical Manufacturing's standard Master Data format, ready for import into MES.
- UI flow ideas include authentication, dashboard, project creation, requirements upload, AI processing, requirements review, script output, Master Data setup, Master Data review, export/download, traceability matrix, and settings/templates.
- Architecture slide confirms React / Next.js as frontend, LibreChat as AI interface, AWS Bedrock API for LLM inference, and MCP Server for MES documentation.
- Development plan targets iterative delivery and an MVP by early June.

What it conflicts with:

- Some development-plan labels still say `Document Ingestion`, which may be a leftover from older-scope language.

What it implies for the team:

- This is now a strong source for the UX and architecture story.
- The UI is planned as human-in-the-loop: consultants review, edit, and approve AI output before export/import.
- The current source of MES knowledge should be the partner-provided MCP Server, not generic LLM memory.
- Detailed UI/UX notes are captured in `03_review-meeting/ui-ux-decisions.md`.

### Customer X Functional Requirements Excel

What it confirms:

- The concrete input is an Excel workbook.
- It has one sheet named `Requirements`.
- It appears to contain about 167 requirement rows.
- Visible columns include requirement ID, requirement description, L2 process, L3 process, operation, demo marker, detail description and motivation, EMS priority, CWS priority, MVP marker, availability, and Critical Manufacturing availability/vendor feedback.

What it conflicts with:

- It supports the newer Excel-driven scope rather than a broad unstructured-document input scope.

What it implies for the team:

- The row-level unit of work is likely an individual requirement.
- The model/tool must preserve row traceability back to the Excel source.
- The `Demo`, `MVP`, priority, and availability columns may help decide which requirements are demo-script candidates or Master Data candidates.

### MasterData CookieFactory ZIP

What it confirms:

- The Master Data example is a ZIP archive, not just a single generated text file.
- It includes `MasterDataSample.xlsx` plus C# helper / Dynamic Execution Engine style files.
- The workbook contains many MES import sheets, including `<DM>Flow`, `<DM>Step`, `<DM>Resource`, and `<DM>DataCollection`.
- Example object values include cookie manufacturing flow, steps such as Mixing, Moulding, Baking, Cooling, and Packing, resources such as Mixer and Moulder resources, and data collection examples.

What it conflicts with:

- Nothing in the current scope; it supports Phase 2.

What it implies for the team:

- Phase 2 is structurally complex and should not be treated as a simple natural-language output.
- The generated Master Data will need schema awareness and probably validation before import.
- A safe MVP might generate a limited subset of object types first, rather than all sheets in the sample workbook.

### LGP2026 LibreChat / MCP ZIP

What it confirms:

- The package contains a local LibreChat/MCP/RAG setup.
- Archive contents include `.env`, `docker-compose.yml`, `librechat.yaml`, RAG and ClickHouse Docker image tarballs, and `INSTRUCTIONS.txt`.
- The instructions lead to a local LibreChat instance at `http://localhost:3080`.
- The user should select the `rag` MCP Server in the MCP Servers dropdown and ask questions about MES documentation.

What it conflicts with:

- Nothing in the current scope.

What it implies for the team:

- Phase 1 can be grounded in official MES documentation via this package.
- The `.env` likely contains the Bedrock key, but it should be used operationally, not copied into notes.

### MES Access Screenshot

What it confirms:

- The working MES environment URL is available.
- Accounts were created for the team.
- First login requires password change.

What it conflicts with:

- Nothing.

What it implies for the team:

- The team should explore the MES UI to understand demo flows and Master Data import.
- The teammate-mentioned navigation path to investigate is `Administration -> Master Data Package`.

Security note:

- The initial password is not stored here.

### Project Charter Screenshot

What it confirms:

- Team and organization context.
- Project Lead: Goncalo Araujo.
- Partner: Rui Barbosa.
- Supervisor: Joao Faria / Joao Pascoal Faria.
- Approval context from the visible charter approval section.

What it conflicts with:

- Nothing directly, but it is only a partial screenshot and cannot be used to confirm scope or milestones.

What it implies for the team:

- The full Project Charter is still needed for scope, risks, milestones, budget, and success criteria.

### Strategic Plan

What it confirms:

- This is a formal LGP deliverable for the AI-Guided MES Configuration Advisor.
- It likely contains long-term strategy, SWOT/PESTEL, business model, and strategic objectives.

What it conflicts with:

- The teammate warned that some sections still reference the older heterogeneous-documentation input scope.

What it implies for the team:

- Use it for strategic framing, business context, and long-term rationale.
- Do not treat it as the final product scope where it conflicts with Rui's newer Excel-driven scope.

### PM Report

What it confirms:

- `98_archive/older-versions/PM_Report (1).pdf` is an earlier 16-page copy.
- `05_pmr/PM_Report (2).pdf` is the active newer 19-page copy dated 2026-04-10.
- The updated PM report describes the project as addressing the manual interpretation of customer requirements, provided primarily as structured Excel files, by senior consultants.
- It says the solution uses AWS Bedrock integrated with a partner-provided MCP Server to ground LLM outputs in official technical documentation.
- Its table of contents includes current status, difficulties, scope compared to plan, risks, and Build-Measure-Learn planning.

What it conflicts with:

- The teammate warned it may include input-related inaccuracies being corrected.

What it implies for the team:

- Use it for project status, risk management, and process context.
- Cross-check product-scope claims against Rui's current scope message.
- Prefer `05_pmr/PM_Report (2).pdf` over the archived older copy unless there is a reason to compare versions.

### MVP Google Docs PDF

What it confirms:

- It is titled `Project Documentation: AI-Guided MES Configuration Advisor (MVP)`.
- It describes a human-in-the-loop advisor for turning customer documentation into MES configuration models.
- It mentions architecture and technologies such as LibreChat, MCP, and Master Data.

What it conflicts with:

- It appears to frame the MVP as ingesting heterogeneous or unstructured customer documentation and outputting Master Data skeletons.
- That is older than, or broader than, the current two-phase Excel-driven scope from Rui.

What it implies for the team:

- Use it as architecture and historical context only.
- Do not let it override the current Phase 1 requirement-comment and demo-script scope.

## Confirmed Inputs and Outputs

### Confirmed Input

- Main current input: `Customer X Functional Requirements (1).xlsx`
- Input shape: requirements spreadsheet with one row per requirement and metadata columns for process, demo relevance, priority, MVP, and vendor feedback.

### Confirmed Phase 1 Outputs

- Requirement-level comments explaining how the MES addresses each requirement.
- Step-by-step demo script or guide for showing each capability to the customer.
- Confirmed user decision: Phase 1 output should appear both in the app UI and as a separate generated document.
- Rui's ideal demo detail level is click-by-click MES steps with exact screens, modules, and actions, if time allows.
- Partial or uncertain rows should suggest a workaround when possible, otherwise be marked for consultant review.

### Confirmed Phase 2 Outputs

- Master Data package or workbook content for applicable requirements.
- Importable MES objects needed to run a demo.
- First object hierarchy should start with enterprise, site, facility, area, and resource.
- Material and product are desirable next if time allows.
- DEE file generation is a stretch goal, not the required first output.
- CookieFactory ZIP is the concrete reference example.

## Architecture and Platform Notes

Architecture references seen so far:

- React / Next.js, confirmed by Review Meeting deck
- LibreChat, confirmed by Review Meeting deck and Rui's ZIP package message
- MCP Server, confirmed by Rui message, Review Meeting deck, and ZIP package instructions
- Bedrock API / LLMs, confirmed by Rui message, PM report, and ZIP package message
- C#, from teammate summary and the C# files in the Master Data ZIP
- Critical Manufacturing MES Master Data import, from Rui message and CookieFactory ZIP

Current interpretation:

- React / Next.js is planned as the frontend.
- The final product should be a separate application, not built directly on top of LibreChat.
- LibreChat appears in the Review Meeting deck as an AI interface and can be run locally from the LGP2026 package, but it should be treated as support/reference infrastructure unless the architecture changes later.
- MCP Server is the bridge to MES documentation and knowledge.
- Bedrock provides model access.
- C# appears relevant to MES-side extension or helper code in the Master Data example.
- The human-in-the-loop UX is central: consultants should review and approve AI output before export/import.

### UX / MVP Guardrails

- Detailed UI/UX guardrails live in `03_review-meeting/ui-ux-decisions.md`.
- Phase 1 implementation should follow the staged epic plan in `09_phase-1-planning/phase-1-epic-plan.md` rather than trying to build the whole app in one pass.
- The end-user flow should prioritize a simple, shippable Phase 1: Excel upload, AI comments/demo script, consultant review, and separate demo document export.
- Phase 2 should remain an optional continuation and should only offer official-looking Master Data downloads after the import format has been validated against MES.
- Keep MVP scope discipline: Excel-first input, no hidden return to broad heterogeneous-document ingestion, and Settings/Templates treated as post-MVP unless needed for the first prototype.

## Contradictions / Outdated Scope

The biggest known contradiction is input scope:

- Current scope from Rui: Excel requirements file as primary input.
- Older-scope wording in MVP/strategy/PM materials: heterogeneous or unstructured customer documentation as input.
- Review Meeting still has some development-plan wording like `Document Ingestion`, but its product vision and Phase 1/2 slides clearly use customer requirements Excel.

Resolution for now:

- Treat Excel-driven scope as canonical.
- Preserve older-scope documents as background and architecture references.
- Flag any old-scope statements instead of mixing them into the live project definition.

## Open Questions

- Which separate document format should Phase 1 export first: Word/PDF, Markdown, Excel, or another format?
- Should Phase 1 also update the original Excel file's `Comment` column, or only show comments in-app and in the separate generated document?
- What exact capabilities does the MCP Server expose?
- What exact role should LibreChat have in the final system, if any, now that the product is expected to be a separate application?
- What is the expected review/approval loop for AI-generated comments, demo scripts, and Master Data?
- For Phase 2, what exact workbook/package structure is the smallest importable output for the enterprise/site/facility/area/resource slice?

## Fast Onboarding Checklist

Recommended path to get up to speed quickly:

1. Read `02_partner-conversation/rui-whatsapp-scope-message.md` first. This is the current scope anchor.
2. Read `docs/discovery/rui-answers-2026-04-14.md` for the latest answered implementation questions.
3. Read `02_partner-conversation/teams-client-thread-summary.md` for the partner timeline and Rui's Phase 2 advice.
4. Open `06_example-inputs/Customer X Functional Requirements (1).xlsx` and understand the requirement columns.
5. Read `03_review-meeting/Review Meeting (1).pdf` for the product vision, Phase 1/2 UX, and architecture.
6. Read `03_review-meeting/ui-ux-decisions.md` for the screen-by-screen app flow and locked UI/UX decisions.
7. Read `09_phase-1-planning/phase-1-epic-plan.md` before starting implementation, so Phase 1 is built in reviewable chunks.
8. Inspect `06_example-inputs/MasterData_CookieFactory .zip` at a high level to understand Phase 2 complexity.
9. Read `08_librechat-mcp-package/lgp2026-zip-notes.md` to understand the local LibreChat / MCP package without exposing secrets.
10. Read this `disocvery.md` file end to end.
11. Skim `05_pmr/PM_Report (2).pdf` for current project status and risks.
12. Skim `04_strategic-plan/Strategic_Plan.pdf` for business and strategy framing, but watch for legacy scope.
13. Use `98_archive/legacy-scope/Project Documentation_ AI-Guided MES Configuration Advisor (MVP) - Google Docs.pdf` only for architecture and historical context.
14. Explore the MES test environment after login, especially `Administration -> Master Data Package`.

## Missing Expected Sources

- Original/full Project Charter file
- Exported Teams or WhatsApp conversation record beyond pasted messages
- Any repository or implementation code, if it exists
