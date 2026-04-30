-- Core project collaboration schema for MES Demo Advisor.
--
-- This migration intentionally keeps the model project-level. It does not add
-- organization/workspace scope.

create extension if not exists pgcrypto;

create type public.project_role as enum ('viewer', 'editor', 'owner');
create type public.project_invite_status as enum (
  'pending',
  'accepted',
  'revoked',
  'expired'
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  customer_name text,
  description text,
  status text not null default 'active' check (
    status in ('active', 'archived', 'deleted')
  ),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  check (
    (status = 'archived' and archived_at is not null)
    or (status <> 'archived')
  )
);

create table public.project_memberships (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.project_role not null,
  invited_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table public.project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  email text not null check (position('@' in email) > 1),
  role public.project_role not null,
  token_hash text not null,
  status public.project_invite_status not null default 'pending',
  invited_by uuid references auth.users(id) on delete set null default auth.uid(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (
    (status = 'accepted' and accepted_at is not null)
    or (status <> 'accepted')
  ),
  check (
    (status = 'revoked' and revoked_at is not null)
    or (status <> 'revoked')
  )
);

create table public.project_phase_states (
  project_id uuid not null references public.projects(id) on delete cascade,
  phase_key text not null check (phase_key ~ '^[a-z0-9][a-z0-9_-]*$'),
  state_json jsonb not null default '{}'::jsonb,
  version integer not null default 1 check (version > 0),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (project_id, phase_key)
);

create table public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  storage_path text not null,
  filename text not null check (char_length(trim(filename)) > 0),
  mime_type text,
  size_bytes bigint not null check (size_bytes >= 0),
  checksum text,
  source_metadata_json jsonb not null default '{}'::jsonb,
  uploaded_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (storage_path)
);

create table public.project_activity_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null default auth.uid(),
  event_type text not null check (char_length(trim(event_type)) > 0),
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index project_memberships_user_id_idx
  on public.project_memberships (user_id);

create index project_invites_project_status_idx
  on public.project_invites (project_id, status);

create unique index project_invites_pending_email_idx
  on public.project_invites (project_id, lower(email))
  where status = 'pending';

create unique index project_invites_token_hash_idx
  on public.project_invites (token_hash);

create index project_phase_states_project_idx
  on public.project_phase_states (project_id);

create index project_files_project_idx
  on public.project_files (project_id);

create index project_activity_events_project_created_idx
  on public.project_activity_events (project_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_project_audit_fields()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by = coalesce(new.created_by, auth.uid());
    new.updated_by = coalesce(new.updated_by, new.created_by);
  else
    new.updated_by = coalesce(auth.uid(), new.updated_by);
  end if;

  new.updated_at = now();

  if new.status = 'archived' and new.archived_at is null then
    new.archived_at = now();
  end if;

  return new;
end;
$$;

create trigger projects_set_updated_at
before insert or update on public.projects
for each row execute function public.set_project_audit_fields();

create trigger project_memberships_set_updated_at
before update on public.project_memberships
for each row execute function public.set_updated_at();

create trigger project_invites_set_updated_at
before update on public.project_invites
for each row execute function public.set_updated_at();

create or replace function public.set_phase_state_audit_fields()
returns trigger
language plpgsql
as $$
begin
  new.updated_by = coalesce(auth.uid(), new.updated_by);
  new.updated_at = now();

  if tg_op = 'INSERT' then
    new.version = coalesce(new.version, 1);
  else
    new.version = coalesce(old.version, 0) + 1;
  end if;

  return new;
end;
$$;

create trigger project_phase_states_set_updated_at
before insert or update on public.project_phase_states
for each row execute function public.set_phase_state_audit_fields();

create or replace function public.set_file_audit_fields()
returns trigger
language plpgsql
as $$
begin
  new.uploaded_by = coalesce(new.uploaded_by, auth.uid());
  return new;
end;
$$;

create trigger project_files_set_audit_fields
before insert on public.project_files
for each row execute function public.set_file_audit_fields();

create or replace function public.set_activity_audit_fields()
returns trigger
language plpgsql
as $$
begin
  new.actor_id = coalesce(new.actor_id, auth.uid());
  return new;
end;
$$;

create trigger project_activity_events_set_audit_fields
before insert on public.project_activity_events
for each row execute function public.set_activity_audit_fields();

create or replace function public.create_initial_project_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is null then
    raise exception 'projects.created_by is required to create the initial owner membership';
  end if;

  insert into public.project_memberships (project_id, user_id, role, invited_by)
  values (new.id, new.created_by, 'owner', new.created_by)
  on conflict (project_id, user_id) do update
    set role = 'owner',
        updated_at = now();

  return new;
end;
$$;

create trigger projects_create_initial_owner
after insert on public.projects
for each row execute function public.create_initial_project_owner();

create or replace function public.prevent_last_project_owner_removal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_count integer;
begin
  if tg_op = 'DELETE' and old.role = 'owner' then
    if not exists (
      select 1
      from public.projects
      where id = old.project_id
    ) then
      return old;
    end if;

    select count(*)
      into owner_count
      from public.project_memberships
      where project_id = old.project_id
        and role = 'owner'
        and user_id <> old.user_id;

    if owner_count = 0 then
      raise exception 'Cannot remove the last project owner';
    end if;
  end if;

  if tg_op = 'UPDATE' and old.role = 'owner' and new.role <> 'owner' then
    select count(*)
      into owner_count
      from public.project_memberships
      where project_id = old.project_id
        and role = 'owner'
        and user_id <> old.user_id;

    if owner_count = 0 then
      raise exception 'Cannot demote the last project owner';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger project_memberships_prevent_last_owner_update
before update of role on public.project_memberships
for each row execute function public.prevent_last_project_owner_removal();

create trigger project_memberships_prevent_last_owner_delete
before delete on public.project_memberships
for each row execute function public.prevent_last_project_owner_removal();

create or replace function public.project_role_rank(role public.project_role)
returns integer
language sql
immutable
as $$
  select case role
    when 'viewer' then 10
    when 'editor' then 20
    when 'owner' then 30
  end
$$;

create or replace function public.current_project_role(target_project_id uuid)
returns public.project_role
language sql
stable
security definer
set search_path = public
as $$
  select pm.role
  from public.project_memberships pm
  where pm.project_id = target_project_id
    and pm.user_id = auth.uid()
  limit 1
$$;

create or replace function public.can_view_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_project_role(target_project_id) is not null
$$;

create or replace function public.can_edit_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.project_role_rank(public.current_project_role(target_project_id)),
    0
  ) >= public.project_role_rank('editor')
$$;

create or replace function public.can_manage_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_project_role(target_project_id) = 'owner'
$$;

revoke all on function public.set_updated_at() from public;
revoke all on function public.set_project_audit_fields() from public;
revoke all on function public.set_phase_state_audit_fields() from public;
revoke all on function public.set_file_audit_fields() from public;
revoke all on function public.set_activity_audit_fields() from public;
revoke all on function public.create_initial_project_owner() from public;
revoke all on function public.prevent_last_project_owner_removal() from public;
revoke all on function public.project_role_rank(public.project_role) from public;
revoke all on function public.current_project_role(uuid) from public;
revoke all on function public.can_view_project(uuid) from public;
revoke all on function public.can_edit_project(uuid) from public;
revoke all on function public.can_manage_project(uuid) from public;

grant execute on function public.project_role_rank(public.project_role) to authenticated;
grant execute on function public.current_project_role(uuid) to authenticated;
grant execute on function public.can_view_project(uuid) to authenticated;
grant execute on function public.can_edit_project(uuid) to authenticated;
grant execute on function public.can_manage_project(uuid) to authenticated;

grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.project_memberships to authenticated;
grant select, insert, update, delete on public.project_invites to authenticated;
grant select, insert, update, delete on public.project_phase_states to authenticated;
grant select, insert, update, delete on public.project_files to authenticated;
grant select, insert on public.project_activity_events to authenticated;

alter table public.projects enable row level security;
alter table public.project_memberships enable row level security;
alter table public.project_invites enable row level security;
alter table public.project_phase_states enable row level security;
alter table public.project_files enable row level security;
alter table public.project_activity_events enable row level security;

create policy "members can read project metadata"
on public.projects
for select
to authenticated
using (public.can_view_project(id));

create policy "authenticated users can create projects"
on public.projects
for insert
to authenticated
with check (created_by = auth.uid());

create policy "owners can update project settings"
on public.projects
for update
to authenticated
using (public.can_manage_project(id))
with check (public.can_manage_project(id));

create policy "owners can delete projects"
on public.projects
for delete
to authenticated
using (public.can_manage_project(id));

create policy "members can read team list"
on public.project_memberships
for select
to authenticated
using (public.can_view_project(project_id));

create policy "owners can add project members"
on public.project_memberships
for insert
to authenticated
with check (
  public.can_manage_project(project_id)
  and invited_by = auth.uid()
);

create policy "owners can change project member roles"
on public.project_memberships
for update
to authenticated
using (public.can_manage_project(project_id))
with check (public.can_manage_project(project_id));

create policy "owners can remove project members"
on public.project_memberships
for delete
to authenticated
using (public.can_manage_project(project_id));

create policy "owners can read project invites"
on public.project_invites
for select
to authenticated
using (public.can_manage_project(project_id));

create policy "owners can create project invites"
on public.project_invites
for insert
to authenticated
with check (
  public.can_manage_project(project_id)
  and invited_by = auth.uid()
);

create policy "owners can update project invites"
on public.project_invites
for update
to authenticated
using (public.can_manage_project(project_id))
with check (public.can_manage_project(project_id));

create policy "owners can delete project invites"
on public.project_invites
for delete
to authenticated
using (public.can_manage_project(project_id));

create policy "members can read project phase state"
on public.project_phase_states
for select
to authenticated
using (public.can_view_project(project_id));

create policy "editors can create project phase state"
on public.project_phase_states
for insert
to authenticated
with check (
  public.can_edit_project(project_id)
  and updated_by = auth.uid()
);

create policy "editors can update project phase state"
on public.project_phase_states
for update
to authenticated
using (public.can_edit_project(project_id))
with check (
  public.can_edit_project(project_id)
  and updated_by = auth.uid()
);

create policy "owners can delete project phase state"
on public.project_phase_states
for delete
to authenticated
using (public.can_manage_project(project_id));

create policy "members can read project files"
on public.project_files
for select
to authenticated
using (public.can_view_project(project_id));

create policy "editors can upload project files"
on public.project_files
for insert
to authenticated
with check (
  public.can_edit_project(project_id)
  and uploaded_by = auth.uid()
);

create policy "owners can delete project files"
on public.project_files
for delete
to authenticated
using (public.can_manage_project(project_id));

create policy "members can read project activity"
on public.project_activity_events
for select
to authenticated
using (public.can_view_project(project_id));

create policy "members can create project activity"
on public.project_activity_events
for insert
to authenticated
with check (
  public.can_view_project(project_id)
  and actor_id = auth.uid()
);