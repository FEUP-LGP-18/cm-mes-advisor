# Phase 1 Hardening Smoke Checklist

Use this short checklist to verify the MVP flow without browser automation:

1. Start the app and confirm the review workspace opens on the committed Customer X fixture.
2. Upload a `.xlsx` workbook with a `Requirements` sheet and row 2 headers.
3. Confirm the app switches to the uploaded workbook source and shows the parsed rows.
4. Select one or more rows and generate mock drafts.
5. Approve the generated rows.
6. Open the Demo Script tab and confirm the grouped script is visible.
7. Download the Markdown demo document and confirm it contains traceability, comments, and grouped steps.
8. Restore the sample fixture source and confirm the saved fixture review state is preserved.

What is not covered here:

- Real Bedrock or MCP generation
- Exact click-by-click MES documentation lookup
- Optional PDF or Word export
- Phase 2 Master Data generation
- Workbook-copy Excel export, which remains a future follow-up
