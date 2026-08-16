-- 運営の書込・一覧 RPC を AAL2 必須にする。シグネチャは変えない。
-- is_request_ip_blocked の運営バイパスは身分判定のまま（ロックアウト回避）。

create or replace function public.list_platform_admins()
returns table (
  user_id uuid,
  email text,
  display_name text,
  note text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'ログインが必要です';
  end if;
  if not public.is_platform_admin_aal2() then
    raise exception '権限がありません';
  end if;

  return query
  select
    pa.user_id,
    nullif(trim(pr.email), '')::text,
    nullif(trim(pr.display_name), '')::text,
    nullif(trim(pa.note), '')::text,
    pa.created_at
  from public.platform_admins pa
  left join public.profiles pr on pr.id = pa.user_id
  order by pa.created_at asc, pa.user_id asc;
end;
$$;

create or replace function public.grant_platform_admin(p_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_target uuid;
begin
  if v_uid is null then
    raise exception 'ログインが必要です';
  end if;
  if not public.is_platform_admin_aal2() then
    raise exception '権限がありません';
  end if;
  if p_email is null or char_length(trim(p_email)) = 0 then
    raise exception 'メールアドレスを入力してください';
  end if;

  select p.id into v_target
  from public.profiles p
  where lower(p.email) = lower(trim(p_email))
    and p.deleted_at is null
  limit 1;

  if v_target is null then
    raise exception '該当するユーザーが見つかりません。先にログインできるアカウントを作成してください';
  end if;

  if public.is_platform_admin_user(v_target) then
    raise exception 'すでに運営です';
  end if;

  if exists (
    select 1
    from public.clinic_members cm
    where cm.user_id = v_target
      and cm.status = 'active'
      and cm.deleted_at is null
      and (cm.ended_at is null or cm.ended_at > now())
  ) then
    raise exception 'クリニックの所属がある人には運営を付けられません';
  end if;

  insert into public.platform_admins (user_id, created_by)
  values (v_target, v_uid);

  return v_target;
end;
$$;

create or replace function public.revoke_platform_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_count integer;
begin
  if v_uid is null then
    raise exception 'ログインが必要です';
  end if;
  if not public.is_platform_admin_aal2() then
    raise exception '権限がありません';
  end if;
  if p_user_id is null then
    raise exception '対象が指定されていません';
  end if;
  if p_user_id = v_uid then
    raise exception '自分自身は外せません';
  end if;

  select count(*) into v_count from public.platform_admins;
  if v_count <= 1 then
    raise exception '最後の運営は外せません';
  end if;

  if not public.is_platform_admin_user(p_user_id) then
    raise exception '該当する運営が見つかりません';
  end if;

  delete from public.platform_admins where user_id = p_user_id;
end;
$$;

create or replace function public.update_platform_admin(
  p_user_id uuid,
  p_display_name text,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_note text;
begin
  if auth.uid() is null then
    raise exception 'ログインが必要です';
  end if;
  if not public.is_platform_admin_aal2() then
    raise exception '権限がありません';
  end if;
  if p_user_id is null then
    raise exception '対象が指定されていません';
  end if;
  if not public.is_platform_admin_user(p_user_id) then
    raise exception '該当する運営が見つかりません';
  end if;

  v_name := nullif(trim(coalesce(p_display_name, '')), '');
  v_note := nullif(trim(coalesce(p_note, '')), '');

  if v_name is not null and char_length(v_name) > 80 then
    raise exception '表示名は80文字以内にしてください';
  end if;
  if v_note is not null and char_length(v_note) > 200 then
    raise exception 'メモは200文字以内にしてください';
  end if;

  update public.profiles
  set display_name = v_name
  where id = p_user_id
    and deleted_at is null;

  if not found then
    raise exception '該当するユーザーが見つかりません';
  end if;

  update public.platform_admins
  set note = v_note
  where user_id = p_user_id;
end;
$$;

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
  if not public.is_platform_admin_aal2() then
    raise exception 'クリニックの作成は運営のみ実行できます';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'クリニック名は必須です';
  end if;

  insert into public.clinics (name, code, created_by, updated_by)
  values (trim(p_name), nullif(trim(p_code), ''), v_uid, v_uid)
  returning id into v_clinic_id;

  return v_clinic_id;
end;
$$;

create or replace function public.block_auth_ip(p_ip text, p_reason text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ip text := nullif(trim(p_ip), '');
  v_id uuid;
begin
  if not public.is_platform_admin_aal2() then
    raise exception '権限がありません';
  end if;
  if v_ip is null then
    raise exception 'IPが不正です';
  end if;

  update public.auth_ip_blocks
  set is_active = false,
      deactivated_at = now(),
      deactivated_by = auth.uid(),
      updated_at = now()
  where ip = v_ip
    and is_active;

  insert into public.auth_ip_blocks (ip, reason, created_by)
  values (v_ip, nullif(trim(coalesce(p_reason, '')), ''), auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.unblock_auth_ip(p_ip text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ip text := nullif(trim(p_ip), '');
  v_count integer;
begin
  if not public.is_platform_admin_aal2() then
    raise exception '権限がありません';
  end if;
  if v_ip is null then
    raise exception 'IPが不正です';
  end if;

  update public.auth_ip_blocks
  set is_active = false,
      deactivated_at = now(),
      deactivated_by = auth.uid(),
      updated_at = now()
  where ip = v_ip
    and is_active;

  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

create or replace function public.list_auth_presence(p_within_seconds integer default 60)
returns table (
  user_id uuid,
  display_name text,
  email text,
  clinic_id uuid,
  clinic_name text,
  ip text,
  user_agent text,
  last_seen_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_seconds integer := greatest(coalesce(p_within_seconds, 60), 15);
begin
  if not public.is_platform_admin_aal2() then
    raise exception '権限がありません';
  end if;

  return query
  select
    p.user_id,
    nullif(trim(pr.display_name), '')::text,
    nullif(trim(pr.email), '')::text,
    p.clinic_id,
    c.name::text,
    p.ip,
    p.user_agent,
    p.last_seen_at
  from public.auth_presence p
  left join public.profiles pr on pr.id = p.user_id
  left join public.clinics c on c.id = p.clinic_id
  where p.last_seen_at >= now() - make_interval(secs => v_seconds)
  order by p.last_seen_at desc;
end;
$$;
