<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes. Read the relevant guide in `node_modules/next/dist/docs/` before writing framework-specific code and heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# CM MES Demo Advisor Agent Guide

Use this file as the repo-level source of truth for Codex work in `cm-mes-advisor/`.

## Repo Layout

- `src/app/`: Next.js App Router entrypoints, routed Phase 1 screens, shared app shell, and API routes.
- `src/components/phase1/`: consultant-facing Phase 1 surfaces and workflow components.
- `src/components/phase2/`: optional Phase 2 Master Data setup, process, review, export, and traceability surfaces.
- `src/lib/phase1/`: project registry, routing, workflow state, and shared UI fixture builders.
- `src/lib/master-data/`: Phase 2 domain logic, template loading, generation, export, and workflow helpers.
- `src/lib/requirements/`: parsing, review state, generation, export, and server boundaries.
- `fixtures/`: committed sample workbook used for onboarding and deterministic local QA.
- `docs/design/`: product UI canon, audits, and design-system guidance.
- `docs/discovery/`: current product context, scope notes, and partner validation history.
- `.agents/skills/`: repo-scoped Codex skills for premium UI, flow design, visual QA, and Figma-informed work.
- `.codex/`: repo-scoped Codex config only. Do not commit secrets or guessed local-environment schemas here.
- `scripts/codex/`: stable scripts for setup, dev, Storybook, linting, tests, Playwright, and full UI review.
- `tests/e2e/`: Playwright smoke and screenshot-oriented visual QA coverage.

## Product Truth

- Treat this as a consultant-facing MES workspace with a complete Phase 1 flow and an optional Phase 2 continuation, not a marketing site or executive dashboard.
- The project unit is the `project`, not one oversized workbook page.
- Preserve the routed flow: `source -> generate -> review -> script -> export`.
- Preserve Phase 2 as a separate optional subflow under `master-data/setup -> process -> review -> export -> traceability`.
- Keep Phase 1 Excel-first and human-reviewed.
- Do not imply that Phase 2 is mandatory to finish Phase 1, or that broader document ingestion or a LibreChat shell is part of the default shipped product.
- Keep Bedrock, AWS, MCP, MES, and partner credentials server-side only.

## Commands

Run commands from `/Users/mahmoudali/Documents/LGP project dicovery/cm-mes-advisor`.

- `pnpm dev`: repo-local Next.js dev server for frontend work.
- `../start.sh`: full local stack startup when the archived partner support stack is needed.
- `pnpm lint`: ESLint.
- `pnpm typecheck`: TypeScript no-emit typecheck.
- `pnpm test`: Vitest unit and surface tests.
- `pnpm build`: production build.
- `pnpm storybook`: Storybook dev server.
- `pnpm storybook:build`: Storybook static build.
- `pnpm test:e2e`: Playwright smoke and visual QA flow.
- `./scripts/codex/review-ui.sh`: full frontend quality sequence.

## Frontend Workflow

- Classify every user-visible task before editing: `product workspace`, `wizard/form`, `settings/admin`, `landing/marketing`, or `empty/onboarding`.
- State the user job and dominant action before substantial UI work.
- For major UI work, write these before implementation:
  - `Visual thesis`
  - `Content plan`
  - `Interaction thesis`
- Start with composition, hierarchy, and workflow clarity before local component or styling tweaks.
- Prefer one coherent surface-level pass over scattered micro-tweaks.
- Reuse existing Phase 1 shell patterns, tokens, and shared surface classes before creating new primitives.
- Use repo skills when they fit:
  - `$app-flow-architect` before new flows or major workflow changes
  - `$frontend-premium-ui` for premium redesigns, new screens, and visually led product work
  - `$mes-product-ui` for this repo’s product-specific consultant workflow surfaces
  - `$figma-implementation-rules` when coding from Figma or Figma MCP context
  - `$playwright-visual-qa` before signoff on rendering, layout, or responsive changes

## UI Hard Rules

- Default to calm, utility-first product surfaces.
- Start with composition, not components.
- Prefer one strong visual idea per section.
- Default to cardless layouts unless the card itself is the interaction or grouping primitive.
- Avoid dashboard-card mosaics unless the product truly is a dashboard.
- Favor typography, spacing, hierarchy, and calm surfaces over decorative effects.
- Use few colors and one clear accent by default.
- Avoid decorative gradients or hero treatment on routine product UI unless they solve a real UX problem.
- Reuse existing design tokens, CSS variables, and shared components before creating new ones.
- Do not invent ad hoc colors, shadows, radii, spacing, or motion curves.
- Keep copy operational and scannable on product screens. If a line sounds like marketing copy, rewrite it.
- Every important screen needs appropriate empty, loading, error, and overflow states.
- Mobile responsiveness is required, not optional.
- Preserve or improve keyboard/focus behavior for dialogs, menus, tabs, and similar controls.
- Treat shell-first layouts, nav-first mobile ordering on task-heavy screens, and repeated guidance chrome as blocking UX issues.

## Do Not

- Do not redesign the product around a new visual language when the existing system already supports the task.
- Do not create a second parallel design system.
- Do not add bloated abstraction layers or component dumps “for future flexibility.”
- Do not commit secrets, `.env` files, generated exports, uploads, local data, or raw partner artifacts.
- Do not describe real-mode partner workflows as validated unless the validation docs and repo state support that claim.
- Do not call meaningful UI work polished, production-ready, or complete without rendered evidence.

## Done Means

A frontend task is done only when all of the following are true:

- The requested surface or flow is implemented coherently, not as a pile of disconnected tweaks.
- Existing product truth, routed workflow, and scope boundaries still read honestly.
- Shared tokens and components were reused where possible, and any new surface styles are documented or obviously justified.
- Relevant empty, loading, error, and overflow states are covered or explicitly called out as not in scope.
- Mobile layout and the dominant action remain usable.
- Docs and agent guidance were updated if workflow, setup, or UI expectations changed.
- Verification evidence exists.

## Verification Sequence

For material frontend work, run this sequence in order:

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm build`
5. `pnpm storybook:build` when shared UI surfaces or stories changed
6. `pnpm test:e2e` for rendering, layout, flow, or responsiveness changes
7. Desktop responsive/visual check
8. Mobile responsive/visual check
9. Screenshot or browser inspection pass against the requested outcome

When a dev server is available, prefer browser verification over code inspection alone.

## PR And Review Expectations

- UI PRs must include screenshots or an explicit note explaining why screenshots are not applicable.
- Call out desktop and mobile verification explicitly.
- Mention whether `pnpm test:e2e` and `./scripts/codex/review-ui.sh` were run.
- Review findings should prioritize behavior regressions, UX regressions, missing states, accessibility regressions, and gaps in verification before style commentary.
- If setup, workflow, or onboarding changed, update the relevant docs in the same PR.
