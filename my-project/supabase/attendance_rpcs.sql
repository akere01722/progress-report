-- Attendance RPCs for non-Supabase-Auth flow
-- Uses explicit actor ids (teacher/admin) passed from frontend.
-- Requires existing tables:
--   public.attendance_sessions
--   public.attendance_entries
--   public.teachers (id uuid)
--   public.admins (id bigint)
--   public.students (id bigint)

create extension if not exists pgcrypto;

create or replace function public.set_updated_at_attendance()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_attendance_sessions_updated_at on public.attendance_sessions;
create trigger trg_attendance_sessions_updated_at
before update on public.attendance_sessions
for each row execute function public.set_updated_at_attendance();

drop trigger if exists trg_attendance_entries_updated_at on public.attendance_entries;
create trigger trg_attendance_entries_updated_at
before update on public.attendance_entries
for each row execute function public.set_updated_at_attendance();

drop function if exists public.attendance_admin_sessions_app(bigint,text,date,date);
drop function if exists public.attendance_admin_entries_app(bigint,uuid);
drop function if exists public.attendance_admin_review_app(bigint,uuid,text,text);

create or replace function public.attendance_save_draft_app(
  p_teacher_id uuid,
  p_faculty_id bigint,
  p_department_id bigint,
  p_class_name text,
  p_subject text,
  p_session_date date,
  p_academic_year text,
  p_semester text,
  p_teacher_note text default '',
  p_entries jsonb default '[]'::jsonb
)
returns table (
  session_id uuid,
  saved_count int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
begin
  if p_teacher_id is null then
    raise exception 'Teacher id is required';
  end if;

  if not exists (select 1 from public.teachers t where t.id = p_teacher_id) then
    raise exception 'Teacher not found';
  end if;

  if coalesce(trim(p_class_name), '') = '' or coalesce(trim(p_subject), '') = '' then
    raise exception 'Class and subject are required';
  end if;

  if p_session_date is null then
    raise exception 'Session date is required';
  end if;

  if coalesce(trim(p_academic_year), '') = '' then
    raise exception 'Academic year is required';
  end if;

  if coalesce(trim(p_semester), '') not in ('Semester 1', 'Semester 2') then
    raise exception 'Semester must be Semester 1 or Semester 2';
  end if;

  insert into public.attendance_sessions (
    teacher_id, faculty_id, department_id, class_name, subject, session_date,
    academic_year, semester, status, teacher_note
  )
  values (
    p_teacher_id, p_faculty_id, p_department_id, trim(p_class_name), trim(p_subject),
    p_session_date, trim(p_academic_year), trim(p_semester), 'draft', coalesce(p_teacher_note, '')
  )
  on conflict (teacher_id, class_name, subject, session_date)
  do update
     set faculty_id = excluded.faculty_id,
         department_id = excluded.department_id,
         academic_year = excluded.academic_year,
         semester = excluded.semester,
         teacher_note = excluded.teacher_note,
         status = 'draft',
         submitted_at = null
   where public.attendance_sessions.status in ('draft', 'rejected')
  returning id into v_session_id;

  if v_session_id is null then
    raise exception 'This session is already submitted or approved and cannot be edited';
  end if;

  delete from public.attendance_entries where session_id = v_session_id;

  insert into public.attendance_entries(session_id, student_id, matricule, student_name, mark)
  select
    v_session_id,
    case
      when coalesce(trim(e.student_id), '') ~ '^[0-9]+$' then trim(e.student_id)::bigint
      else null
    end as student_id,
    trim(e.matricule),
    trim(e.student_name),
    case lower(trim(e.mark))
      when 'present' then 'present'::public.attendance_mark_status
      when 'absent' then 'absent'::public.attendance_mark_status
      when 'late' then 'late'::public.attendance_mark_status
      when 'excused' then 'excused'::public.attendance_mark_status
    end as mark
  from jsonb_to_recordset(coalesce(p_entries, '[]'::jsonb))
       as e(student_id text, matricule text, student_name text, mark text)
  where coalesce(trim(e.matricule), '') <> ''
    and coalesce(trim(e.student_name), '') <> ''
    and lower(trim(coalesce(e.mark, ''))) in ('present', 'absent', 'late', 'excused');

  return query
  select v_session_id,
         (select count(*)::int from public.attendance_entries where session_id = v_session_id);
end;
$$;

create or replace function public.attendance_submit_app(
  p_teacher_id uuid,
  p_session_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
begin
  if p_teacher_id is null or p_session_id is null then
    raise exception 'Teacher id and session id are required';
  end if;

  update public.attendance_sessions
     set status = 'submitted',
         submitted_at = now()
   where id = p_session_id
     and teacher_id = p_teacher_id
     and status in ('draft', 'rejected')
  returning id into v_session_id;

  if v_session_id is null then
    raise exception 'Session not found or not editable';
  end if;

  return v_session_id;
end;
$$;

create or replace function public.attendance_teacher_sessions_app(
  p_teacher_id uuid,
  p_week_start date default null,
  p_week_end date default null,
  p_limit int default 60
)
returns table (
  id uuid,
  teacher_id uuid,
  class_name text,
  subject text,
  session_date date,
  academic_year text,
  semester text,
  status public.attendance_session_status,
  teacher_note text,
  admin_note text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by text,
  total_students int,
  present_count int,
  absent_count int,
  late_count int,
  excused_count int
)
language sql
security definer
set search_path = public
as $$
  select
    s.id,
    s.teacher_id,
    s.class_name,
    s.subject,
    s.session_date,
    s.academic_year,
    s.semester,
    s.status,
    s.teacher_note,
    s.admin_note,
    s.submitted_at,
    s.reviewed_at,
    s.reviewed_by,
    count(e.*)::int as total_students,
    coalesce(sum((e.mark = 'present')::int), 0)::int as present_count,
    coalesce(sum((e.mark = 'absent')::int), 0)::int as absent_count,
    coalesce(sum((e.mark = 'late')::int), 0)::int as late_count,
    coalesce(sum((e.mark = 'excused')::int), 0)::int as excused_count
  from public.attendance_sessions s
  left join public.attendance_entries e on e.session_id = s.id
  where s.teacher_id = p_teacher_id
    and (p_week_start is null or s.session_date >= p_week_start)
    and (p_week_end is null or s.session_date <= p_week_end)
  group by s.id
  order by s.session_date desc, s.created_at desc
  limit greatest(coalesce(p_limit, 60), 1);
$$;

create or replace function public.attendance_admin_sessions_app(
  p_admin_id text,
  p_status text default null,
  p_week_start date default null,
  p_week_end date default null
)
returns table (
  id uuid,
  teacher_id uuid,
  teacher_name text,
  teacher_staff_id text,
  faculty_id bigint,
  department_id bigint,
  class_name text,
  subject text,
  session_date date,
  academic_year text,
  semester text,
  status public.attendance_session_status,
  teacher_note text,
  admin_note text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by text,
  total_students int,
  present_count int,
  absent_count int,
  late_count int,
  excused_count int
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_admin_id is null then
    raise exception 'Admin id is required';
  end if;

  if not exists (select 1 from public.admins a where a.id::text = trim(p_admin_id)) then
    raise exception 'Admin not found';
  end if;

  return query
  select
    s.id,
    s.teacher_id,
    coalesce(t.full_name, '') as teacher_name,
    coalesce(t.staff_id, '') as teacher_staff_id,
    s.faculty_id,
    s.department_id,
    s.class_name,
    s.subject,
    s.session_date,
    s.academic_year,
    s.semester,
    s.status,
    s.teacher_note,
    s.admin_note,
    s.submitted_at,
    s.reviewed_at,
    s.reviewed_by,
    count(e.*)::int as total_students,
    coalesce(sum((e.mark = 'present')::int), 0)::int as present_count,
    coalesce(sum((e.mark = 'absent')::int), 0)::int as absent_count,
    coalesce(sum((e.mark = 'late')::int), 0)::int as late_count,
    coalesce(sum((e.mark = 'excused')::int), 0)::int as excused_count
  from public.attendance_sessions s
  left join public.teachers t on t.id = s.teacher_id
  left join public.attendance_entries e on e.session_id = s.id
  where (p_status is null or s.status::text = lower(trim(p_status)))
    and (p_week_start is null or s.session_date >= p_week_start)
    and (p_week_end is null or s.session_date <= p_week_end)
  group by s.id, t.full_name, t.staff_id
  order by s.session_date desc, s.created_at desc;
end;
$$;

create or replace function public.attendance_admin_entries_app(
  p_admin_id text,
  p_session_id uuid
)
returns table (
  id uuid,
  session_id uuid,
  student_id bigint,
  matricule text,
  student_name text,
  mark public.attendance_mark_status
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_admin_id is null or not exists (select 1 from public.admins a where a.id::text = trim(p_admin_id)) then
    raise exception 'Admin not found';
  end if;

  return query
  select e.id, e.session_id, e.student_id, e.matricule, e.student_name, e.mark
  from public.attendance_entries e
  where e.session_id = p_session_id
  order by e.student_name asc;
end;
$$;

create or replace function public.attendance_teacher_entries_app(
  p_teacher_id uuid,
  p_session_id uuid
)
returns table (
  id uuid,
  session_id uuid,
  student_id bigint,
  matricule text,
  student_name text,
  mark public.attendance_mark_status
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_teacher_id is null or not exists (select 1 from public.teachers t where t.id = p_teacher_id) then
    raise exception 'Teacher not found';
  end if;

  if not exists (
    select 1 from public.attendance_sessions s
    where s.id = p_session_id and s.teacher_id = p_teacher_id
  ) then
    raise exception 'Session not found for this teacher';
  end if;

  return query
  select e.id, e.session_id, e.student_id, e.matricule, e.student_name, e.mark
  from public.attendance_entries e
  where e.session_id = p_session_id
  order by e.student_name asc;
end;
$$;

create or replace function public.attendance_admin_review_app(
  p_admin_id text,
  p_session_id uuid,
  p_decision text,
  p_admin_note text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_status public.attendance_session_status;
  v_updated uuid;
begin
  if p_admin_id is null or not exists (select 1 from public.admins a where a.id::text = trim(p_admin_id)) then
    raise exception 'Admin not found';
  end if;

  if lower(trim(coalesce(p_decision, ''))) not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected';
  end if;

  v_target_status :=
    case lower(trim(p_decision))
      when 'approved' then 'approved'::public.attendance_session_status
      else 'rejected'::public.attendance_session_status
    end;

  update public.attendance_sessions
     set status = v_target_status,
         admin_note = coalesce(p_admin_note, ''),
         reviewed_at = now(),
         reviewed_by = trim(p_admin_id)
   where id = p_session_id
     and status = 'submitted'
  returning id into v_updated;

  if v_updated is null then
    raise exception 'Session not found or not in submitted state';
  end if;

  return v_updated;
end;
$$;

create or replace function public.attendance_student_weekly_app(
  p_matricule text,
  p_week_start date default null,
  p_week_end date default null
)
returns table (
  session_id uuid,
  session_date date,
  class_name text,
  subject text,
  mark public.attendance_mark_status,
  academic_year text,
  semester text,
  teacher_name text
)
language sql
security definer
set search_path = public
as $$
  select
    s.id as session_id,
    s.session_date,
    s.class_name,
    s.subject,
    e.mark,
    s.academic_year,
    s.semester,
    coalesce(t.full_name, '') as teacher_name
  from public.attendance_entries e
  join public.attendance_sessions s on s.id = e.session_id
  left join public.teachers t on t.id = s.teacher_id
  where lower(e.matricule) = lower(trim(coalesce(p_matricule, '')))
    and s.status = 'approved'
    and (p_week_start is null or s.session_date >= p_week_start)
    and (p_week_end is null or s.session_date <= p_week_end)
  order by s.session_date desc, s.created_at desc;
$$;

grant execute on function public.attendance_save_draft_app(uuid,bigint,bigint,text,text,date,text,text,text,jsonb) to anon, authenticated;
grant execute on function public.attendance_submit_app(uuid,uuid) to anon, authenticated;
grant execute on function public.attendance_teacher_sessions_app(uuid,date,date,int) to anon, authenticated;
grant execute on function public.attendance_teacher_entries_app(uuid,uuid) to anon, authenticated;
grant execute on function public.attendance_admin_sessions_app(text,text,date,date) to anon, authenticated;
grant execute on function public.attendance_admin_entries_app(text,uuid) to anon, authenticated;
grant execute on function public.attendance_admin_review_app(text,uuid,text,text) to anon, authenticated;
grant execute on function public.attendance_student_weekly_app(text,date,date) to anon, authenticated;
