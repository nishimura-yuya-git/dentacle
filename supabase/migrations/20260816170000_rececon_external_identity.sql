-- レセコン外部キーの受け皿。当面はNULLのまま。
-- 常時接続・API直結はしない。レセプト伝票IDは入れない。
-- 患者の正は patients.id。突合は external_id → chart_number。

alter table public.clinics
  add column if not exists external_code text;

alter table public.patients
  add column if not exists external_id text;

create unique index if not exists uq_clinics_external_code
  on public.clinics (external_code)
  where deleted_at is null and external_code is not null;

create unique index if not exists uq_patients_clinic_external_id
  on public.patients (clinic_id, external_id)
  where deleted_at is null and external_id is not null;

comment on column public.clinics.external_code is
  'レセコン側の医院コード。未連携時はNULL';

comment on column public.patients.external_id is
  'レセコン側の安定患者ID。カルテ番号とは別。未連携時はNULL。レセプト伝票IDは入れない';

grant update (external_code) on table public.clinics to authenticated;
