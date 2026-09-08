create extension if not exists pgcrypto;

create type public.project_status as enum ('draft', 'open', 'closed');
create type public.application_status as enum ('pending', 'approved', 'rejected', 'withdrawn');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  school text not null default '',
  major text not null default '',
  bio text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (char_length(display_name) <= 40),
  constraint profiles_bio_length check (char_length(bio) <= 300)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  category text not null,
  goal text not null,
  weekly_commitment text not null,
  location text not null default '待完善地点',
  needed_members smallint not null default 1,
  skills text[] not null default '{}',
  status public.project_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_title_length check (char_length(title) between 4 and 50),
  constraint projects_description_length check (char_length(description) between 10 and 300),
  constraint projects_needed_members_range check (needed_members between 1 and 20),
  constraint projects_skills_count check (cardinality(skills) between 1 and 5)
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  message text not null default '',
  status public.application_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applications_message_length check (char_length(message) <= 500),
  constraint applications_unique_applicant unique (project_id, applicant_id)
);

create table public.saved_projects (
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

create index projects_status_created_at_idx on public.projects(status, created_at desc);
create index projects_owner_id_idx on public.projects(owner_id);
create index applications_project_id_idx on public.applications(project_id, created_at desc);
create index applications_applicant_id_idx on public.applications(applicant_id, created_at desc);
create index saved_projects_user_id_idx on public.saved_projects(user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects
for each row execute function public.set_updated_at();
create trigger applications_set_updated_at before update on public.applications
for each row execute function public.set_updated_at();

create or replace function public.protect_project_ownership()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_id <> old.owner_id then
    raise exception 'project owner cannot be changed';
  end if;
  return new;
end;
$$;

create trigger projects_protect_ownership
before update on public.projects
for each row execute function public.protect_project_ownership();

create or replace function public.validate_application_update()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  project_owner uuid;
begin
  if new.project_id <> old.project_id or new.applicant_id <> old.applicant_id then
    raise exception 'application ownership cannot be changed';
  end if;
  if new.message <> old.message then
    raise exception 'application message cannot be changed';
  end if;
  if old.status <> 'pending' then
    raise exception 'reviewed applications cannot be changed';
  end if;

  select owner_id into project_owner
  from public.projects
  where id = old.project_id;

  if (select auth.uid()) = old.applicant_id and new.status = 'withdrawn' then
    return new;
  end if;
  if (select auth.uid()) = project_owner and new.status in ('approved', 'rejected') then
    return new;
  end if;
  raise exception 'invalid application status transition';
end;
$$;

create trigger applications_validate_update
before update on public.applications
for each row execute function public.validate_application_update();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.applications enable row level security;
alter table public.saved_projects enable row level security;

create policy "profiles are publicly readable"
on public.profiles for select
to anon, authenticated
using (true);

create policy "users update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "open projects are publicly readable"
on public.projects for select
to anon, authenticated
using (status = 'open' or owner_id = (select auth.uid()));

create policy "authenticated users create their projects"
on public.projects for insert
to authenticated
with check (owner_id = (select auth.uid()));

create policy "owners update their projects"
on public.projects for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "owners delete their projects"
on public.projects for delete
to authenticated
using (owner_id = (select auth.uid()));

create policy "applicants and project owners read applications"
on public.applications for select
to authenticated
using (
  applicant_id = (select auth.uid())
  or exists (
    select 1 from public.projects
    where projects.id = applications.project_id
      and projects.owner_id = (select auth.uid())
  )
);

create policy "users apply to other users projects"
on public.applications for insert
to authenticated
with check (
  applicant_id = (select auth.uid())
  and exists (
    select 1 from public.projects
    where projects.id = applications.project_id
      and projects.status = 'open'
      and projects.owner_id <> (select auth.uid())
  )
);

create policy "applicants withdraw pending applications"
on public.applications for update
to authenticated
using (applicant_id = (select auth.uid()) and status = 'pending')
with check (applicant_id = (select auth.uid()) and status = 'withdrawn');

create policy "project owners review applications"
on public.applications for update
to authenticated
using (
  exists (
    select 1 from public.projects
    where projects.id = applications.project_id
      and projects.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.projects
    where projects.id = applications.project_id
      and projects.owner_id = (select auth.uid())
  )
);

create policy "users read their saved projects"
on public.saved_projects for select
to authenticated
using (user_id = (select auth.uid()));

create policy "users save projects for themselves"
on public.saved_projects for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "users remove their saved projects"
on public.saved_projects for delete
to authenticated
using (user_id = (select auth.uid()));
