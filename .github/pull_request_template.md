## Summary

- What changed:
- User job and dominant action for any UI work:
- Visual thesis / content plan / interaction thesis for major UI work:

## Testing

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `pnpm storybook:build`
- [ ] `pnpm test:e2e`
- [ ] `./scripts/codex/review-ui.sh`

## Screenshots

Add screenshots for UI changes, or write `Not applicable`.

## UI Verification

- [ ] Desktop checked
- [ ] Mobile checked
- [ ] Critical interaction path checked
- [ ] Empty / loading / error / overflow states checked or explicitly not applicable

## Scope And Secret Checklist

- [ ] Scope stays Excel-first for Phase 1
- [ ] Phase 2 Master Data generation was not added unless explicitly requested
- [ ] No `.env` files, passwords, Bedrock keys, AWS credentials, MES credentials, MCP credentials, or ZIP passwords were committed
- [ ] No raw PDFs, ZIP files, archive folders, generated exports, uploads, local data, or discovery workspace files were committed
- [ ] Any new Excel fixture was explicitly reviewed
