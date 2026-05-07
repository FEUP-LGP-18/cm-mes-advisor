-- Atomic invite acceptance: first claims the pending invite, then upserts
-- membership from the claimed row so a concurrent revoke/accept cannot leave
-- a membership behind after returning a conflict.

create or replace function public.accept_project_invite(
  p_invite_id uuid,
  p_user_id uuid
)
returns setof public.project_invites
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with accepted_invite as (
    update public.project_invites
    set status = 'accepted',
        accepted_at = now()
    where id = p_invite_id
      and status = 'pending'
    returning *
  ),
  membership_upsert as (
    -- Upsert membership derived from the claimed invite; also handles role
    -- upgrades (e.g. Viewer already in project is re-invited as Owner).
    insert into public.project_memberships (project_id, user_id, role, invited_by)
    select ai.project_id, p_user_id, ai.role, ai.invited_by
    from accepted_invite ai
    on conflict (project_id, user_id) do update
      set role = excluded.role,
          updated_at = now()
    returning project_id
  )
  select ai.*
  from accepted_invite ai
  where exists (
    select 1
    from membership_upsert
  );
end;
$$;

-- Called exclusively via the service-role admin client; no direct grant needed.
revoke all on function public.accept_project_invite(uuid, uuid) from public;
