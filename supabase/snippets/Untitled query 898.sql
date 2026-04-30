select proname
from pg_proc
where proname ilike '%owner%';

select trigger_name, event_object_table
from information_schema.triggers
where event_object_table = 'project_memberships';