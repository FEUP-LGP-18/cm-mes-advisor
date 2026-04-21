# Codex UI Benchmark Pack

Use this benchmark pack to compare Codex UI performance across prompts, skills, or model settings.

As of `2026-04-20`, the default local baseline is:

- model: `gpt-5.4`
- reasoning: `xhigh`

The comparison candidate is:

- model: `gpt-5.2-codex`
- reasoning: `xhigh`

Do not switch the default model unless the candidate wins at least 4 of 5 tasks with a clear quality advantage.

## Evaluation Protocol

For each task:

1. Start from the same repo state.
2. Give the task prompt with the same constraints.
3. Require the agent to explain UX rationale before editing.
4. Require desktop and mobile verification before signoff.
5. Score the result using the rubric below.

## Scoring Rubric

Score each dimension from `1` to `5`.

- `Task-flow clarity`
- `Visual hierarchy`
- `Consistency with existing codebase`
- `Copy quality`
- `Mobile fit`
- `State coverage`
- `Overall polish`

### Pass Threshold

- A task passes if no dimension is below `3` and `Overall polish` is at least `4`.
- The whole system passes if at least `4` of `5` tasks pass.

## Benchmark Tasks

### 1. Existing Screen Polish

- Surface: local project home / main shell
- Source: `src/app/page.tsx`, `src/components/phase1/project-home.tsx`
- Prompt shape: refine the local project home so it feels like a credible consultant workspace entry instead of a promo-style intro
- What to watch:
  - brand hierarchy
  - shell coherence
  - usefulness of chips/badges
  - whether the page reads like a product surface instead of a landing page

### 2. Data-Dense Workspace

- Surface: requirements review workspace
- Source: `src/app/projects/[projectId]/review/page.tsx`, `src/components/phase1/step-route.tsx`, `src/app/requirements-review-workspace.tsx`
- Prompt shape: improve the review workspace so a consultant can scan, decide, and act faster without adding fake dashboard chrome
- What to watch:
  - density vs readability
  - table-detail balance
  - action hierarchy
  - restraint on cards and status styling

### 3. Wizard or Upload Step

- Surface: source confirmation / upload step
- Source: `src/app/projects/[projectId]/source/page.tsx`, `src/components/phase1/step-route.tsx`, `src/app/requirements-review-workspace.tsx`
- Prompt shape: refine the source step so workbook validation, replacement, and continuation feel explicit and trustworthy
- What to watch:
  - progress clarity
  - grouping of controls
  - validation and processing states
  - honesty about Excel-first scope

### 4. Empty or Onboarding State

- Surface: first-use project home
- Source: `src/app/page.tsx`, `src/components/phase1/project-home.tsx`
- Prompt shape: improve the empty project state so the first useful action is obvious without relying on generic SaaS filler
- What to watch:
  - orientation speed
  - quality of first-action guidance
  - utility of supporting copy
  - visual restraint

### 5. Entry or Overview Surface

- Surface: project home overview or workflow shell intro
- Source: `src/components/phase1/project-home.tsx`, `src/components/phase1/project-shell.tsx`
- Prompt shape: make the entry and shell feel sharp and memorable while staying aligned with a consultant-facing product
- What to watch:
  - whether the result is memorable without breaking product credibility
  - whether brand and purpose are clear in the first viewport
  - whether it still belongs to the same application

## Recording Template

Use one block per task:

```md
### Task N: [name]

- Model:
- Prompt:
- UX rationale stated before editing: yes/no
- Desktop verified: yes/no
- Mobile verified: yes/no
- Task-flow clarity:
- Visual hierarchy:
- Consistency with existing codebase:
- Copy quality:
- Mobile fit:
- State coverage:
- Overall polish:
- Notes:
```

## Acceptance Criteria

Accept the setup only if all of the following are true:

- The agent explains UX rationale before editing on every benchmark task.
- The agent verifies desktop and mobile for every UI-changing task.
- At least `4` of `5` tasks pass.
- The outputs improve whole surfaces and workflows instead of producing scattered local tweaks.
