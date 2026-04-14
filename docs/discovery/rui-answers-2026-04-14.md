# Rui Answers - 2026-04-14

Status: current partner guidance.

## Phase 1 - Comments And Demo Script

- If a requirement is partially supported, the tool should suggest a workaround when possible.
- If no good workaround is possible, the requirement should be marked for consultant review.
- Rui said the team should avoid framing these as hard "limitations"; the safer product behavior is workaround-first, then review-needed.
- The ideal demo script is click-by-click MES guidance with exact screens, modules, and actions.
- Rui understands that click-by-click detail depends on available time and effort.
- MCP traceability is available through the MCP server Rui sent; including MES documentation traceability is useful if time allows.

Implementation implication:

- Phase 1 generated output should not hallucinate certainty. It should either explain the MES path, propose a workaround, or flag the row for review.
- Epic 4/5 generation contracts should include uncertainty/warnings and room for traceability references, even if traceability is not required in the first mock UI.

## Phase 2 - Master Data

- Phase 2 can be simplified by using requirements that clearly make sense for Master Data generation.
- The team may create simpler requirements to demonstrate the functionality.
- First object types should follow the MES hierarchy from top to bottom: enterprise, site, facility, area, resource.
- Ideally, material and product should also be supported if time allows.
- The minimum useful Phase 2 output is something that can be imported directly in MES and works.
- Generating DEE files is an end goal, but likely beyond project scope; treat it as a stretch goal.
- Naming conventions are flexible for now.
- When required Master Data fields are missing or uncertain, use defaults so the import works.

Implementation implication:

- Phase 2 should start with a small valid import path before trying to cover the full CookieFactory sample.
- The app should validate or clearly mark Master Data as draft before offering official-looking downloads.
- Missing-field handling should favor importable defaults over blocking the user during the first Phase 2 prototype.

## MCP Reminder

Rui specifically encouraged the team to use the MCP server for MES questions because it can provide information about MES entities and how they are organized.

Security note:

- This note intentionally does not include passwords, API keys, `.env` contents, or any credentials.
