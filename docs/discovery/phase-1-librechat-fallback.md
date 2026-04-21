# Phase 1 LibreChat Fallback

Date: 2026-04-20

## Summary

Use this runbook if Rui confirms that the intended short-term path is
LibreChat-first or if direct app-side Bedrock generation remains blocked.

The app stays the main product shell. LibreChat is only a grounding assistant
behind the scenes for a small curated set of rows.

## When To Use This Path

- Direct app-side generation is still blocked by partner credentials or policy.
- The team still needs a strong Phase 1 demo for the 7-row shortlist.
- The goal is to prove the workflow and the grounded reasoning, not to hide the
  current integration limitation.

## Workflow

1. Set `.env.local` to `GENERATION_MODE=real`, run `./start.sh` from the workspace root, and open LibreChat at `http://localhost:3080`.
2. Select the `rag` MCP server in LibreChat.
3. In the app, load the committed Customer X sample and stay focused on the 7-row shortlist from `phase-1-demo-readiness.md`.
4. For each shortlisted row, ask LibreChat a targeted documentation-grounded question using the template below.
5. Copy only grounded consultant-usable insights into the app review flow:
   - generated comment edits
   - likely module/screen wording
   - demo-step hints
   - caveats or workaround notes
6. Use the app to review, approve, assemble the script, and export Markdown.
7. During the demo, say clearly that direct integrated generation is pending partner-side access, but the app workflow and documentation-grounded reasoning are already proven.

## LibreChat Prompt Template

Use one prompt per shortlisted row:

```text
You are helping with a Critical Manufacturing MES demo-preparation workflow.

Requirement row:
- ID: <ID>
- Requirement: <Requirement description>
- L2 process: <L2 process>
- L3 process: <L3 process>
- Operation: <Operation>
- Workbook availability hint: <Availability CM / Description availability if useful>

Please answer using only documentation-grounded claims from the MCP-connected MES documentation.

I need:
1. A short explanation of how CM MES addresses this requirement
2. The most likely module, screen, or workflow area a consultant would show
3. A practical demo path with concrete actions if the docs support that level of detail
4. Any caveats, workaround language, or consultant-review notes if this is not a clean standard path

Do not guess. If the documentation is weak or indirect, say so clearly.
```

## Operator Rules

- Do not copy raw LibreChat output straight into the final deliverable without review.
- Treat LibreChat answers as grounded input for the app review experience, not as the final product surface.
- Prefer the app for the polished story: review queue, approvals, script assembly, and export.
- If LibreChat cannot ground the answer well, keep the row in consultant review rather than forcing it into the approved demo script.

## Success Criteria

- The audience experiences one coherent app-led Phase 1 workflow.
- LibreChat is visible only as supporting evidence, not as the product itself.
- The exported Markdown document still feels like the end product, even if some requirement-level content was refined with LibreChat assistance.
