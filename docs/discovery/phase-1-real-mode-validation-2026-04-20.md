# Phase 1 Real-Mode Validation

Date: 2026-04-20

## Summary

The real server-side Phase 1 integration is implemented and the repo passes the
local quality gate, but the live validation run is currently blocked by the
partner Bedrock credentials.

This is not a prompt-quality issue. It is a concrete infrastructure and access
issue discovered during live testing against the local partner stack.

## What Was Verified

- Local repo checks pass:
  - `pnpm format:check`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
- The partner local stack starts successfully:
  - `rag` is reachable on port `8080`
  - `clickhouse` is reachable on ports `8123` and `9000`
  - `LibreChat` is reachable on port `3080`
- The app runs locally with `GENERATION_MODE=real`.
- The MCP endpoint is reachable at the configured streamable HTTP path.
- The Bedrock client implementation now supports both auth paths:
  - standard AWS credential signing
  - Bedrock bearer-token auth using `authSchemePreference: ["httpBearerAuth"]`

## Live Validation Findings

### Customer X demo-row generation

- Attempted a live `POST /api/requirements/generate` run using the first 5 demo
  rows from the Customer X workbook.
- Result: route returned `502 generation-failed`.

### Direct Bedrock auth checks

- The partner-provided bearer token is now recognized by Bedrock when used with
  forced bearer auth.
- Bedrock responds with `403 AccessDeniedException` for
  `bedrock:CallWithBearerToken`.
- The partner-provided access-key-style values do not work as normal SigV4
  credentials. Direct AWS-auth attempts return `403 UnrecognizedClientException`.

## Conclusion

The app-side integration is implemented correctly enough to reach the partner
Bedrock path, but the current partner-provided credentials do not allow a
successful direct Bedrock generation call from this app.

Because of that:

- real-mode generation cannot yet be called fully validated
- prompt tuning is premature until Bedrock access succeeds
- Phase 1 should not be marked fully done yet

## Next Action

Ask Rui / Critical Manufacturing to confirm one of these:

1. a bearer token or IAM credential path that is authorized for direct app-side
   Bedrock generation
2. whether the intended integration path is to call Bedrock indirectly through
   LibreChat instead of directly from the app
3. whether a different Bedrock model, region, or permission policy should be
   used for direct generation

## Safety Notes

- No secrets, token values, access keys, or `.env` contents are copied into this
  note.
- This note records only the validation outcome and the blocker needed to
  continue.
