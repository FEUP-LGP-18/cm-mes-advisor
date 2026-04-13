# Contributing

## Branches

Use small branches per epic or task. Prefer names like:

```text
feature/epic-1-requirements-import
fix/ci-typecheck
docs/update-phase-1-notes
```

## Pull Requests

- Keep PRs focused on one epic, bug, or documentation change.
- Include a short summary and the checks you ran.
- Add screenshots for UI changes.
- Link the relevant discovery or planning document when the change is based on project context.
- Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before requesting review.

## Scope Rules

- Keep the MVP Excel-first.
- Do not implement Phase 2 Master Data generation unless it is explicitly requested.
- Do not build the product directly on top of LibreChat.
- Preserve consultant review before generated comments or demo guidance become final outputs.

## Artifact And Secret Rules

- Do not commit `.env` files, passwords, Bedrock keys, AWS credentials, MES credentials, MCP credentials, ZIP passwords, or partner secrets.
- Do not commit raw PDFs, ZIP files, archive folders, generated exports, uploads, local data, or the discovery workspace.
- The only committed Excel fixture should be `fixtures/customer-x-functional-requirements.xlsx`.
