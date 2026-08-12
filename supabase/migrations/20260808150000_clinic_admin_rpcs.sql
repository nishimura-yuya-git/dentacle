-- クリニック管理 RPC（所属紐づけ / 作成）

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
  if coalesce(trim(p_name), '') = '' then
    raise exception 'クリニック名は必須です';
  end if;

  insert into public.clinics (name, code, created_by, updated_by)
  values (trim(p_name), nullif(trim(p_code), ''), v_uid, v_uid)
  returning id into v_clinic_id;

  insert into public.clinic_members (
    clinic_id, user_id, role, status, created_by, updated_by
  ) values (
    v_clinic_id, v_uid, 'owner', 'active', v_uid, v_uid
  );

  return v_clinic_id;
end;
$$;

create or replace function public.add_clinic_member_by_email(
  p_clinic_id uuid,
  p_email text,
  p_role text default 'coordinator'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_target uuid;
  v_member_id uuid;
begin
  if v_uid is null then
    raise exception 'ログインが必要です';
  end if;
  if not public.is_clinic_admin(p_clinic_id) then
    raise exception '管理者のみ実行できます';
  end if;
  if p_role not in ('owner', 'admin', 'coordinator', 'call', 'doctor', 'dh') then
    raise exception '不正な役割です';
  end if;

  select p.id into v_target
  from public.profiles p
  where lower(p.email) = lower(trim(p_email))
    and p.deleted_at is null
  limit 1;

  if v_target is null then
    raise exception '該当するユーザーが見つかりません。先に管理者画面でアカウントを作成してください';
  end if;

  if exists (
    select 1 from public.clinic_members cm
    where cm.clinic_id = p_clinic_id
      and cm.user_id = v_target
      and cm.status = 'active'
      and cm.deleted_at is null
      and (cm.ended_at is null or cm.ended_at > now())
  ) then
    raise exception 'すでに所属しています';
  end if;

  insert into public.clinic_members (
    clinic_id, user_id, role, status, created_by, updated_by
  ) values (
    p_clinic_id, v_target, p_role, 'active', v_uid, v_uid
  )
  returning id into v_member_id;

  return v_member_id;
end;
$$;

revoke all on function public.create_clinic_with_owner(text, text) from public, anon;
revoke all on function public.add_clinic_member_by_email(uuid, text, text) from public, anon;
grant execute on function public.create_clinic_with_owner(text, text) to authenticated;
grant execute on function public.add_clinic_member_by_email(uuid, text, text) to authenticated;
