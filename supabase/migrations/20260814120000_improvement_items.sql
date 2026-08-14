-- 改善の進捗（運営専用）。ご意見送信成功後に1行作る。院には出さない。

create table public.improvement_items (
  id uuid primary key default gen_random_uuid(),
  feedback_thread_id uuid not null unique
    references public.feedback_threads (id) on delete restrict,
  clinic_id uuid references public.clinics (id) on delete set null,
  github_issue_number integer,
  github_issue_url text,
  share_title text not null
    check (char_length(trim(share_title)) between 1 and 200),
  share_summary text
    check (share_summary is null or char_length(share_summary) <= 2000),
  page_path text,
  status text not null default 'received'
    check (status in ('received', 'reviewing', 'in_progress', 'done', 'wont_fix')),
  status_changed_at timestamptz,
  status_changed_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.improvement_items is
  'ご意見の進捗共有。閲覧は運営のみ。正の開発記録は GitHub Issue。';

create index improvement_items_status_created_at_idx
  on public.improvement_items (status, created_at desc);

create index improvement_items_created_at_idx
  on public.improvement_items (created_at desc);

create trigger set_improvement_items_updated_at
  before update on public.improvement_items
  for each row execute function public.set_updated_at();

alter table public.improvement_items enable row level security;

revoke all on table public.improvement_items from anon, authenticated;
grant select on table public.improvement_items to authenticated;

create policy improvement_items_select_platform_admin
  on public.improvement_items
  for select
  to authenticated
  using (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- ご意見スレッドから進捗行を作る（本人または運営。既存があればそのID）
-- ---------------------------------------------------------------------------
create or replace function public.create_improvement_item_for_thread(p_thread_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_thread public.feedback_threads%rowtype;
  v_id uuid;
  v_summary text;
begin
  if auth.uid() is null then
    raise exception '権限がありません';
  end if;

  select *
    into v_thread
  from public.feedback_threads
  where id = p_thread_id;

  if not found then
    raise exception '対象のご意見が見つかりません';
  end if;

  if v_thread.user_id <> auth.uid()
     and not public.is_platform_admin() then
    raise exception '権限がありません';
  end if;

  select id into v_id
  from public.improvement_items
  where feedback_thread_id = p_thread_id;

  if found then
    return v_id;
  end if;

  select left(trim(body), 2000)
    into v_summary
  from public.feedback_messages
  where thread_id = p_thread_id
    and author_role = 'user'
  order by created_at
  limit 1;

  insert into public.improvement_items (
    feedback_thread_id,
    clinic_id,
    github_issue_number,
    github_issue_url,
    share_title,
    share_summary,
    page_path,
    status
  )
  values (
    v_thread.id,
    v_thread.clinic_id,
    v_thread.github_issue_number,
    v_thread.github_issue_url,
    v_thread.title,
    nullif(trim(coalesce(v_summary, '')), ''),
    v_thread.page_path,
    'received'
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_improvement_item_for_thread(uuid) from public, anon;
grant execute on function public.create_improvement_item_for_thread(uuid) to authenticated;

comment on function public.create_improvement_item_for_thread(uuid) is
  'ご意見スレッドから進捗行を作る。本人または運営。既存があればそのIDを返す。';

-- ---------------------------------------------------------------------------
-- 状態変更（運営のみ）
-- ---------------------------------------------------------------------------
create or replace function public.set_improvement_item_status(
  p_id uuid,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception '権限がありません';
  end if;

  if p_status not in ('received', 'reviewing', 'in_progress', 'done', 'wont_fix') then
    raise exception '状態が不正です';
  end if;

  update public.improvement_items
  set
    status = p_status,
    status_changed_at = now(),
    status_changed_by = auth.uid()
  where id = p_id;

  if not found then
    raise exception '対象の進捗が見つかりません';
  end if;

  return true;
end;
$$;

revoke all on function public.set_improvement_item_status(uuid, text) from public, anon;
grant execute on function public.set_improvement_item_status(uuid, text) to authenticated;

comment on function public.set_improvement_item_status(uuid, text) is
  '進捗の状態を変える。運営のみ。';
