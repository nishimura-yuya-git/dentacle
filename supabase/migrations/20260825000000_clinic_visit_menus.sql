-- 院ごとの訪問メニュー（登録・文言/所要の編集・論理削除・ON/OFF）
-- 初期29件はアプリが初回にコピーする。削除済み行が残っていれば再コピーしない。

create table public.clinic_visit_menus (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  code text not null check (char_length(trim(code)) > 0),
  name text not null check (char_length(trim(name)) > 0),
  duration_minutes integer not null check (duration_minutes between 1 and 480),
  is_enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id),
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb
);

create index idx_clinic_visit_menus_clinic
  on public.clinic_visit_menus (clinic_id)
  where deleted_at is null;

create unique index uq_clinic_visit_menus_clinic_code_active
  on public.clinic_visit_menus (clinic_id, code)
  where deleted_at is null;

create trigger trg_clinic_visit_menus_updated_at
  before update on public.clinic_visit_menus
  for each row execute function public.set_updated_at();

alter table public.clinic_visit_menus enable row level security;

-- 削除済みも読める（初回コピー済み判定。一覧はアプリで deleted_at is null）
create policy clinic_visit_menus_select on public.clinic_visit_menus
  for select to authenticated
  using (public.is_clinic_member(clinic_id));

create policy clinic_visit_menus_write on public.clinic_visit_menus
  for all to authenticated
  using (public.has_clinic_role(clinic_id, array['owner', 'admin', 'coordinator']))
  with check (public.has_clinic_role(clinic_id, array['owner', 'admin', 'coordinator']));

revoke all on table public.clinic_visit_menus from anon, authenticated;
grant select, insert, update on table public.clinic_visit_menus to authenticated;

comment on table public.clinic_visit_menus is
  '院ごとの訪問メニュー。予約選択肢とメニュー1の所要の正。訪問の名称は visits.metadata のスナップショット。';
