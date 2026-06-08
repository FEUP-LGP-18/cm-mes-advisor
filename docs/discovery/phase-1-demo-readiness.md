# Phase 1 Demo Readiness

Date: 2026-04-20

## Summary

This is the canonical Phase 1 operator note for the client demo path while
direct Bedrock access is still pending partner confirmation.

The goal is not to cover all 29 demo rows at once. The goal is to make one
polished 7-row story feel complete from `Source` to `Export`, with 3 reserve
rows ready for workaround or consultant-review examples.

## Primary 7-Row Demo Set

| Row | ID | Requirement | Why it belongs in the main demo |
| --- | --- | --- | --- |
| 3 | `01.01` | UI supporting local language | Strong general-platform opener with an easy business explanation. |
| 4 | `01.02` | User rights management | Good security/governance example that feels credible to enterprise stakeholders. |
| 28 | `03.01` | Quick Product setup | Clear product-setup row that helps explain CM MES structure and speed of onboarding. |
| 59 | `05.01` | Production & material scheduling | Adds planning/scheduling coverage and broadens the demo beyond pure execution screens. |
| 72 | `06.04` | Operation tracing - SN - Batch - SN | Strong traceability story and one of the most important MES-flavored value points. |
| 91 | `07.21` | Enforced check lists | Gives a concrete execution/quality flow that should translate well into reviewable steps. |
| 95 | `07.25` | Packing into box | Good end-of-flow operational example and useful bridge into script/export value. |

## Reserve Edge-Case Rows

Use these only if the demo needs to show workaround or consultant-review
behavior.

| Row | ID | Requirement | Why it is reserve-only |
| --- | --- | --- | --- |
| 6 | `01.04` | Kiosk option | Useful sparse/custom-style case for consultant review and workaround phrasing. |
| 60 | `05.03` | Grouping of production orders | Strong example of extension/custom effort and review-safe wording. |
| 138 | `12.03` | Customer reporting product content | Good reporting-oriented row that should stay visibly review-oriented because of extension-package language. |

## Recommended Walkthrough Order

1. Load the committed Customer X sample.
2. Use the recommended `Demo rows` generation path.
3. Review the 7 target rows in this order: `01.01`, `01.02`, `03.01`, `05.01`, `06.04`, `07.21`, `07.25`.
4. Approve the strongest subset first. If one row is weak, leave it in review rather than forcing approval.
5. Open `Script` and confirm the approved rows assemble into a coherent narrative.
6. Open `Export` and download the Markdown deliverable.
7. Start the optional pilot Phase 2 demo from approved rows after the export moment, and keep MES import validation explicitly out of scope unless a manual partner import pass has happened.

## Output Quality Rubric

Judge each shortlisted row against these dimensions:

- `Comment quality`: 2-4 sentences, directly explains how CM MES addresses the requirement, avoids filler, avoids fake certainty, and sounds like consultant-facing output rather than raw model text.
- `Demo-step specificity`: 2-5 steps, action-oriented, names the module or screen when the evidence supports it, and makes it obvious what the consultant should do or show.
- `Workaround wording`: for partial, custom, or extension-driven rows, leads with the workable path, avoids blunt `not supported` language unless docs say it explicitly, and states when consultant confirmation is still needed.
- `Review safety`: weak-evidence rows visibly downgrade confidence and include a consultant-review warning instead of pretending certainty.
- `Traceability`: if references are present, they are relevant and non-fabricated; if references are absent, the output still stays honest and review-oriented.

## Release Acceptance For The Shortlist

- At least 5 of the 7 primary rows pass all rubric dimensions.
- No row contains fabricated MES behavior, fake documentation references, or made-up click paths.
- At least 1 row demonstrates safe consultant-review behavior for ambiguous, custom, or extension-driven output.
- Script assembly and Markdown export preserve approved comments, steps, warnings, and references cleanly.

## Notes For The Team

- The 7-row set is the default Phase 1 story.
- The 3 reserve rows exist to show the product behaves responsibly when the answer is not a clean standard path.
- Once Rui resolves the Bedrock access question, validate these 7 rows first before expanding to the full 29-row demo slice.
