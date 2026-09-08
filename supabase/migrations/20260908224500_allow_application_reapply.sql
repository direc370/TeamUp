drop policy if exists "applicants withdraw pending applications" on public.applications;

create policy "applicants manage their pending applications"
on public.applications for update
to authenticated
using (
  applicant_id = (select auth.uid())
  and status in ('pending', 'withdrawn')
)
with check (
  applicant_id = (select auth.uid())
  and status in ('pending', 'withdrawn')
);
