-- 運営モデル切替に grok-4.6 を追加。既定 grok-4.5 と既存行は維持する。
-- CHECK の値集合を広げるため、同名制約を付け替える（データ削除・型変更なし）。

alter table public.platform_ai_settings
  drop constraint platform_ai_settings_cursor_model_id_check;

alter table public.platform_ai_settings
  add constraint platform_ai_settings_cursor_model_id_check
  check (cursor_model_id in ('grok-4.5', 'grok-4.6', 'composer-2.5'));

comment on column public.platform_ai_settings.cursor_model_id is
  '自動提案で使う Cursor モデル ID（grok-4.5 / grok-4.6 / composer-2.5）';
