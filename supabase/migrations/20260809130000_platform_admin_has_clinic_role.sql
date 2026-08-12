-- 運営も has_clinic_role を満たし、患者CSV種まき等の書込 RLS を通せるようにする

create or replace function public.has_clinic_role(p_clinic_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.clinic_members cm
      where cm.clinic_id = p_clinic_id
        and cm.user_id = auth.uid()
        and cm.role = any (p_roles)
        and cm.status = 'active'
        and cm.deleted_at is null
        and (cm.ended_at is null or cm.ended_at > now())
    );
$$;
