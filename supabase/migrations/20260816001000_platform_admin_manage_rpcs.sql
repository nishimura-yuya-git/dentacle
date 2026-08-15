-- 運営の一覧・付与・解除。院のユーザー管理とは別。
-- 書込は RPC のみ。最後の1人と自分自身は外せない。

revoke insert, delete on table public.platform_admins from authenticated;
grant select on table public.platform_admins to authenticated;

create or replace function public.list_platform_admins()
returns table (
  user_id uuid,
  email text,
  display_name text,
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
  if not public.is_platform_admin() then
    raise exception '権限がありません';
  end if;

  return query
  select
    pa.user_id,
    nullif(trim(pr.email), '')::text,
    nullif(trim(pr.display_name), '')::text,
    pa.created_at
  from public.platform_admins pa
  left join public.profiles pr on pr.id = pa.user_id
  order by pa.created_at asc, pa.user_id asc;
end;
$$;

revoke all on function public.list_platform_admins() from public, anon;
grant execute on function public.list_platform_admins() to authenticated;

comment on function public.list_platform_admins() is
  '運営一覧。運営のみ。profiles のメールは RPC 内で読む。';

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
  if not public.is_platform_admin() then
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

revoke all on function public.grant_platform_admin(text) from public, anon;
grant execute on function public.grant_platform_admin(text) to authenticated;

comment on function public.grant_platform_admin(text) is
  'メールで運営を付与。既存アカウントのみ。クリニック所属者は不可。';

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
  if not public.is_platform_admin() then
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

revoke all on function public.revoke_platform_admin(uuid) from public, anon;
grant execute on function public.revoke_platform_admin(uuid) to authenticated;

comment on function public.revoke_platform_admin(uuid) is
  '運営を外す。自分と最後の1人は不可。';
