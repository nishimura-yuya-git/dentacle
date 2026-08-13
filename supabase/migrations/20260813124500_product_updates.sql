-- お知らせ（製品更新）: 実装・デプロイしただけでは公開しない。
-- 正: 提案（proposed）→ 運営が入れる（published）または入れない（rejected）
-- 院ユーザーが見られるのは published のみ。

create table public.product_updates (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'proposed'
    check (status in ('proposed', 'published', 'rejected')),
  kind text not null
    check (kind in ('feature', 'improve', 'fix')),
  title text not null
    check (char_length(trim(title)) between 1 and 200),
  body text
    check (body is null or char_length(body) <= 2000),
  detail_url text
    check (
      detail_url is null
      or detail_url ~ '^(https?://|/)'
    ),
  surfaces text[] not null default '{}'::text[]
    check (
      surfaces <@ array[
        'all',
        'calendar',
        'patients',
        'contacts',
        'users',
        'settings',
        'import'
      ]::text[]
    ),
  update_number integer,
  proposed_at timestamptz not null default now(),
  proposed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_updates_number_when_published check (
    (
      status = 'published'
      and update_number is not null
      and published_at is not null
    )
    or (
      status <> 'published'
      and update_number is null
    )
  )
);

comment on table public.product_updates is
  '製品お知らせ。提案中は院に出さない。公開は運営の入れる操作のみ。';

create unique index product_updates_update_number_uidx
  on public.product_updates (update_number)
  where update_number is not null;

create index product_updates_status_published_at_idx
  on public.product_updates (status, published_at desc);

create index product_updates_status_proposed_at_idx
  on public.product_updates (status, proposed_at desc);

create trigger set_product_updates_updated_at
  before update on public.product_updates
  for each row execute function public.set_updated_at();

alter table public.product_updates enable row level security;

revoke all on table public.product_updates from anon, authenticated;
grant select on table public.product_updates to authenticated;

create policy product_updates_select_published_or_admin
  on public.product_updates
  for select
  to authenticated
  using (
    status = 'published'
    or public.is_platform_admin()
  );

-- ---------------------------------------------------------------------------
-- 提案する（公開しない）
-- ---------------------------------------------------------------------------
create or replace function public.propose_product_update(
  p_kind text,
  p_title text,
  p_body text default null,
  p_detail_url text default null,
  p_surfaces text[] default '{}'::text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_title text := trim(coalesce(p_title, ''));
  v_body text := nullif(trim(coalesce(p_body, '')), '');
  v_url text := nullif(trim(coalesce(p_detail_url, '')), '');
  v_surfaces text[] := coalesce(p_surfaces, '{}'::text[]);
begin
  if not public.is_platform_admin() then
    raise exception '権限がありません';
  end if;

  if v_title = '' then
    raise exception '見出しを入力してください';
  end if;

  insert into public.product_updates (
    status,
    kind,
    title,
    body,
    detail_url,
    surfaces,
    proposed_by
  )
  values (
    'proposed',
    p_kind,
    v_title,
    v_body,
    v_url,
    v_surfaces,
    auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.propose_product_update(text, text, text, text, text[]) from public, anon;
grant execute on function public.propose_product_update(text, text, text, text, text[]) to authenticated;

comment on function public.propose_product_update(text, text, text, text, text[]) is
  'お知らせを提案する。この時点では院ユーザーの画面に出ない。';

-- ---------------------------------------------------------------------------
-- 入れる（公開）
-- ---------------------------------------------------------------------------
create or replace function public.publish_product_update(p_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_number integer;
begin
  if not public.is_platform_admin() then
    raise exception '権限がありません';
  end if;

  select coalesce(max(update_number), 0) + 1
    into v_number
  from public.product_updates;

  update public.product_updates
  set
    status = 'published',
    update_number = v_number,
    published_at = now(),
    reviewed_at = now(),
    reviewed_by = auth.uid()
  where id = p_id
    and status = 'proposed';

  if not found then
    raise exception '提案中の更新だけ入れられます';
  end if;

  return v_number;
end;
$$;

revoke all on function public.publish_product_update(uuid) from public, anon;
grant execute on function public.publish_product_update(uuid) to authenticated;

comment on function public.publish_product_update(uuid) is
  '提案中のお知らせを公開する。通し番号をここで初めて付ける。';

-- ---------------------------------------------------------------------------
-- 入れない
-- ---------------------------------------------------------------------------
create or replace function public.reject_product_update(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception '権限がありません';
  end if;

  update public.product_updates
  set
    status = 'rejected',
    reviewed_at = now(),
    reviewed_by = auth.uid()
  where id = p_id
    and status = 'proposed';

  if not found then
    raise exception '提案中の更新だけ判定できます';
  end if;

  return true;
end;
$$;

revoke all on function public.reject_product_update(uuid) from public, anon;
grant execute on function public.reject_product_update(uuid) to authenticated;

comment on function public.reject_product_update(uuid) is
  '提案中のお知らせを入れない。院ユーザーの画面には出ない。';
