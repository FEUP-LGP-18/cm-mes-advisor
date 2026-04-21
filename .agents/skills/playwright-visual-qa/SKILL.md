---
name: playwright-visual-qa
description: Use whenever frontend changes affect rendering, layout, workflows, responsiveness, or visual states in this repo. Trigger for UI signoff, responsive QA, screenshot capture, flow verification, or before claiming a consultant-facing surface is ready. Do not use for backend-only changes or purely static refactors that do not affect rendered output.
---

# Playwright Visual QA

Use this skill to turn UI verification into a repeatable repo workflow.

## Verification Sequence

1. Reuse an active dev server when available.
2. If none exists, run the repo script that starts the expected frontend server for QA.
3. Exercise the real consultant-facing surface in Playwright, not just isolated utility code.
4. Check desktop and mobile viewports.
5. Capture screenshots for the important states you touched.
6. Verify one critical interaction path when the surface is interactive.
7. Record issues clearly and rerun after fixes.

## Required Checks

- Initial render has no obvious error overlay.
- Desktop layout remains coherent and task-first.
- Mobile layout fits without clipped content or unusable controls.
- The dominant action is visible and correctly prioritized.
- Empty, loading, error, and blocked states are checked when relevant.
- Overflow, sticky regions, and navigation chrome do not hide the current task.
- Copy and state messaging match the actual workflow status.

## Repo Workflow

- Prefer `pnpm test:e2e` for the standard suite.
- Prefer `./scripts/codex/e2e.sh` or `./scripts/codex/review-ui.sh` when driving the repo from Codex actions.
- Store screenshot artifacts through Playwright outputs instead of ad hoc manual captures.
- If a state is hard to reach, seed it with the shared Phase 1 UI fixtures instead of duplicating mock data.

## Output Rules

- Say what was verified.
- Say what failed or still needs attention.
- Say what was not verified if the route or state was unavailable.
- Do not say a UI is polished or ready without evidence.
