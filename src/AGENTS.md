# Frontend Rules For `src/`

These rules narrow the root `AGENTS.md` guidance for the Phase 1 product code in `src/`.

## Scope

- Treat `src/app/projects/[projectId]/`, `src/components/phase1/`, `src/lib/phase1/`, and `src/lib/requirements/` as the main consultant-facing product surface.
- The work unit is the `project`, not a single oversized workbook page.
- Preserve the routed Phase 1 flow: `source -> generate -> review -> script -> export`.
- Treat the routed `master-data/*` subtree as the optional Phase 2 continuation rather than as extra Phase 1 steps.
- Prefer shared shell, routed step, and queue/detail patterns over pushing everything back into one monolithic screen.

## UI Expectations

- Default every surface here to `product workspace` behavior unless the route clearly functions as `wizard/form` or `empty/onboarding`.
- Keep one dominant action per screen and make secondary actions visibly subordinate.
- For major UI work in this subtree, state:
  - `Visual thesis`
  - `Content plan`
  - `Interaction thesis`
- On review surfaces, the queue, current artifact, and decision controls must outrank summary chrome.
- On source and generate surfaces, trust should come from clarity, validation, and next-step confidence, not decoration.
- Keep copy calm, operational, and honest about mock-mode versus real-mode limitations.
- Reuse tokens and shared Phase 1 surface classes before inventing new local styles.

## Do Not

- Do not imply that Phase 2 is the default finish line for every project, or that broad document ingestion or direct LibreChat UI is part of the default shipped scope.
- Do not let workflow chrome outrank the current task.
- Do not repeat the same instruction across the title, intro, and support regions.
- Do not call meaningful UI work in this subtree ready without browser evidence.

## Verification

- Material UI work here is `NEEDS WORK` until desktop, mobile, and one key interaction path are verified.
- Compare the rendered result to the requested UX outcome before signoff.
- Use `$playwright-visual-qa` for rendering, layout, flow, and responsive verification when this subtree changes materially.
