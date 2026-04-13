<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# AI Agent Instructions

Before implementing product behavior, read:

- `docs/discovery/project-context.md`
- `docs/discovery/ui-ux-decisions.md`
- `docs/phase-1-epic-plan.md`

Keep the MVP Excel-first. Phase 1 starts from a customer requirements Excel file, supports human review, generates requirement-level MES comments, generates demo guidance, and exports a separate demo document.

Do not implement Phase 2 Master Data generation unless the user explicitly requests it. Do not build the product directly on top of LibreChat; treat LibreChat/MCP notes as context and support material only.

Keep AI credentials, Bedrock access, MCP access, MES credentials, and all partner secrets server-side only. Never expose them in browser code, logs, Markdown, exported documents, fixtures, or commits.

Preserve human-in-the-loop review for generated comments and demo guidance.

Before finalizing changes, run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
