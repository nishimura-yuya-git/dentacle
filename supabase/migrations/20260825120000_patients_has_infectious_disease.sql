-- 感染症フラグ。一覧・カレンダー・電話確認の注意表示用。割付には使わない。
alter table public.patients
  add column if not exists has_infectious_disease boolean not null default false;

comment on column public.patients.has_infectious_disease is
  '感染症あり。一覧・カレンダー・電話確認で注意表示する。自動提案の割付には使わない';
