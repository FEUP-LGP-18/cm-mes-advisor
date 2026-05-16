-- Persist signed-in user profile details that are safe to show in the app.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null check (position('@' in email) > 1),
  display_name text check (
    display_name is null or char_length(trim(display_name)) <= 120
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

grant select, insert, update on public.profiles to authenticated;

alter table public.profiles enable row level security;

create policy "users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "users can create own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "users can update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());
