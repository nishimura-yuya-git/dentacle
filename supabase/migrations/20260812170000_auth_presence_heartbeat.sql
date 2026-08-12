-- ログイン監査: ハートビート在席（ユーザー単位）

create table if not exists public.auth_presence (
  user_id uuid primary key references auth.users (id) on delete cascade,
  clinic_id uuid references public.clinics (id) on delete set null,
  ip text,
  user_agent text,
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_auth_presence_last_seen
  on public.auth_presence (last_seen_at desc);

alter table public.auth_presence enable row level security;

-- 本人は自分の行だけ触れる（主経路は RPC）。閲覧は運営のみ
drop policy if exists auth_presence_own_upsert on public.auth_presence;
create policy auth_presence_own_upsert
  on public.auth_presence for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists auth_presence_own_update on public.auth_presence;
create policy auth_presence_own_update
  on public.auth_presence for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists auth_presence_own_delete on public.auth_presence;
create policy auth_presence_own_delete
  on public.auth_presence for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists auth_presence_platform_admin_select on public.auth_presence;
create policy auth_presence_platform_admin_select
  on public.auth_presence for select to authenticated
  using (public.is_platform_admin());

revoke all on table public.auth_presence from anon, authenticated;
grant select, insert, update, delete on table public.auth_presence to authenticated;

-- ---------------------------------------------------------------------------
-- ハートビート（IP/UA は headers。clinic は検証付き）
-- ---------------------------------------------------------------------------
create or replace function public.touch_auth_presence(p_clinic_id uuid default null)
returns void
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
begin
  if v_uid is null then
    raise exception 'ログインが必要です';
  end if;

  v_ip := public.request_client_ip();

  begin
    v_headers := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  exception when others then
    v_headers := '{}'::jsonb;
  end;
  v_ua := nullif(left(coalesce(v_headers->>'user-agent', ''), 500), '');

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

  insert into public.auth_presence as p (user_id, clinic_id, ip, user_agent, last_seen_at, updated_at)
  values (v_uid, v_clinic_id, v_ip, v_ua, now(), now())
  on conflict (user_id) do update
  set clinic_id = excluded.clinic_id,
      ip = excluded.ip,
      user_agent = excluded.user_agent,
      last_seen_at = now(),
      updated_at = now();
end;
$$;

revoke all on function public.touch_auth_presence(uuid) from public, anon;
grant execute on function public.touch_auth_presence(uuid) to authenticated;

comment on function public.touch_auth_presence(uuid) is
  '在席ハートビート。ユーザー単位で upsert。IP/UAは headers';

create or replace function public.clear_auth_presence()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  delete from public.auth_presence where user_id = auth.uid();
end;
$$;

revoke all on function public.clear_auth_presence() from public, anon;
grant execute on function public.clear_auth_presence() to authenticated;

-- ---------------------------------------------------------------------------
-- 運営向け: 直近 N 秒以内の在席一覧（ユーザー単位）
-- ---------------------------------------------------------------------------
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
  if not public.is_platform_admin() then
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

revoke all on function public.list_auth_presence(integer) from public, anon;
grant execute on function public.list_auth_presence(integer) to authenticated;

comment on function public.list_auth_presence(integer) is
  '運営のみ。直近 N 秒以内のハートビート在席（ユーザー単位）';
