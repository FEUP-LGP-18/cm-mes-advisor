# Phase 1 Hardening Smoke Checklist

Use this short checklist to verify the guided Phase 1 flow without browser automation:

1. Start the app and confirm the workspace opens on Step 1, `Source`, with a clear next-best-action header.
2. Confirm the committed Customer X fixture is visible, then continue to Step 2, `Generate`.
3. Generate drafts with the recommended `Demo rows` preset and confirm the app moves to Step 3, `Review`.
4. Review one generated requirement at a time, using `Approve and next`, `Needs review`, or `Skip row` without needing the expert table.
5. Open the expert requirements table only from its disclosure and confirm search, filters, row selection, and custom selected generation still work.
6. Continue to Step 4, `Script`, and confirm approved rows assemble into an editable demo script.
7. Continue to Step 5, `Export`, download the Markdown demo document, and confirm it contains traceability, comments, and grouped steps.
8. Upload a valid `.xlsx` workbook with a `Requirements` sheet and row 2 headers, then confirm source-aware state stays separate from the fixture.
9. Restore the sample fixture source and confirm the saved fixture review state is preserved.

Visual QA gate:

1. Capture desktop screenshots for Source, Generate, Review, Script, and Export; each step should have one obvious primary action.
2. Capture mobile screenshots around `390px` wide and confirm there is no horizontal clipping, all primary actions are reachable, and the workflow rail/header stack cleanly.
3. Confirm `Prototype generation mode` or equivalent copy is visible and honest without making the product feel broken.
4. Check blocked states for no-generated-drafts, no-approved-rows, empty search, and invalid upload; each should state the exact next action.
5. Confirm the review table feels like an optional expert tool, not the default mental model.
6. Confirm the visual tone feels mature for Critical Manufacturing: restrained teal accents, no neon glow, no over-saturated "AI dashboard" styling, and enough polish for a client demo.

What is not covered here:

- Real Bedrock or MCP generation
- Exact click-by-click MES documentation lookup
- Optional PDF or Word export
- Phase 2 Master Data generation
- Workbook-copy Excel export, which remains a future follow-up
