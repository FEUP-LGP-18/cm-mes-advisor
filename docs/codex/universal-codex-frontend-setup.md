# Universal Codex Frontend Setup Playbook

## What this setup is for

Use this setup if you want Codex on macOS to produce better frontend, UI, and UX work across different repositories without depending on Figma.

This is not a magic prompt. The quality comes from the stack:

`model + AGENTS.md + skills + repo instructions + browser verification + better task framing`

Keep this setup small and opinionated. Do not bulk-install large multi-persona libraries into Codex and expect better UI taste. Large agent libraries are better used as pattern libraries: extract the few reusable rules that matter, then fold them into `AGENTS.md` or a small number of narrow Codex skills.

The goal is simple:

- make Codex think in whole surfaces instead of random micro-tweaks
- make it behave consistently across projects
- make signoff depend on rendered evidence, not code alone

## What this setup installs and why

This setup adds six layers:

1. A strong default model and reasoning level in `~/.codex/config.toml`
2. A global `~/.codex/AGENTS.md` that teaches Codex how to approach frontend work
3. User-level skills in `~/.agents/skills`
4. The OpenAI Docs MCP server for current Codex/OpenAI guidance
5. Browser-first verification so Codex sees the rendered UI
6. A repeatable per-project bootstrap routine so the same machine setup adapts to new repos

As of April 21, 2026, the official docs describe [GPT-5.4](https://developers.openai.com/api/docs/models/gpt-5.4/) as OpenAI's frontier model for complex professional, agentic, and coding work, and [GPT-5.3-Codex](https://developers.openai.com/api/docs/models/gpt-5.3-codex) as the most capable Codex-specific agentic coding model. That is why this setup uses `gpt-5.4` first, with Codex-model fallbacks only if access or client support requires it.

## One-time machine setup

Do these steps once on the Mac that will run Codex.

1. Create the base directories.

```bash
mkdir -p ~/.codex ~/.agents/skills
```

2. Create `~/.codex/config.toml`.
3. Create `~/.codex/AGENTS.md`.
4. Use `~/.agents/skills` as the canonical user skill location.
5. Restart Codex after skill changes if the new skills do not appear.

Compatibility fallback:

- If an older Codex build does not detect `~/.agents/skills`, do not replace `~/.codex/skills` because that directory may already contain built-in system skills.
- Instead, symlink or mirror individual user skill folders into `~/.codex/skills` after you create them.

## Global Codex configuration

Put this in `~/.codex/config.toml`:

```toml
model = "gpt-5.4"
model_reasoning_effort = "xhigh"

[mcp_servers.openaiDeveloperDocs]
url = "https://developers.openai.com/mcp"

[plugins."vercel@openai-curated"]
enabled = true

[plugins."github@openai-curated"]
enabled = true
```

Use these defaults:

- `gpt-5.4` is the recommended default because it is OpenAI's frontier model for agentic, coding, and professional workflows and it matched the best validated results in this setup.
- If the account or client cannot use `gpt-5.4`, use the newest available Codex-optimized coding model with `high` or `xhigh` reasoning. As of April 21, 2026, that means preferring `gpt-5.3-codex`, then `gpt-5.2-codex`.
- Keep `vercel@openai-curated` enabled even if the project is not deployed on Vercel. The reason is browser verification, not hosting.
- Keep `github@openai-curated` enabled because it helps with repo work, but it is secondary to the frontend stack.

## Global frontend instructions

Create `~/.codex/AGENTS.md` with this template:

```md
# Global Codex Working Agreements

## Frontend and UI

- If a task changes a user-visible surface, classify it before editing: `product workspace`, `wizard/form`, `settings/admin`, `landing/marketing`, or `empty/onboarding`.
- State the user job and the dominant action before making changes.
- For major UI work, choose the layout pattern before local styling decisions.
- Prefer one coherent surface-level pass over scattered micro-tweaks.
- If no design source is provided, derive the design direction from the product type, existing system, and neighboring screens instead of inventing a new visual language.
- For substantial UI work, use `$ui-surface-planner` first. For visually led or high-polish work, also use `$frontend-skill`.

## Product-UI Defaults

- Default to calm, utility-first product surfaces for workspaces, review tools, tables, forms, and settings.
- Use layout, typography, spacing, and state clarity before adding decoration.
- Use cards only when the card itself is the interaction or grouping primitive.
- Keep copy operational and scannable on product screens. Avoid homepage-style language unless the screen is actually promotional.
- Playful or expressive UI is allowed on marketing or brand surfaces, or when it is purposeful, accessible, and improves clarity or confidence. Do not use it as ambient decoration on routine product UI.

## Anti-Patterns

- Do not solve product UI with generic card mosaics.
- Do not add decorative gradients or hero-style treatment to routine workspaces, forms, tables, or settings.
- Do not introduce extra accent colors unless the existing system already supports them.
- Do not call UI work done without visual verification.

## Verification

- After meaningful UI changes, verify desktop and mobile before signoff.
- If a dev server is available, use the browser verification workflow rather than relying on static code inspection.
- Compare the requested outcome against the rendered result before signoff.
- Check empty, loading, error, and overflow states when they are relevant to the surface being changed.
- Do not describe user-visible work as polished, ready, or production-ready without browser evidence.
- Use `$ui-quality-gate` before final signoff on material UI changes.

## OpenAI and Codex Guidance

- Use the OpenAI developer documentation MCP server for Codex, OpenAI API, ChatGPT, or agent-platform questions.
```

Why this matters:

- The official [AGENTS.md guide](https://developers.openai.com/codex/guides/agents-md) supports layered instructions: global guidance, repo-level guidance, and more local overrides near specialized work.
- The real win is stopping Codex from improvising a new UX philosophy on every task.
- The official [best-practices guide](https://developers.openai.com/codex/learn/best-practices) explicitly recommends treating Codex like a teammate you configure over time, not a one-off assistant.

## User skills to install

Install only the skills that actually move frontend quality.

Install first:

- `frontend-skill`
- `openai-docs` if it is not already visible in the skill list

Why these two:

- `frontend-skill` improves visual composition and helps prevent the generic card-heavy UI that coding agents often drift into.
- `openai-docs` pairs well with the OpenAI Docs MCP server and keeps Codex/OpenAI guidance grounded in current official docs.

Do not start by installing a big pile of generic skills. More skills do not automatically mean better taste, and large overlapping persona packs usually make routing noisier rather than smarter.

Install commands:

```text
$skill-installer frontend-skill
```

If `openai-docs` does not already show up in `/skills`, install it too:

```text
$skill-installer openai-docs
```

Notes:

- In some Codex builds, `openai-docs` is already available as a system skill. If it is already present, do not install a duplicate.
- As of this validated setup, both `frontend-skill` and `openai-docs` appear in the installer catalog.
- Restart Codex if a newly installed skill does not appear.

## Custom skills to create

Create only two custom user skills:

1. `ui-surface-planner`
2. `ui-quality-gate`

These skills are narrow on purpose. The official [skills docs](https://developers.openai.com/codex/skills) state that implicit invocation depends on the skill `description`, so narrow descriptions with clear boundaries trigger more reliably than broad, vague skills.

Create the folders:

```bash
mkdir -p ~/.agents/skills/ui-surface-planner/agents
mkdir -p ~/.agents/skills/ui-quality-gate/agents
```

### `ui-surface-planner`

Folder:

```text
~/.agents/skills/ui-surface-planner
```

Purpose:

- run before meaningful UI edits
- force surface classification, UX intent, and scope definition
- stop random micro-tweaks before they start

Why it stays narrow:

- it only handles planning for user-visible screen work
- it does not try to be a generic frontend skill
- that narrowness improves implicit triggering and keeps the instructions small

`~/.agents/skills/ui-surface-planner/SKILL.md`

```md
---
name: ui-surface-planner
description: Use when a task involves frontend, UI, UX, polish, redesign, layout, dashboard, screen, or page work that changes a user-visible surface. Trigger before substantial UI edits so Codex classifies the surface, states the user job, chooses a layout pattern, forms a visual thesis, sets UX success criteria, and reframes the work into one coherent surface-level change. Do not use for backend-only tasks, tiny non-visual fixes, or pure implementation tasks with no UX decisions.
---

# UI Surface Planner

Run this skill before making meaningful UI changes.

## Required Pre-Edit Output

Before editing, state these eight items in concise prose or bullets:

1. `Surface type` — `product workspace`, `wizard/form`, `settings/admin`, `landing/marketing`, or `empty/onboarding`
2. `User job` — what the user is trying to accomplish on this screen
3. `Dominant action` — the main action the screen should make obvious
4. `Layout pattern` — the best-fit archetype for the surface, such as `table-detail`, `queue-detail`, `editor-detail`, `progress rail`, `guided form`, `settings list`, `hero-led marketing`, or `empty/onboarding`
5. `Current friction` — what is visually or behaviorally wrong today
6. `Visual thesis` — one sentence on mood, density, hierarchy, and restraint
7. `Success criteria` — what must feel better after the change
8. `Edit scope` — the single coherent surface or flow you will improve

## Planning Rules

- Reframe vague UI requests into hierarchy, flow, density, copy, and affordance improvements.
- Prefer fixing a whole surface pattern over nudging isolated padding, color, or border values.
- If there is no design source, infer from existing product context and adjacent screens.
- For new screens or major reworks, decide the layout archetype and component hierarchy before visual polish.
- For product UI, default to calm, structured, utility-first layouts.
- Treat the first pass as a product-design decision, not a style pass.

## Product-Surface Defaults

- `product workspace`: clarity, scanning, density control, obvious primary action
- `wizard/form`: progression, field grouping, error prevention, next-step confidence
- `settings/admin`: plain language, strong labeling, low ornament, safe actions
- `landing/marketing`: one dominant visual idea, short copy, strong hierarchy
- `empty/onboarding`: orientation, first action, reassurance, no decorative filler

## Stop Conditions

- If you cannot explain the user job or dominant action, inspect more context before editing.
- If the work is only a bug fix with no meaningful UX choice, skip this skill and implement directly.
```

`~/.agents/skills/ui-surface-planner/agents/openai.yaml`

```yaml
interface:
  display_name: "UI Surface Planner"
  short_description: "Plan the surface and layout before editing UI"
  default_prompt: "Use $ui-surface-planner to classify the surface, choose the layout pattern, define the user job, and set success criteria before editing."
```

### `ui-quality-gate`

Folder:

```text
~/.agents/skills/ui-quality-gate
```

Purpose:

- run before signoff on meaningful UI work
- require rendered evidence on desktop and mobile
- block unsupported “looks good” claims

Why it stays narrow:

- it is only a signoff gate
- it does not plan or redesign the UI
- that narrowness makes it much more likely to trigger at the right time

`~/.agents/skills/ui-quality-gate/SKILL.md`

```md
---
name: ui-quality-gate
description: Use after meaningful UI changes or when the user asks whether a screen is polished, ready, verified, or actually good. Trigger on frontend signoff, UI QA, polish checks, or before claiming completion of a user-visible screen change. It requires browser-based desktop and mobile verification when a dev server is available, checks hierarchy, copy, states, overflow, accessibility basics, and spec alignment, and blocks signoff until readiness, issues, and unverified areas are stated explicitly.
---

# UI Quality Gate

This skill is a signoff gate for user-visible UI work.

## Verification Order

1. Reuse an active dev server when available. If none exists, say that full visual verification could not be completed.
2. Run the built-in browser workflow:
   - use `vercel:agent-browser-verify` for the initial page-load gut check
   - use `vercel:agent-browser` for desktop and mobile spot checks
3. Inspect the edited surface in desktop and mobile sizes.
4. For interactive surfaces, verify at least one critical interaction path, not just the initial render.
5. Check state coverage and usability basics.
6. Compare the rendered result against the task goal or requested outcome.
7. Only then summarize outcomes.

## Required Checks

- Desktop render is functional and visually coherent.
- Mobile render fits without broken layout, clipped content, or unusable controls.
- No obvious error overlay or console-error state is visible.
- For interactive surfaces, at least one critical interaction path is verified.
- Visual hierarchy is clear: main action, supporting context, and secondary actions scan correctly.
- Copy matches the surface type and avoids vague or promotional filler on product UI.
- Relevant empty, loading, error, and overflow states are verified or explicitly marked unverified.
- Focus visibility, tap targets, and obvious affordance issues are checked at a basic level.
- The rendered result is checked against the requested outcome, not just the code diff.

## Signoff Rules

- Default readiness is skeptical; do not assume the surface is ready.
- Do not say a UI \"looks good\" without evidence from browser verification.
- If verification is partial, say exactly what was and was not checked.
- If the surface still has blocking problems, list them first and do not present the work as complete.
- If the screen changed materially, summarize the UX effect, not just the code changes.
- A report with no issues must still cite the evidence used and should be rare.

## Output Contract

Use this shape in the final verification note:

- `Readiness`: `READY`, `NEEDS WORK`, or `NOT VERIFIED`
- `Verified`: what was checked successfully
- `Issues`: blocking or notable issues, if any
- `Spec check`: how the rendered result compares to the requested outcome
- `Not verified`: anything skipped because the route, state, or server was unavailable

Apply readiness exactly this way:

- If any required check is skipped, `Readiness` must be `NOT VERIFIED`.
- If any blocking or notable issue remains, `Readiness` must be `NEEDS WORK`.
- Use `READY` only when desktop, mobile, and relevant states or interactions are evidence-backed and no meaningful issue remains.
```

`~/.agents/skills/ui-quality-gate/agents/openai.yaml`

```yaml
interface:
  display_name: "UI Quality Gate"
  short_description: "Evidence-first UI signoff with readiness checks"
  default_prompt: "Use $ui-quality-gate to verify desktop and mobile, check one critical interaction, compare the result to the request, and report readiness with issues or unverified areas."
```

Compatibility fallback for older Codex builds:

```bash
mkdir -p ~/.codex/skills
ln -sfn ~/.agents/skills/ui-surface-planner ~/.codex/skills/ui-surface-planner
ln -sfn ~/.agents/skills/ui-quality-gate ~/.codex/skills/ui-quality-gate
ln -sfn ~/.agents/skills/frontend-skill ~/.codex/skills/frontend-skill
```

If `openai-docs` was installed as a user skill and an older build misses it too:

```bash
ln -sfn ~/.agents/skills/openai-docs ~/.codex/skills/openai-docs
```

## Per-project bootstrap checklist

Do this in every new repository.

1. Run `/init` or manually create a repo `AGENTS.md`.
2. Add a short frontend section that covers:
   - how to run the project
   - lint, test, and build commands
   - framework and design-system constraints
   - frontend done criteria
3. If the repo has major UI subtrees, add more local `AGENTS.md` files near those surfaces.
4. Add repo-local skills in `.agents/skills` only when the project has stable, repeated UI patterns.
5. Add a small `docs/design/agent-ui-canon.md` when the project needs a consistent product language.

Use this repo-level frontend checklist:

- classify the surface first
- choose the layout pattern before local styling decisions on major UI work
- use utility copy on product screens
- prefer coherent surface changes
- preserve the existing design system unless you are intentionally redesigning
- verify desktop and mobile
- verify one critical interaction path on interactive screens
- check empty, loading, error, and overflow states
- do not sign off without visual evidence

Use this as a starting repo snippet:

```md
## Frontend Workflow

- Run `pnpm dev` to start the app locally.
- Run `pnpm lint`, `pnpm test`, and `pnpm build` before signoff on material UI work.
- Preserve the current framework, routing model, and design system unless the task explicitly calls for structural changes.
- Classify the surface before editing, choose the layout pattern for major UI work, and prefer one coherent surface-level pass over isolated tweaks.
- Use utility copy on product screens.
- Verify desktop and mobile after meaningful UI changes.
- Verify one critical interaction path on interactive screens.
- Compare the requested outcome to the rendered result before signoff.
- Check empty, loading, error, and overflow states when relevant.
- Do not call UI work complete, polished, or ready without browser-based visual verification.
```

Create a repo-specific skill only after you notice repeated mistakes or repeated workflow patterns. Do not create a new repo skill as the first response to every new project.

## How to prompt Codex for frontend work

Use the official prompt structure from the [Codex best-practices guide](https://developers.openai.com/codex/learn/best-practices):

- `Goal`
- `Context`
- `Constraints`
- `Done when`

Use this default prompt template:

```md
Goal: Rework this screen as one coherent surface pass.

Context:
- Route: /your/route
- Relevant files: path/to/page.tsx, path/to/component.tsx, path/to/styles.css
- This is a `product workspace` / `wizard/form` / `settings/admin` / `landing/marketing` / `empty/onboarding`
- The current problem is: <brief issue>

Constraints:
- Preserve the existing design system unless the change clearly requires a redesign.
- Use calm, utility-first product UI unless this is explicitly a marketing surface.
- Explain the user job and dominant action before editing.
- Verify desktop and mobile before signoff.

Done when:
- The main action is obvious.
- The hierarchy is cleaner.
- The surface feels coherent instead of patched together.
- Browser verification is complete and any remaining issues are called out.
```

Use these prompting habits:

- Use Plan mode for complex UI and UX work.
- Include screenshots, route names, and reference files when possible.
- Ask for one coherent surface pass, not “polish everything.”
- For major UI work, ask Codex to choose the layout pattern before editing.
- Explicitly request browser verification if the change is user-visible.

Optional note for marketing or brand tasks:

- Deliberate delight is fine on marketing or brand surfaces, but it should still be purposeful, accessible, and subordinate to hierarchy and clarity.

Examples:

### Redesign a screen

```md
Goal: Rework the review screen into a calmer, more legible product workspace.

Context:
- Route: /reviews
- Files: src/app/reviews/page.tsx, src/components/reviews/*
- Current issue: it reads like a pile of cards and the main action is unclear.

Constraints:
- Keep the existing dark theme.
- Use utility copy, not homepage language.
- Keep the primary workspace, secondary context, and actions visually distinct.
- Use $ui-surface-planner before editing and $ui-quality-gate before signoff.

Done when:
- The main review task is obvious within five seconds.
- The layout feels like one workflow, not several unrelated panels.
- Desktop and mobile are both verified.
```

### Improve an existing surface

```md
Goal: Improve this settings screen without changing its underlying feature scope.

Context:
- Route: /settings/billing
- Files: src/app/settings/billing/page.tsx
- Current issue: the labels are weak, the hierarchy is flat, and the warnings are easy to miss.

Constraints:
- Preserve the existing component system.
- Prefer one coherent pass over many tiny tweaks.
- Validate empty, loading, error, and overflow states if relevant.

Done when:
- Information groups scan clearly.
- Risky actions feel intentional and safe.
- Browser verification is included in signoff.
```

### Refactor a large UI component

```md
Goal: Break this monolithic UI component into route, shell, and reusable primitives while improving the UX structure.

Context:
- Files: src/app/workspace/page.tsx, src/components/workspace/*
- Current issue: one file mixes page structure, workflow logic, and presentation, so the UI keeps drifting.

Constraints:
- Preserve behavior while clarifying the screen structure.
- Make the route responsible for data and orchestration, the shell responsible for page layout, and primitives responsible for repeated UI patterns.
- Verify the resulting screen in the browser before signoff.

Done when:
- The code structure matches the UX structure.
- The rendered page feels more coherent.
- The final note explains the UX effect, not just the file split.
```

Important anti-pattern:

- Do not stuff durable frontend rules into every prompt.
- Put durable rules into `AGENTS.md` and skills instead.
- The [best-practices guide](https://developers.openai.com/codex/learn/best-practices) explicitly warns against overloading prompts with durable rules instead of moving them into `AGENTS.md` or a skill.

## Required verification workflow

For meaningful UI work, browser verification is mandatory.

Primary path:

1. Reuse the active dev server.
2. Use the built-in browser verification workflow if the environment exposes it.
3. Prefer `vercel:agent-browser-verify` for the initial page-load check and `vercel:agent-browser` for desktop and mobile spot checks when those skills are available.
4. Check desktop and mobile.
5. For interactive screens, verify at least one critical interaction path.
6. Check hierarchy, copy, overflow, obvious console issues, and visible error overlays.
7. Check empty, loading, error, and overflow states when relevant.
8. Compare the rendered result to the requested outcome.
9. Only then allow signoff.

Fallback path:

- If built-in browser tooling is unavailable, use local Playwright CLI screenshots.

Example fallback commands on macOS:

```bash
npx playwright screenshot --channel chrome --viewport-size '1440,960' --wait-for-timeout 1500 --full-page http://localhost:3000/ /tmp/ui-desktop.png
npx playwright screenshot --channel chrome --viewport-size '390,844' --wait-for-timeout 1500 --full-page http://localhost:3000/ /tmp/ui-mobile.png
```

Treat this as a hard rule:

- frontend quality does not improve much if the agent never sees the rendered result
- browser verification is not optional for meaningful UI work

## How to tell if the setup is working

Run this validation checklist after setup.

### Core validation

1. Confirm the global instructions load:

```bash
codex --ask-for-approval never "Summarize the current instructions."
```

Expected result:

- Codex mentions the contents of `~/.codex/AGENTS.md`

2. Confirm the Docs MCP server is configured:

```bash
codex mcp list
```

Expected result:

- `openaiDeveloperDocs` appears

3. Confirm the skills are visible:

- Open `/skills` in Codex
- Confirm `frontend-skill`, `ui-surface-planner`, and `ui-quality-gate` appear
- If `openai-docs` exists in the environment, confirm it appears too

4. Confirm behavior, not just configuration:

- Codex starts classifying surfaces before meaningful UI edits
- Codex stops making isolated visual tweaks without rationale
- Codex verifies desktop and mobile before claiming UI work is done
- Repo-specific `AGENTS.md` guidance changes behavior when present

### Post-setup smoke test

Run these three tasks.

#### 1. Existing UI improvement

Ask Codex to improve one real app screen.

Expected behavior:

- it classifies the surface
- it states the user job
- it states the dominant action
- it chooses a layout pattern
- it defines one coherent edit scope before code changes

#### 2. New screen creation

Ask Codex to create a new workflow or onboarding screen.

Expected behavior:

- it behaves like `frontend-skill` is active
- the composition is stronger than default CRUD-card layouts
- it does not fall back to generic dashboard mosaics

#### 3. Signoff task

Ask Codex whether the screen is ready.

Expected behavior:

- it verifies the browser output
- it checks desktop and mobile
- it reports `Readiness`, `Issues`, `Spec check`, and `Not verified`
- it reports issues first if anything is off

Success means:

- the agent behaves consistently across projects
- UI prompts yield whole-surface improvements instead of random micro-tweaks
- signoff requires evidence
- repo-specific guidance changes behavior without rewriting the global setup

## Maintenance and troubleshooting

Maintenance rules:

- If Codex makes the same frontend mistake twice, update `AGENTS.md` or a skill instead of repeating yourself in prompts.
- Keep skills narrow. Split planning and signoff into separate skills, as done here.
- Add repo-specific rules only after real friction shows up.
- Restart Codex after editing `~/.codex/config.toml`, `~/.codex/AGENTS.md`, or skill files if the changes do not appear.
- Do not bulk install multi-persona libraries into Codex and expect better UI taste. Mine them for reusable rules, then fold the best ideas into a few narrow Codex skills.

Troubleshooting:

| Problem | What to do |
| --- | --- |
| Skill not appearing | Restart Codex, check that `name` and `description` exist in the skill frontmatter, and confirm the folder lives under `~/.agents/skills`. |
| Older build ignores `~/.agents/skills` | Symlink or mirror the individual user skill folders into `~/.codex/skills` without replacing the whole directory. |
| Codex ignores Docs MCP | Verify the MCP server config in `~/.codex/config.toml` and keep the explicit AGENTS instruction telling Codex to use the OpenAI Docs MCP server. |
| UI still looks generic | Tighten the repo `AGENTS.md`, add `docs/design/agent-ui-canon.md`, make verification mandatory, and reframe requests from “tweak this” to “rework this surface.” |
| Codex over-explains planning every turn | Move durable behavior into `AGENTS.md` and skills. Use Plan mode only for complex work, not every small task. |

## Sources

- [Custom instructions with AGENTS.md](https://developers.openai.com/codex/guides/agents-md)
- [Agent Skills](https://developers.openai.com/codex/skills)
- [Codex best practices](https://developers.openai.com/codex/learn/best-practices)
- [Docs MCP](https://developers.openai.com/learn/docs-mcp)
- [Codex Prompting Guide](https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide)
- [GPT-5.4 model reference](https://developers.openai.com/api/docs/models/gpt-5.4/)
- [GPT-5.3-Codex model reference](https://developers.openai.com/api/docs/models/gpt-5.3-codex)
- [GPT-5.2-Codex model reference](https://developers.openai.com/api/docs/models/gpt-5.2-codex)
- [Codex config reference](https://developers.openai.com/codex/config-reference#configtoml)
- [Prompt engineering guide: Coding and front-end sections](https://developers.openai.com/api/docs/guides/prompt-engineering#coding)
