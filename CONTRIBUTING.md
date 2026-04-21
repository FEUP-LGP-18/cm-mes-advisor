# Contributing

## Branches

Use small branches per epic or task. Prefer names like:

```text
feature/phase1-review-polish
fix/real-generation-error-state
docs/current-state-reset
```

## Pull Requests

- Keep PRs focused on one feature, bug, or documentation change.
- Include a short summary and the checks you ran.
- Add screenshots for UI changes.
- Link the relevant discovery or planning document when the change is based on project context.
- Treat the root `../start.sh` script as the default teammate and agent startup path when documenting or reviewing local setup changes.
- If the change affects setup, scope, workflow, or onboarding, update the canonical docs in the same PR:
  - `README.md`
  - `AGENTS.md`
  - `docs/discovery/project-context.md`
  - `docs/phase-1-epic-plan.md`
- Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before requesting review.

## Scope Rules

- Keep the MVP Excel-first.
- Treat the current product as project-based and route-based: `source -> generate -> review -> script -> export`.
- Do not implement Phase 2 Master Data generation unless it is explicitly requested.
- Do not build the product directly on top of LibreChat.
- Preserve consultant review before generated comments or demo guidance become final outputs.
- Keep mock mode as the default teammate-friendly path unless the task is specifically about real integration.

## Artifact And Secret Rules

- Do not commit `.env` files, passwords, Bedrock keys, AWS credentials, MES credentials, MCP credentials, ZIP passwords, or partner secrets.
- Do not commit raw PDFs, ZIP files, archive folders, generated exports, uploads, local data, or the discovery workspace.
- The only committed Excel fixture should be `fixtures/customer-x-functional-requirements.xlsx`.
