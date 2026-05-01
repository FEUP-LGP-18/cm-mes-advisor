-- Atomic invite acceptance: upserts the membership and marks the invite
-- accepted in a single function call so a partial failure cannot leave
-- the invite pending after the membership row already exists.

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
  -- Upsert membership derived from the invite; also handles role upgrades
  -- (e.g. Viewer already in project is re-invited as Owner).
  insert into public.project_memberships (project_id, user_id, role, invited_by)
  select pi.project_id, p_user_id, pi.role, pi.invited_by
  from public.project_invites pi
  where pi.id = p_invite_id
    and pi.status = 'pending'
  on conflict (project_id, user_id) do update
    set role = excluded.role,
        updated_at = now();

  -- Mark the invite accepted only if it is still pending.
  -- If it was revoked or accepted concurrently, the update matches zero rows
  -- and the function returns an empty set, which the caller treats as conflict.
  return query
  update public.project_invites
  set status = 'accepted',
      accepted_at = now()
  where id = p_invite_id
    and status = 'pending'
  returning *;
end;
$$;

-- Called exclusively via the service-role admin client; no direct grant needed.
revoke all on function public.accept_project_invite(uuid, uuid) from public;
