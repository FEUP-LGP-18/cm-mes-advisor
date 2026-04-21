# Codex Frontend Setup On macOS

This guide separates what is already implemented in the repo from what you still need to do manually on your Mac.

## Implemented In This Repo

- Repo-level Codex guidance in [`AGENTS.md`](../AGENTS.md) and [`src/AGENTS.md`](../src/AGENTS.md)
- Repo skills in [`.agents/skills/`](../.agents/skills/)
- Repo-scoped Codex config in [`.codex/config.toml`](../.codex/config.toml)
- Stable Codex action scripts in [`scripts/codex/`](../scripts/codex/)
- Storybook setup in [`.storybook/`](../.storybook/)
- Playwright smoke and screenshot-oriented visual QA in [`tests/e2e/`](../tests/e2e/)
- Shared Phase 1 fixture builders in [`src/lib/phase1/ui-fixtures.ts`](../src/lib/phase1/ui-fixtures.ts)
- Design-system guidance in [`docs/design/phase1-design-system-guidelines.md`](./design/phase1-design-system-guidelines.md)

## Manual Steps On Your Mac

### 1. Install And Sign In To Codex

- Install the Codex app from the official OpenAI Codex docs and sign in with the account you use for Codex.
- If you also use the CLI, install it through the current official OpenAI Codex CLI docs and confirm `codex` is available in your shell.

Official docs index:

- [OpenAI Codex docs](https://developers.openai.com/)

### 2. Open The Repo Correctly

Open this exact project folder:

```text
/Users/mahmoudali/Documents/LGP project dicovery/cm-mes-advisor
```

If Codex asks whether to trust the project, mark it trusted so repo-scoped `.codex/` config is applied.

### 3. Know Your Config Paths

Repo config:

```text
/Users/mahmoudali/Documents/LGP project dicovery/cm-mes-advisor/.codex/config.toml
```

User config:

```text
~/.codex/config.toml
```

Repo skills:

```text
/Users/mahmoudali/Documents/LGP project dicovery/cm-mes-advisor/.agents/skills
```

### 4. Configure Codex App Local Environments

Per current OpenAI docs, local environments are configured in the Codex app settings UI and the generated config is stored under `.codex/`.

Set the macOS setup script to:

```bash
./scripts/codex/setup-worktree.sh
```

Add project actions for:

- `Dev`: `./scripts/codex/dev.sh`
- `Storybook`: `./scripts/codex/storybook.sh`
- `Lint`: `./scripts/codex/lint.sh`
- `Typecheck`: `./scripts/codex/typecheck.sh`
- `Test`: `./scripts/codex/test.sh`
- `E2E`: `./scripts/codex/e2e.sh`
- `Review UI`: `./scripts/codex/review-ui.sh`

This repo intentionally does not hand-author the generated local-environment files.

### 5. First Local Setup

From the repo root:

```bash
corepack enable
pnpm install
```

If you plan to run Playwright locally for the first time, also run:

```bash
pnpm exec playwright install chromium
```

### 6. Use The Right Runtime Entry Point

- For normal frontend work: `./scripts/codex/dev.sh`
- For the full archived partner stack: run `../start.sh` from the workspace root one level above this repo

## Optional But Recommended

- Keep a user-level `~/.codex/config.toml` for your personal defaults and MCP servers that should apply across repos.
- Use the repo’s optional complementary official skills when available:
  - `frontend-skill`
  - `openai-docs`
  - `figma:figma-implement-design`
  - `figma:figma-use`
- Add the Figma MCP server only if you actually work from Figma. See [`docs/codex-figma-mcp.md`](./codex-figma-mcp.md).

## Daily Workflow

1. Start the app with `./scripts/codex/dev.sh`.
2. For isolated UI state work, run `./scripts/codex/storybook.sh`.
3. Ask Codex to use the repo skills explicitly when the task is high-judgment.
4. Before signoff, run `./scripts/codex/review-ui.sh`.

## Example Prompts

```text
Use $frontend-premium-ui and $mes-product-ui. Redesign the Phase 1 project home as a calm consultant command desk. Keep it queue-first, not card-first, and verify desktop plus mobile before signoff.
```

```text
Use $figma-implementation-rules. Implement this exact Figma frame in the repo’s existing Phase 1 style system, reuse current tokens and shell patterns, and document any mismatch between the design and the codebase.
```

```text
Use $frontend-premium-ui. Tighten spacing, typography, and hierarchy on the review surface without changing the product flow. Keep copy operational and reduce decorative chrome.
```

```text
Use $playwright-visual-qa. Check the project home, generate, and review surfaces on desktop and mobile, capture screenshots, and fix any layout or hierarchy issues you find.
```

```text
Use $app-flow-architect before coding. Rework the generate-to-review transition so the next action is clearer, then implement it and run the full repo UI review sequence.
```

## Reference Docs

- [Local environments](https://developers.openai.com/codex/app/local-environments)
- [Config basics](https://developers.openai.com/codex/config-basic)
- [Config reference](https://developers.openai.com/codex/config-reference)
- [AGENTS.md guide](https://developers.openai.com/codex/guides/agents-md)
- [Skills](https://developers.openai.com/codex/skills)
