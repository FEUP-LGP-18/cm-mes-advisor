# Phase 1 PR Shipping Note

Use this as the draft PR body for the current Phase 1 completion branch. Keep
it honest about the remaining partner-side blocker.

## Suggested Title

`Phase 1: grounded generation integration and demo-readiness hardening`

## Summary

This PR completes the app-side Phase 1 workflow around the existing guided UX:
Excel parsing, review, script assembly, export, and the real server-side
generation architecture for MCP-grounded Bedrock drafts.

It also adds the final operator notes needed to validate and demo Phase 1
quickly once the partner confirms the intended direct credential path.

## What Works

- Excel-first Phase 1 workflow in the app
- Guided review UX
- Script assembly and Markdown export
- Real server-side generation architecture
- MCP documentation lookup integration
- Bedrock client integration, including bearer-token auth support
- Safe per-row fallback behavior when evidence is weak or malformed
- Demo-readiness notes, fallback runbook, and shipping documentation

## What Was Validated

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- Local partner stack starts successfully
- MCP endpoint is reachable from the app
- Direct Bedrock auth path is implemented and reaches AWS with bearer-token auth

## External Blocker

The remaining blocker is not missing app architecture. The blocker is the
partner credential intent and permission path for direct app-side Bedrock
generation.

Current live validation status:

- the partner-provided direct bearer token reaches Bedrock but is denied for
  `bedrock:CallWithBearerToken`
- the access-key-shaped values from the package do not work as normal AWS SigV4
  credentials for this app path

Until Rui confirms the intended direct path or an alternative approved path,
Phase 1 should not be marked fully complete.

## Re-Test Once Rui Replies

- Run real generation on the 7-row shortlist from
  `docs/discovery/phase-1-demo-readiness.md`
- Grade outputs against the rubric in that note
- Confirm grounded references render correctly in Review, Script, and Export
- Confirm Markdown export preserves approved references and warnings
- Expand beyond the shortlist only after the 7-row set is stable
