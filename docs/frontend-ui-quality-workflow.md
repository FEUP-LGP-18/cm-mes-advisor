# Frontend UI Quality Workflow

Use this playbook for future Codex frontend tasks in this repo.

## 1. Start The Task The Right Way

- If the work changes a product surface, classify it first.
- State the user job and dominant action.
- For major UI work, write:
  - `Visual thesis`
  - `Content plan`
  - `Interaction thesis`

## 2. Choose The Right Skill

- Use `$app-flow-architect` before new flows, routed changes, or UX restructuring.
- Use `$frontend-premium-ui` for redesigns, polished product screens, or high-judgment UI work.
- Use `$mes-product-ui` for repo-specific consultant workflow surfaces.
- Use `$figma-implementation-rules` when the task includes a Figma file or frame.
- Use `$playwright-visual-qa` before signoff on rendering, layout, flow, or responsive work.

## 3. Give Better Inputs

If you want premium UI instead of generic UI, provide at least one of:

- a screenshot of the current screen
- a screenshot of a target quality bar
- a Figma frame link
- a clear user job and dominant action

Good prompt:

```text
Use $frontend-premium-ui and $mes-product-ui. Redesign the Phase 1 project home as a calm consultant command desk. Keep it queue-first, avoid card mosaics, and verify desktop plus mobile with Playwright before signoff.
```

## 4. Ask For State Coverage Explicitly

If the screen has multiple states, say so in the prompt.

Example:

```text
Cover empty, loading, error, blocked, and overflow states. If any state is not implemented, call it out instead of silently skipping it.
```

## 5. Use The Repo Scripts

- `./scripts/codex/dev.sh`: local frontend dev server
- `./scripts/codex/storybook.sh`: Storybook for isolated surfaces
- `./scripts/codex/lint.sh`
- `./scripts/codex/typecheck.sh`
- `./scripts/codex/test.sh`
- `./scripts/codex/e2e.sh`
- `./scripts/codex/review-ui.sh`: full quality sequence

## 6. Isolate Hard-To-Reach UI States

- Use Storybook when you want to inspect a surface in isolation.
- Use the shared Phase 1 fixture builders in `src/lib/phase1/ui-fixtures.ts` instead of copying inline mock data.
- Use Playwright seeding for real route-level smoke checks.

## 7. Verify Before Signoff

Minimum signoff loop:

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm build`
5. `pnpm storybook:build` when stories or shared surfaces changed
6. `pnpm test:e2e`
7. Desktop check
8. Mobile check

Do not stop at code inspection if the work is user-visible.

## 8. Review The Diff For Taste, Not Just Correctness

Ask:

- Is the dominant action obvious?
- Did the layout become clearer or just busier?
- Did we solve the surface as a whole instead of adding more chrome?
- Are we reusing tokens and shared patterns?
- Does the copy sound like product UI instead of marketing filler?

## 9. Decide If The Task Needs Flow Design First

Use `$app-flow-architect` first when:

- the task changes what the user does next
- the screen has multiple staged states
- there are capability or permission gates
- success, error, or blocked states matter as much as the default view

Skip flow design only when the task is clearly a small visual or implementation-only change.

## 10. Keep The Repo As The Source Of Truth

- Repo skills are the baseline, even if optional official skills are also available.
- Optional official complements currently visible in this environment include:
  - `frontend-skill`
  - `openai-docs`
  - Figma plugin skills such as `figma:figma-implement-design` and `figma:figma-use`
- Do not depend on global skills being installed for this repo to work correctly.
