-- ProgressTrack Supabase schema
-- Apply in Supabase SQL Editor.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'teacher', 'student');
  end if;
  if not exists (select 1 from pg_type where typname = 'assessment_type') then
    create type public.assessment_type as enum ('CA', 'EXAM');
  end if;
  if not exists (select 1 from pg_type where typname = 'submission_status') then
    create type public.submission_status as enum ('submitted', 'approved', 'rejected');
  end if;
  if not exists (select 1 from pg_type where typname = 'notification_audience') then
    create type public.notification_audience as enum ('teachers', 'students', 'all');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null,
  full_name text not null,
  email text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  matricule text not null unique,
  full_name text not null,
  email text not null unique,
  faculty text not null,
  department text not null,
  program text not null,
  level text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  staff_id text not null unique,
  full_name text not null,
  email text not null unique,
  faculty text not null,
  department text not null,
  program text not null,
  level text,
  employment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  class_name text not null,
  subject text not null,
  created_at timestamptz not null default now(),
  unique (teacher_id, class_name, subject)
);

create table if not exists public.result_submissions (
  id uuid primary key default gen_random_uuid(),
  faculty text not null,
  department text not null,
  class_name text not null,
  subject text not null,
  academic_year text not null,
  semester text not null,
  assessment_type public.assessment_type not null,
  teacher_id uuid references public.teachers(id) on delete set null,
  teacher_name text not null,
  teacher_staff_id text not null,
  status public.submission_status not null default 'submitted',
  review_comment text not null default '',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (faculty, academic_year, semester, class_name, subject, assessment_type)
);

create table if not exists public.result_submission_marks (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.result_submissions(id) on delete cascade,
  student_id uuid references public.students(id) on delete set null,
  student_matricule text not null,
  student_name text not null,
  faculty text not null,
  department text not null,
  program text not null,
  level text,
  mark numeric(5,2) not null check (mark >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id, student_matricule)
);

create table if not exists public.result_publications (
  id uuid primary key default gen_random_uuid(),
  faculty text not null,
  academic_year text not null,
  semester text not null,
  status text not null default 'published',
  published_at timestamptz not null default now(),
  published_by uuid references public.profiles(id) on delete set null,
  unique (faculty, academic_year, semester)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  audience public.notification_audience not null,
  title text not null,
  message text not null,
  sender_role public.app_role not null default 'admin',
  sender_name text not null,
  sender_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_students_updated_at on public.students;
create trigger trg_students_updated_at
before update on public.students
for each row execute function public.set_updated_at();

drop trigger if exists trg_teachers_updated_at on public.teachers;
create trigger trg_teachers_updated_at
before update on public.teachers
for each row execute function public.set_updated_at();

drop trigger if exists trg_result_submissions_updated_at on public.result_submissions;
create trigger trg_result_submissions_updated_at
before update on public.result_submissions
for each row execute function public.set_updated_at();

drop trigger if exists trg_result_submission_marks_updated_at on public.result_submission_marks;
create trigger trg_result_submission_marks_updated_at
before update on public.result_submission_marks
for each row execute function public.set_updated_at();

drop trigger if exists trg_notifications_updated_at on public.notifications;
create trigger trg_notifications_updated_at
before update on public.notifications
for each row execute function public.set_updated_at();

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.current_user_role() = 'admin';
$$;

create or replace function public.is_teacher()
returns boolean
language sql
stable
as $$
  select public.current_user_role() = 'teacher';
$$;

create or replace function public.is_student()
returns boolean
language sql
stable
as $$
  select public.current_user_role() = 'student';
$$;

create or replace function public.can_publish_faculty_results(
  p_faculty text,
  p_academic_year text,
  p_semester text
)
returns boolean
language sql
stable
as $$
with required_pairs as (
  select distinct ta.class_name, ta.subject
  from public.teacher_assignments ta
  join public.teachers t on t.id = ta.teacher_id
  where lower(t.faculty) = lower(p_faculty)
),
required_components as (
  select class_name, subject, 'CA'::public.assessment_type as assessment_type
  from required_pairs
  union all
  select class_name, subject, 'EXAM'::public.assessment_type
  from required_pairs
),
approved_components as (
  select lower(class_name) as class_name,
         lower(subject) as subject,
         assessment_type
  from public.result_submissions
  where lower(faculty) = lower(p_faculty)
    and academic_year = p_academic_year
    and semester = p_semester
    and status = 'approved'
)
select
  exists(select 1 from required_pairs)
  and not exists (
    select 1
    from required_components rc
    where not exists (
      select 1
      from approved_components ac
      where ac.class_name = lower(rc.class_name)
        and ac.subject = lower(rc.subject)
        and ac.assessment_type = rc.assessment_type
    )
  );
$$;

create or replace view public.published_student_results as
with ca as (
  select
    rs.faculty,
    rs.academic_year,
    rs.semester,
    rs.class_name,
    rs.subject,
    rsm.student_matricule,
    rsm.student_name,
    rsm.program,
    rsm.level,
    rsm.mark as ca_mark
  from public.result_submissions rs
  join public.result_submission_marks rsm on rsm.submission_id = rs.id
  where rs.assessment_type = 'CA' and rs.status = 'approved'
),
exam as (
  select
    rs.faculty,
    rs.academic_year,
    rs.semester,
    rs.class_name,
    rs.subject,
    rsm.student_matricule,
    rsm.student_name,
    rsm.program,
    rsm.level,
    rsm.mark as exam_mark
  from public.result_submissions rs
  join public.result_submission_marks rsm on rsm.submission_id = rs.id
  where rs.assessment_type = 'EXAM' and rs.status = 'approved'
),
joined as (
  select
    coalesce(ca.faculty, exam.faculty) as faculty,
    coalesce(ca.academic_year, exam.academic_year) as academic_year,
    coalesce(ca.semester, exam.semester) as semester,
    coalesce(ca.class_name, exam.class_name) as class_name,
    coalesce(ca.subject, exam.subject) as subject,
    coalesce(ca.student_matricule, exam.student_matricule) as student_matricule,
    coalesce(ca.student_name, exam.student_name) as student_name,
    coalesce(ca.program, exam.program) as program,
    coalesce(ca.level, exam.level) as level,
    ca.ca_mark,
    exam.exam_mark
  from ca
  full outer join exam
    on lower(ca.faculty) = lower(exam.faculty)
   and ca.academic_year = exam.academic_year
   and ca.semester = exam.semester
   and lower(ca.class_name) = lower(exam.class_name)
   and lower(ca.subject) = lower(exam.subject)
   and lower(ca.student_matricule) = lower(exam.student_matricule)
)
select
  j.*,
  (coalesce(j.ca_mark, 0) + coalesce(j.exam_mark, 0))::numeric(5,2) as final_mark,
  case
    when (coalesce(j.ca_mark, 0) + coalesce(j.exam_mark, 0)) >= 70 then 'A'
    when (coalesce(j.ca_mark, 0) + coalesce(j.exam_mark, 0)) >= 60 then 'B'
    when (coalesce(j.ca_mark, 0) + coalesce(j.exam_mark, 0)) >= 50 then 'C'
    when (coalesce(j.ca_mark, 0) + coalesce(j.exam_mark, 0)) >= 45 then 'D'
    when (coalesce(j.ca_mark, 0) + coalesce(j.exam_mark, 0)) >= 40 then 'E'
    else 'F'
  end as grade,
  case
    when (coalesce(j.ca_mark, 0) + coalesce(j.exam_mark, 0)) >= 70 then 'Excellent'
    when (coalesce(j.ca_mark, 0) + coalesce(j.exam_mark, 0)) >= 60 then 'Very Good'
    when (coalesce(j.ca_mark, 0) + coalesce(j.exam_mark, 0)) >= 50 then 'Good'
    when (coalesce(j.ca_mark, 0) + coalesce(j.exam_mark, 0)) >= 40 then 'Pass'
    else 'Fail'
  end as remark
from joined j
join public.result_publications rp
  on lower(rp.faculty) = lower(j.faculty)
 and rp.academic_year = j.academic_year
 and rp.semester = j.semester
 and rp.status = 'published';

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.teachers enable row level security;
alter table public.teacher_assignments enable row level security;
alter table public.result_submissions enable row level security;
alter table public.result_submission_marks enable row level security;
alter table public.result_publications enable row level security;
alter table public.notifications enable row level security;

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all
on public.profiles
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read
on public.profiles
for select
using (id = auth.uid());

drop policy if exists students_admin_all on public.students;
create policy students_admin_all
on public.students
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists students_self_read on public.students;
create policy students_self_read
on public.students
for select
using (
  profile_id = auth.uid()
  or lower(email) = lower((select email from public.profiles where id = auth.uid()))
);

drop policy if exists teachers_admin_all on public.teachers;
create policy teachers_admin_all
on public.teachers
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists teachers_self_read on public.teachers;
create policy teachers_self_read
on public.teachers
for select
using (
  profile_id = auth.uid()
  or lower(email) = lower((select email from public.profiles where id = auth.uid()))
);

drop policy if exists assignments_admin_all on public.teacher_assignments;
create policy assignments_admin_all
on public.teacher_assignments
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists assignments_teacher_read on public.teacher_assignments;
create policy assignments_teacher_read
on public.teacher_assignments
for select
using (
  teacher_id in (
    select t.id
    from public.teachers t
    where t.profile_id = auth.uid()
       or lower(t.email) = lower((select email from public.profiles where id = auth.uid()))
  )
);

drop policy if exists submissions_admin_all on public.result_submissions;
create policy submissions_admin_all
on public.result_submissions
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists submissions_teacher_select on public.result_submissions;
create policy submissions_teacher_select
on public.result_submissions
for select
using (
  teacher_id in (
    select t.id
    from public.teachers t
    where t.profile_id = auth.uid()
       or lower(t.email) = lower((select email from public.profiles where id = auth.uid()))
  )
);

drop policy if exists submissions_teacher_insert on public.result_submissions;
create policy submissions_teacher_insert
on public.result_submissions
for insert
with check (
  public.is_teacher()
  and teacher_id in (
    select t.id
    from public.teachers t
    where t.profile_id = auth.uid()
       or lower(t.email) = lower((select email from public.profiles where id = auth.uid()))
  )
);

drop policy if exists submission_marks_admin_all on public.result_submission_marks;
create policy submission_marks_admin_all
on public.result_submission_marks
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists submission_marks_teacher_select on public.result_submission_marks;
create policy submission_marks_teacher_select
on public.result_submission_marks
for select
using (
  submission_id in (
    select rs.id
    from public.result_submissions rs
    join public.teachers t on t.id = rs.teacher_id
    where t.profile_id = auth.uid()
       or lower(t.email) = lower((select email from public.profiles where id = auth.uid()))
  )
);

drop policy if exists submission_marks_teacher_insert on public.result_submission_marks;
create policy submission_marks_teacher_insert
on public.result_submission_marks
for insert
with check (
  submission_id in (
    select rs.id
    from public.result_submissions rs
    join public.teachers t on t.id = rs.teacher_id
    where t.profile_id = auth.uid()
       or lower(t.email) = lower((select email from public.profiles where id = auth.uid()))
  )
);

drop policy if exists publications_admin_all on public.result_publications;
create policy publications_admin_all
on public.result_publications
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists publications_read_all on public.result_publications;
create policy publications_read_all
on public.result_publications
for select
using (true);

drop policy if exists notifications_admin_all on public.notifications;
create policy notifications_admin_all
on public.notifications
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists notifications_teacher_read on public.notifications;
create policy notifications_teacher_read
on public.notifications
for select
using (
  audience in ('all', 'teachers')
  and public.is_teacher()
);

drop policy if exists notifications_student_read on public.notifications;
create policy notifications_student_read
on public.notifications
for select
using (
  audience in ('all', 'students')
  and public.is_student()
);
