# Supabase Migrations

This directory is the source-controlled home for Supabase database migrations.

The current migration set includes the project collaboration schema, role
helpers, RLS policies, and the private `project-files` Storage bucket used by
workbook uploads. Keep future schema or Storage policy changes in timestamped
migrations under `supabase/migrations/`.

## Local Workflow

Install and authenticate the Supabase CLI outside the repo, then link this
checkout to the project you are working against:

```bash
supabase login
supabase link --project-ref <project-ref>
```

Create migrations from the app root:

```bash
supabase migration new <short_description>
```

This writes a timestamped SQL file under `supabase/migrations/`. Edit that file,
then test it locally:

```bash
supabase start
supabase db reset
pnpm test
```

`supabase db reset` rebuilds the local database and applies every migration in
this directory. Use it before opening a PR that changes migrations.

## Production Workflow

Production migration application should be deliberate and separated from normal
Vercel app deploys until the team wires dedicated database deployment
automation.

Before pushing migrations to a remote Supabase project:

1. Pull the latest `main`.
2. Confirm every migration in `supabase/migrations/` has been reviewed.
3. Run `supabase db reset` locally.
4. Run the relevant app tests.
5. Apply to the linked remote project:

```bash
supabase db push
```

If someone changes schema directly in the Supabase Dashboard, capture it in a
migration before continuing local work:

```bash
supabase db pull
```

Never commit Supabase access tokens, database passwords, `.env`, generated
exports, uploaded workbooks, or partner artifacts.
