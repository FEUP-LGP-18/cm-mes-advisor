select tablename, policyname, cmd
from pg_policies
where tablename in ('projects', 'project_memberships', 'project_invites')
order by tablename, cmd;