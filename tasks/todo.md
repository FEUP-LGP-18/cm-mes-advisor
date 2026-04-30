# Issue #13 - Supabase Foundation

## Plan

- [x] Add a repo-local Supabase migrations scaffold without introducing Phase 1 schema yet.
- [x] Document the local and production migration workflow.
- [x] Add a server-side Supabase config helper with actionable missing-env errors.
- [x] Restore/update `.env.example` with safe Supabase placeholders.
- [x] Verify with focused Supabase/auth tests and TypeScript checks.

## Review

- Added `supabase/` with migration workflow docs and a tracked
  `supabase/migrations/` scaffold.
- Added `src/lib/supabase/server-config.ts` plus tests for actionable server
  config errors and optional service-role access.
- Restored `.env.example` with safe Supabase placeholders, including an
  explicitly server-only service-role placeholder.
- Updated README and the onboarding docs site with auth, config, and migration
  workflow guidance.
- Verification: focused Supabase/auth/API tests passed, lint passed, typecheck
  passed, and touched files pass Prettier.
- Repo-wide `pnpm format:check` still reports pre-existing formatting drift in
  unrelated files, so only touched files were formatted.
