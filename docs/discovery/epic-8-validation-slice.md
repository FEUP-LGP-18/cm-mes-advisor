# Epic 8 Validation Slice

Date: 2026-04-15

This note records a small review slice from the committed Customer X fixture so we can compare the Phase 1 mock output against Rui's guidance without expanding scope.

## Rows Inspected

| Excel row | Requirement ID | Fixture note | Expected review posture |
| --- | --- | --- | --- |
| 3 | 01.01 | UI supporting local language | Standard available, demo and MVP marked |
| 4 | 01.02 | User rights management | Standard available, demo and MVP marked |
| 5 | 01.03 | Working with customer SN without UID | Standard available, demo and MVP marked |
| 6 | 01.04 | Kiosk option | Configuration, demo and MVP marked |
| 17 | 02.11 | Automatic WH or AGV | Extension package, no demo/MVP mark |
| 43 | 03.22 | List material and process differences between 2 versions or 2 products | Configuration, no demo/MVP mark |
| 47 | 03.26 | Importing Gerber | Extension package, no demo/MVP mark |
| 59 | 05.01 | Production & material scheduling | Configuration, demo marked |

## What The Mock Output Does Well

- Standard and configuration rows usually produce readable consultant-facing comments.
- The demo steps are now closer to click-by-click MES wording, especially when the row looks like a standard configuration path.
- Partial or custom rows already lead with a workaround-first explanation instead of a hard refusal.
- Rows with weak support signals stay in consultant review and carry warnings rather than pretending to be final.

## Where The Mock Output Still Needs Care

- Extension-package rows can still sound generic because the mock generator does not have real MES documentation lookup.
- Some rows need a clearer screen name or navigation path than a pure heuristic can infer.
- Ambiguous rows should stay in consultant review until the callable MCP/HTTP contract is confirmed and traceable documentation lookup is available.

## What Should Wait For Real MCP / AI Lookup

- Exact MES screen names for ambiguous extension-package rows.
- Confirmation of whether a workaround is acceptable or whether the row should move to consultant review only.
- Any row that needs documentation traceability beyond the mock placeholder references.

