---
name: app-flow-architect
description: Use before building new flows, major workflow changes, or meaningful product-UI restructuring in this repo. Trigger for routed step changes, decision-heavy screens, staged flows, onboarding, review workflows, or any task where happy path and edge-case behavior matter as much as the UI. Do not use for tiny local layout tweaks or backend-only implementation.
---

# App Flow Architect

Use this skill before building or restructuring a meaningful product flow.

## Map The Flow First

State these before implementation:

1. `User goal`
2. `Entry point`
3. `Happy path`
4. `Primary blockers`
5. `Permissions or capability gates`
6. `Loading states`
7. `Error states`
8. `Success state`
9. `Exit or continuation path`

## Repo-Specific Rules

- Preserve the honest Phase 1 flow: `source -> generate -> review -> script -> export`.
- Keep mock-mode and real-mode behavior explicit when capability gates differ.
- Prefer one clear next step per surface.
- Make review queues and decision points close to the artifact being evaluated.
- Do not hide a blocking workflow dependency behind visual polish.

## Flow Quality Checks

- The dominant action should match the user’s real next step.
- Copy must explain status, consequences, or required actions when the user is blocked.
- Empty states must orient the user and offer the first useful action.
- Error states must say what failed and what the user can do next.
- Success states must make continuation or completion obvious.

## When To Pair

- Pair with `$frontend-premium-ui` when the flow also needs high visual quality.
- Pair with `$playwright-visual-qa` before signoff on any shipped flow change.
