-- S-10: クリニック作成は運営（platform_admins）のみ
create or replace function public.create_clinic_with_owner(
  p_name text,
  p_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clinic_id uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'ログインが必要です';
  end if;
  if not public.is_platform_admin() then
    raise exception 'クリニックの作成は運営のみ実行できます';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'クリニック名は必須です';
  end if;

  insert into public.clinics (name, code, created_by, updated_by)
  values (trim(p_name), nullif(trim(p_code), ''), v_uid, v_uid)
  returning id into v_clinic_id;

  -- 運営は clinic_members に載せない（§6.29）
  return v_clinic_id;
end;
$$;

comment on function public.create_clinic_with_owner(text, text) is
  'クリニック作成。運営（platform_admins）のみ。owner 所属は作らない。';

-- 直接 INSERT の穴を塞ぐ（RPC は SECURITY DEFINER で継続）
drop policy if exists clinics_insert_authenticated on public.clinics;
create policy clinics_insert_platform_admin
  on public.clinics for insert to authenticated
  with check (public.is_platform_admin());
