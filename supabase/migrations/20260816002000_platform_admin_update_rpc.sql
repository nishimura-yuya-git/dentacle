-- 運営の編集。表示名は profiles、メモは platform_admins.note。
-- メール変更はしない。grant / revoke のシグネチャは変えない。
-- 書込は RPC のみ。authenticated に UPDATE は付けない。

revoke update on table public.platform_admins from authenticated;

drop function if exists public.list_platform_admins();

create function public.list_platform_admins()
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
  if not public.is_platform_admin() then
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

revoke all on function public.list_platform_admins() from public, anon;
grant execute on function public.list_platform_admins() to authenticated;

comment on function public.list_platform_admins() is
  '運営一覧。運営のみ。profiles のメールと platform_admins.note を RPC 内で読む。';

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
  if not public.is_platform_admin() then
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

revoke all on function public.update_platform_admin(uuid, text, text) from public, anon;
grant execute on function public.update_platform_admin(uuid, text, text) to authenticated;

comment on function public.update_platform_admin(uuid, text, text) is
  '運営の表示名とメモを更新。メールは変えない。運営のみ。';
