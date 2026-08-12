-- ログイン監査: clinic_id / 所属スナップショット記録 + IPブロック

-- ---------------------------------------------------------------------------
-- 共通: request headers からクライアントIP
-- ---------------------------------------------------------------------------
create or replace function public.request_client_ip()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_headers jsonb := '{}'::jsonb;
  v_ip text;
begin
  begin
    v_headers := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  exception when others then
    v_headers := '{}'::jsonb;
  end;

  v_ip := nullif(trim(split_part(coalesce(
    v_headers->>'x-forwarded-for',
    v_headers->>'cf-connecting-ip',
    v_headers->>'x-real-ip',
    ''
  ), ',', 1)), '');

  return v_ip;
end;
$$;

revoke all on function public.request_client_ip() from public, anon;
grant execute on function public.request_client_ip() to authenticated;

comment on function public.request_client_ip() is
  'PostgREST request.headers からクライアントIP（先頭）を返す';

-- ---------------------------------------------------------------------------
-- IPブロック表
-- ---------------------------------------------------------------------------
create table if not exists public.auth_ip_blocks (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  reason text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_at timestamptz not null default now(),
  deactivated_at timestamptz,
  deactivated_by uuid references auth.users (id),
  metadata jsonb not null default '{}'::jsonb,
  constraint auth_ip_blocks_ip_nonempty check (length(trim(ip)) > 0)
);

create unique index if not exists uq_auth_ip_blocks_active_ip
  on public.auth_ip_blocks (ip)
  where is_active;

create index if not exists idx_auth_ip_blocks_ip on public.auth_ip_blocks (ip);

alter table public.auth_ip_blocks enable row level security;

drop policy if exists auth_ip_blocks_platform_admin_all on public.auth_ip_blocks;
create policy auth_ip_blocks_platform_admin_all
  on public.auth_ip_blocks for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

revoke all on table public.auth_ip_blocks from anon, authenticated;
grant select, insert, update on table public.auth_ip_blocks to authenticated;

-- ---------------------------------------------------------------------------
-- IPブロック判定（運営はロックアウト回避のためバイパス）
-- ---------------------------------------------------------------------------
create or replace function public.is_request_ip_blocked()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ip text := public.request_client_ip();
begin
  if auth.uid() is null then
    return false;
  end if;
  -- 運営は解除操作のためバイパス（§運用）
  if public.is_platform_admin() then
    return false;
  end if;
  if v_ip is null then
    return false;
  end if;
  return exists (
    select 1
    from public.auth_ip_blocks b
    where b.is_active
      and b.ip = v_ip
  );
end;
$$;

revoke all on function public.is_request_ip_blocked() from public, anon;
grant execute on function public.is_request_ip_blocked() to authenticated;

comment on function public.is_request_ip_blocked() is
  '現在リクエストIPがブロック中か。運営は常に false（ロックアウト回避）';

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
  if not public.is_platform_admin() then
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

revoke all on function public.block_auth_ip(text, text) from public, anon;
grant execute on function public.block_auth_ip(text, text) to authenticated;

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
  if not public.is_platform_admin() then
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

revoke all on function public.unblock_auth_ip(text) from public, anon;
grant execute on function public.unblock_auth_ip(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 監査記録: clinic_id + 所属スナップショット
-- ---------------------------------------------------------------------------
drop function if exists public.log_auth_audit_event(text);

create or replace function public.log_auth_audit_event(
  p_event text,
  p_clinic_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ip text;
  v_ua text;
  v_headers jsonb := '{}'::jsonb;
  v_clinic_id uuid := null;
  v_memberships jsonb := '[]'::jsonb;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'ログインが必要です';
  end if;
  if p_event not in ('login_success', 'logout') then
    raise exception '不正なイベントです';
  end if;

  v_ip := public.request_client_ip();

  begin
    v_headers := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  exception when others then
    v_headers := '{}'::jsonb;
  end;
  v_ua := nullif(left(coalesce(v_headers->>'user-agent', ''), 500), '');

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'clinic_id', cm.clinic_id,
        'clinic_name', c.name,
        'role', cm.role
      )
      order by c.name
    ),
    '[]'::jsonb
  )
  into v_memberships
  from public.clinic_members cm
  join public.clinics c on c.id = cm.clinic_id
  where cm.user_id = v_uid
    and cm.status = 'active'
    and cm.deleted_at is null
    and c.deleted_at is null;

  if p_clinic_id is not null then
    if public.is_platform_admin()
       or exists (
         select 1
         from public.clinic_members cm
         where cm.user_id = v_uid
           and cm.clinic_id = p_clinic_id
           and cm.status = 'active'
           and cm.deleted_at is null
       )
    then
      v_clinic_id := p_clinic_id;
    end if;
  end if;

  -- 未指定時: 所属が1院だけならそれを採用
  if v_clinic_id is null and jsonb_array_length(v_memberships) = 1 then
    v_clinic_id := (v_memberships->0->>'clinic_id')::uuid;
  end if;

  insert into public.auth_audit_logs (user_id, clinic_id, event, ip, user_agent, metadata)
  values (
    v_uid,
    v_clinic_id,
    p_event,
    v_ip,
    v_ua,
    jsonb_build_object('memberships', v_memberships)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.log_auth_audit_event(text, uuid) from public, anon;
grant execute on function public.log_auth_audit_event(text, uuid) to authenticated;

comment on function public.log_auth_audit_event(text, uuid) is
  '認証監査の記録。IP/UAはheaders。clinic_idは検証付き。metadata.membershipsに所属スナップショット';
