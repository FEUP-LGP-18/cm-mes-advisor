import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260430180000_core_project_collaboration_schema.sql",
  ),
  "utf8",
);

const projectTables = [
  "projects",
  "project_memberships",
  "project_invites",
  "project_phase_states",
  "project_files",
  "project_activity_events",
];

describe("project collaboration schema migration", () => {
  it("creates every project collaboration table", () => {
    for (const table of projectTables) {
      expect(migration).toContain(`create table public.${table}`);
    }
  });

  it("enables RLS on every project table", () => {
    for (const table of projectTables) {
      expect(migration).toContain(
        `alter table public.${table} enable row level security;`,
      );
    }
  });

  it("defines the expected project roles and permission helpers", () => {
    expect(migration).toContain(
      "create type public.project_role as enum ('viewer', 'editor', 'owner')",
    );
    expect(migration).toContain(
      "create or replace function public.current_project_role",
    );
    expect(migration).toContain(
      "create or replace function public.can_view_project",
    );
    expect(migration).toContain(
      "create or replace function public.can_edit_project",
    );
    expect(migration).toContain(
      "create or replace function public.can_manage_project",
    );
  });

  it("keeps project phase state keyed by a generic phase key", () => {
    expect(migration).toContain("create table public.project_phase_states");
    expect(migration).toContain(
      "phase_key text not null check (phase_key ~ '^[a-z0-9][a-z0-9_-]*$')",
    );
    expect(migration).toContain("primary key (project_id, phase_key)");
    expect(migration).not.toContain("phase_key public.");
    expect(migration).not.toContain(
      "phase_key text not null check (phase_key = 'phase1')",
    );
  });

  it("creates and protects the initial owner invariant", () => {
    expect(migration).toContain(
      "create or replace function public.create_initial_project_owner",
    );
    expect(migration).toContain(
      "create or replace function public.prevent_last_project_owner_removal",
    );
    expect(migration).toContain("Cannot remove the last project owner");
    expect(migration).toContain("Cannot demote the last project owner");
  });

  it("keeps mutating policies aligned with viewer, editor, and owner roles", () => {
    expect(migration).toContain("members can read project metadata");
    expect(migration).toContain("members can read project phase state");
    expect(migration).toContain("editors can update project phase state");
    expect(migration).toContain("editors can upload project files");
    expect(migration).toContain("owners can update project settings");
    expect(migration).toContain("owners can add project members");
    expect(migration).toContain("owners can create project invites");
  });
});
