-- No-auth policies for attendance tables
-- Run this in Supabase SQL Editor if you are NOT using Supabase Auth
-- and your frontend uses anon key + custom app login.

-- 1) Ensure RLS is enabled
alter table if exists public.attendance_sessions enable row level security;
alter table if exists public.attendance_entries enable row level security;

-- 2) Remove existing policies (safe reset)
do $$
declare
  p record;
begin
  for p in
    select polname
    from pg_policies
    where schemaname = 'public' and tablename = 'attendance_sessions'
  loop
    execute format('drop policy if exists %I on public.attendance_sessions', p.polname);
  end loop;

  for p in
    select polname
    from pg_policies
    where schemaname = 'public' and tablename = 'attendance_entries'
  loop
    execute format('drop policy if exists %I on public.attendance_entries', p.polname);
  end loop;
end $$;

-- 3) Open policies for anon/authenticated (app-level access control)
create policy attendance_sessions_select_all
on public.attendance_sessions
for select
to anon, authenticated
using (true);

create policy attendance_sessions_insert_all
on public.attendance_sessions
for insert
to anon, authenticated
with check (true);

create policy attendance_sessions_update_all
on public.attendance_sessions
for update
to anon, authenticated
using (true)
with check (true);

create policy attendance_sessions_delete_all
on public.attendance_sessions
for delete
to anon, authenticated
using (true);

create policy attendance_entries_select_all
on public.attendance_entries
for select
to anon, authenticated
using (true);

create policy attendance_entries_insert_all
on public.attendance_entries
for insert
to anon, authenticated
with check (true);

create policy attendance_entries_update_all
on public.attendance_entries
for update
to anon, authenticated
using (true)
with check (true);

create policy attendance_entries_delete_all
on public.attendance_entries
for delete
to anon, authenticated
using (true);
