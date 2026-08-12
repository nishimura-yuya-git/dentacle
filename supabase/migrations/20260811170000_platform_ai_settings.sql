-- 全院共通の Cursor SDK モデル設定（書込は運営のみ、読取は認証済み）
create table public.platform_ai_settings (
  id integer primary key default 1 check (id = 1),
  cursor_model_id text not null default 'grok-4.5'
    check (cursor_model_id in ('grok-4.5', 'composer-2.5')),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

comment on table public.platform_ai_settings is
  'デンタクル全院共通の AI（Cursor SDK）モデル設定。シングルトン行。';
comment on column public.platform_ai_settings.cursor_model_id is
  '自動提案で使う Cursor モデル ID（grok-4.5 / composer-2.5）';

alter table public.platform_ai_settings enable row level security;

create policy platform_ai_settings_select_authenticated
  on public.platform_ai_settings for select to authenticated
  using (true);

create policy platform_ai_settings_update_admin
  on public.platform_ai_settings for update to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy platform_ai_settings_insert_admin
  on public.platform_ai_settings for insert to authenticated
  with check (public.is_platform_admin());

revoke all on table public.platform_ai_settings from anon, authenticated;
grant select, insert, update on table public.platform_ai_settings to authenticated;

insert into public.platform_ai_settings (id, cursor_model_id)
values (1, 'grok-4.5')
on conflict (id) do nothing;
