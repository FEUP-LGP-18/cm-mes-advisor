---
name: frontend-premium-ui
description: Use for redesigns, new product pages, major screen work, polished flows, or any frontend task in this repo where visual quality materially affects the outcome. Trigger for consultant-facing product surfaces, responsive pages, major layout refactors, or premium UI polish. Do not use for backend-only work, trivial copy fixes, or non-visual implementation tasks with no meaningful UX choices.
---

# Frontend Premium UI

Use this skill when the task needs production-grade visual quality, not just functional UI.

## Required Before Coding

State these in concise bullets before implementation:

1. `Surface type`
2. `User job`
3. `Dominant action`
4. `Layout pattern`
5. `Visual thesis`
6. `Content plan`
7. `Interaction thesis`
8. `State coverage`

## Working Rules

- Start with composition and hierarchy before component churn.
- Prefer one coherent surface pass over scattered style edits.
- Default to calm, utility-first product UI for this repo.
- Reuse existing Phase 1 shell patterns, shared classes, and tokens before adding new local styles.
- Use cards only when the card itself is the interaction or grouping unit.
- Avoid dashboard-card mosaics, ornamental KPI strips, and generic “AI premium” styling.
- Use few colors and one clear accent unless the existing screen already justifies more.
- Treat spacing, hierarchy, typography, and state clarity as the main tools for quality.

## State And Responsiveness

- Cover empty, loading, error, blocked, and overflow states when they are relevant.
- Ensure desktop and mobile both preserve the dominant action and task hierarchy.
- For task-heavy mobile screens, keep task content ahead of navigation chrome.

## Stop Conditions

- If the requested work is really a flow problem, use `$app-flow-architect` first.
- If the task is implementing from Figma, pair this with `$figma-implementation-rules`.
- Do not claim polish or readiness without `$playwright-visual-qa` or equivalent browser evidence.
