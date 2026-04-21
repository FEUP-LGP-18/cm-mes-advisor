# Frontend Rules For `src/`

- Treat `src/app/projects/[projectId]/`, `src/components/phase1/`, `src/lib/phase1/`, and `src/lib/requirements/` as the main Phase 1 product surface and workflow boundary.
- The unit of work is the `project`, not a single oversized workbook page.
- Preserve the routed flow: `source -> generate -> review -> script -> export`.
- Prefer shared shell and step-route patterns over pushing more logic back into one monolithic screen.
- Keep product copy calm, operational, and review-first. If a line sounds like marketing copy, rewrite it.
- Keep one dominant action per screen and make secondary actions visibly subordinate.
- For major UI work, choose the layout pattern before local styling decisions.
- On review screens, the queue, detail, and decision controls should dominate over decorative summary treatment.
- Mock mode is the safe default experience. Real mode should stay honest about missing config or external access blockers.
- Do not imply that Phase 2, broad document ingestion, or direct LibreChat UI is part of the current default product.
- If you change user-visible workflow, scope, or setup expectations, update the canonical docs in the same PR.
- Compare the requested outcome to the rendered result before signoff.
- Treat shell-first layouts as UX failures when the workflow chrome outranks the actual task.
- Treat conflicting step messaging or next-action language as a blocking UX issue.
- On mobile task-heavy screens, keep the current task ahead of navigation chrome.
- Do not repeat the same guidance across the page title, intro copy, and support cards.
- Material UI work in this subtree is `NEEDS WORK` until desktop, mobile, and the key interaction for that surface are verified.
- Do not call meaningful UI work in this subtree ready without browser evidence.
