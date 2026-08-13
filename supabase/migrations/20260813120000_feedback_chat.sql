-- ご意見チャット（GitHub Issue 連携のアプリ内履歴）

create table if not exists public.feedback_threads (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  github_issue_number integer,
  github_issue_url text,
  title text not null,
  page_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feedback_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.feedback_threads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  author_role text not null check (author_role in ('user', 'system')),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_threads_user_created
  on public.feedback_threads (user_id, created_at desc);

create index if not exists idx_feedback_messages_thread_created
  on public.feedback_messages (thread_id, created_at);

create trigger set_feedback_threads_updated_at
before update on public.feedback_threads
for each row execute function public.set_updated_at();

alter table public.feedback_threads enable row level security;
alter table public.feedback_messages enable row level security;

revoke all on table public.feedback_threads from anon, authenticated;
revoke all on table public.feedback_messages from anon, authenticated;
grant select, insert on table public.feedback_threads to authenticated;
grant select, insert on table public.feedback_messages to authenticated;

-- 本人または運営のみ閲覧。作成は本人のみ
drop policy if exists feedback_threads_select on public.feedback_threads;
create policy feedback_threads_select
  on public.feedback_threads for select to authenticated
  using (auth.uid() = user_id or public.is_platform_admin());

drop policy if exists feedback_threads_insert on public.feedback_threads;
create policy feedback_threads_insert
  on public.feedback_threads for insert to authenticated
  with check (
    auth.uid() = user_id
    and (
      public.is_platform_admin()
      or (clinic_id is not null and public.is_clinic_member(clinic_id))
    )
  );

drop policy if exists feedback_messages_select on public.feedback_messages;
create policy feedback_messages_select
  on public.feedback_messages for select to authenticated
  using (auth.uid() = user_id or public.is_platform_admin());

drop policy if exists feedback_messages_insert on public.feedback_messages;
create policy feedback_messages_insert
  on public.feedback_messages for insert to authenticated
  with check (auth.uid() = user_id);

comment on table public.feedback_threads is
  'ご意見チャットのスレッド。正の記録は GitHub Issue。本表はアプリ内履歴。';
comment on table public.feedback_messages is
  'ご意見チャットのメッセージ。user / system。';
