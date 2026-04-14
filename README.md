# Critical Manufacturing MES Demo Advisor

Excel-first MES demo advisor for the FEUP LGP project with Critical Manufacturing.

## Phase 1 Scope

Phase 1 starts from a customer requirements Excel file. The MVP will parse the `Requirements` sheet, let consultants review requirements, generate requirement-level comments explaining how Critical Manufacturing MES addresses them, generate step-by-step demo guidance, and export a separate demo document.

Phase 2 Master Data generation is intentionally out of scope for this baseline unless it is explicitly requested later.

## Getting Started

Use Node `20.19.0` and pnpm through Corepack:

```bash
corepack enable
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Scripts

- `pnpm dev`: start the local Next.js dev server
- `pnpm build`: create a production build
- `pnpm lint`: run ESLint
- `pnpm typecheck`: run TypeScript without emitting files
- `pnpm test`: run Vitest
- `pnpm format`: format supported text files with Prettier
- `pnpm format:check`: check formatting without rewriting files

## Project Docs

- `docs/discovery/project-context.md`: curated discovery context
- `docs/discovery/ui-ux-decisions.md`: review meeting UI/UX decisions
- `docs/discovery/rui-scope-message.md`: partner scope message
- `docs/discovery/teams-client-thread-summary.md`: partner conversation summary
- `docs/discovery/librechat-mcp-notes.md`: safe LibreChat/MCP package notes
- `docs/phase-1-epic-plan.md`: Phase 1 epic plan

## Fixture

The only committed Excel workbook is:

```text
fixtures/customer-x-functional-requirements.xlsx
```

Do not commit raw PDFs, ZIPs, archive folders, exported documents, uploads, local data, or additional partner workbooks without an explicit review.

## Epic 1 Parser Validation

The Excel parser lives in:

```text
src/lib/requirements/
```

It parses the `Requirements` sheet from the committed fixture, treats row 2 as the real header row, and preserves the original Excel row number as `sourceRowNumber`.

The existing Excel `Comment` column is mapped to `sourceComment`. Epic 1 does not generate AI output and does not create a `generatedComment` field.

Run the home-page validation summary with:

```bash
pnpm dev
```

Then open `http://localhost:3000` to see row, demo, MVP, and sample requirement data parsed from the fixture.

Run the parser tests with:

```bash
pnpm test
```

## Secret Safety

Do not commit `.env` files, MES passwords, ZIP passwords, Bedrock keys, AWS credentials, MCP credentials, or partner secrets. Keep AI credentials server-side only. Use `.env.example` for placeholder names and safe example values.
