-- Private workbook storage for uploaded Phase 1 source files.
--
-- project_files remains the metadata/index table. Raw .xlsx bytes live in the
-- private project-files bucket, with project_files.storage_path pointing at the
-- bucket/object path.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'project-files',
  'project-files',
  false,
  10485760,
  array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "members can read project workbook objects"
on storage.objects;

create policy "members can read project workbook objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'project-files'
  and name ~ '^projects/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/source/.+\.xlsx$'
  and public.can_view_project(((storage.foldername(name))[2])::uuid)
);

drop policy if exists "editors can upload project workbook objects"
on storage.objects;

create policy "editors can upload project workbook objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'project-files'
  and name ~ '^projects/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/source/.+\.xlsx$'
  and public.can_edit_project(((storage.foldername(name))[2])::uuid)
);

drop policy if exists "editors can update project workbook objects"
on storage.objects;

create policy "editors can update project workbook objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'project-files'
  and name ~ '^projects/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/source/.+\.xlsx$'
  and public.can_edit_project(((storage.foldername(name))[2])::uuid)
)
with check (
  bucket_id = 'project-files'
  and name ~ '^projects/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/source/.+\.xlsx$'
  and public.can_edit_project(((storage.foldername(name))[2])::uuid)
);

drop policy if exists "editors can delete project workbook objects"
on storage.objects;

create policy "editors can delete project workbook objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'project-files'
  and name ~ '^projects/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/source/.+\.xlsx$'
  and public.can_edit_project(((storage.foldername(name))[2])::uuid)
);

drop policy if exists "editors can delete own failed project file metadata"
on public.project_files;

create policy "editors can delete own failed project file metadata"
on public.project_files
for delete
to authenticated
using (
  public.can_edit_project(project_id)
  and uploaded_by = auth.uid()
);
