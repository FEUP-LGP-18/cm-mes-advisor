# Issue #16 - Core Schema, Roles, And RLS

## Plan

- [x] Create the project-level collaboration migration.
- [x] Add project roles, invite statuses, tables, indexes, and update triggers.
- [x] Add permission helper functions that avoid recursive RLS checks.
- [x] Enable RLS on all project-related tables.
- [x] Add policies for viewer, editor, and owner permissions.
- [x] Block removing or demoting the last owner at the database layer.
- [x] Update docs with the schema and RLS contract.
- [x] Verify SQL/docs with available local checks.

## Review

- Added the core project collaboration migration at
  `supabase/migrations/20260430180000_core_project_collaboration_schema.sql`.
- Created project-level tables for projects, memberships, invites,
  phase-keyed state, file metadata, and activity events.
- Added `viewer`, `editor`, and `owner` roles with RLS helper functions for
  view, edit, and manage checks.
- Enabled RLS on every project table and added policies matching the requested
  permission matrix.
- Added triggers for audit fields, initial owner creation, phase-state version
  increments, archive timestamps, and last-owner protection.
- Updated docs in `supabase/README.md` and
  `content/docs/project-collaboration-schema.mdx`.
- Added `src/lib/supabase/schema-contract.test.ts` to guard the migration
  contract in CI.
- Verification: `pnpm test -- src/lib/supabase`, `pnpm lint`, `pnpm typecheck`,
  and touched-file Prettier checks passed.
- Could not run `supabase db reset` locally because the Supabase CLI is not
  installed in this environment (`supabase: command not found`).
