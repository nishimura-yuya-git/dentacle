-- デンタクル基盤スキーマ（v0）
-- 方針: クリニック単位のマルチテナント / 論理削除 / metadata で拡張 / RLS必須
-- 正データは構造化制約。自由記述はハード制約にしない。

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 共通: updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  new.version = coalesce(old.version, 0) + 1;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- テナント / 認証プロファイル
-- ---------------------------------------------------------------------------
create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  timezone text not null default 'Asia/Tokyo',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id),
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb
);

create table public.clinic_members (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  user_id uuid not null references auth.users (id),
  role text not null check (role in ('owner', 'admin', 'coordinator', 'call', 'doctor', 'dh')),
  status text not null default 'active'
    check (status in ('pending', 'active', 'suspended', 'terminated')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id),
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  unique (clinic_id, user_id, started_at)
);

create index idx_clinic_members_user_active
  on public.clinic_members (user_id, clinic_id)
  where deleted_at is null and status = 'active' and ended_at is null;

create index idx_clinic_members_clinic_active
  on public.clinic_members (clinic_id)
  where deleted_at is null and status = 'active' and ended_at is null;

-- ---------------------------------------------------------------------------
-- RLS helper（profiles 自己参照を避ける）
-- ---------------------------------------------------------------------------
create or replace function public.is_clinic_member(p_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clinic_members cm
    where cm.clinic_id = p_clinic_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
      and cm.deleted_at is null
      and (cm.ended_at is null or cm.ended_at > now())
  );
$$;

create or replace function public.is_clinic_admin(p_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clinic_members cm
    where cm.clinic_id = p_clinic_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'admin')
      and cm.status = 'active'
      and cm.deleted_at is null
      and (cm.ended_at is null or cm.ended_at > now())
  );
$$;

create or replace function public.has_clinic_role(p_clinic_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clinic_members cm
    where cm.clinic_id = p_clinic_id
      and cm.user_id = auth.uid()
      and cm.role = any (p_roles)
      and cm.status = 'active'
      and cm.deleted_at is null
      and (cm.ended_at is null or cm.ended_at > now())
  );
$$;

create or replace function public.clinic_has_active_member(p_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clinic_members cm
    where cm.clinic_id = p_clinic_id
      and cm.status = 'active'
      and cm.deleted_at is null
      and (cm.ended_at is null or cm.ended_at > now())
  );
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.is_clinic_member(uuid) from public, anon;
revoke all on function public.is_clinic_admin(uuid) from public, anon;
revoke all on function public.has_clinic_role(uuid, text[]) from public, anon;
revoke all on function public.clinic_has_active_member(uuid) from public, anon;
grant execute on function public.is_clinic_member(uuid) to authenticated;
grant execute on function public.is_clinic_admin(uuid) to authenticated;
grant execute on function public.has_clinic_role(uuid, text[]) to authenticated;
grant execute on function public.clinic_has_active_member(uuid) to authenticated;

-- 新規ユーザー → profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 設定: チーム / スタッフ / 稼働枠
-- ---------------------------------------------------------------------------
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  name text not null,
  color text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id),
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb
);

create index idx_teams_clinic on public.teams (clinic_id) where deleted_at is null;

create table public.staff_members (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  user_id uuid references auth.users (id),
  display_name text not null,
  staff_type text not null check (staff_type in ('doctor', 'dh', 'other')),
  external_code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id),
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb
);

create index idx_staff_members_clinic on public.staff_members (clinic_id) where deleted_at is null;
create unique index uq_staff_members_clinic_external_code
  on public.staff_members (clinic_id, external_code)
  where deleted_at is null and external_code is not null;

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  team_id uuid not null references public.teams (id),
  staff_id uuid not null references public.staff_members (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id),
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  unique (team_id, staff_id)
);

create table public.working_slots (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  team_id uuid references public.teams (id),
  staff_id uuid references public.staff_members (id),
  day_of_week smallint check (day_of_week between 0 and 6),
  specific_date date,
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id),
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  check (end_time > start_time),
  check (day_of_week is not null or specific_date is not null)
);

create index idx_working_slots_clinic on public.working_slots (clinic_id) where deleted_at is null;

-- ---------------------------------------------------------------------------
-- 患者 / 施設 / 訪問条件 / 構造化制約
-- ---------------------------------------------------------------------------
create table public.facilities (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  name text not null,
  area_label text,
  address text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  can_batch_visits boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id),
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb
);

create index idx_facilities_clinic on public.facilities (clinic_id) where deleted_at is null;

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  chart_number text,
  name_kanji text not null,
  name_kana text,
  phone text,
  address text,
  area_label text,
  facility_id uuid references public.facilities (id),
  primary_doctor_id uuid references public.staff_members (id),
  primary_dh_id uuid references public.staff_members (id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id),
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb
);

create index idx_patients_clinic on public.patients (clinic_id) where deleted_at is null;
create unique index uq_patients_clinic_chart_number
  on public.patients (clinic_id, chart_number)
  where deleted_at is null and chart_number is not null;
create index idx_patients_facility on public.patients (facility_id) where deleted_at is null;

-- 訪問条件の正（画面ごとに再計算しない）
create table public.patient_visit_conditions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  patient_id uuid not null references public.patients (id),
  visit_frequency text not null default 'unknown'
    check (visit_frequency in ('weekly', 'biweekly', 'monthly', 'custom', 'unknown')),
  preferred_weekdays smallint[] not null default '{}',
  preferred_time_start time,
  preferred_time_end time,
  standard_duration_minutes integer not null default 30 check (standard_duration_minutes > 0),
  requires_doctor boolean not null default false,
  phone_confirmation_required boolean not null default true,
  priority integer not null default 100,
  last_visit_date date,
  next_due_date date,
  is_provisional boolean not null default true,
  locked_fields text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id),
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb
);

create unique index uq_patient_visit_conditions_active
  on public.patient_visit_conditions (patient_id)
  where deleted_at is null;
create index idx_patient_visit_conditions_clinic
  on public.patient_visit_conditions (clinic_id)
  where deleted_at is null;

-- 構造化制約（精度の正）。説明文は note に留め、ハード制約にしない
create table public.patient_constraints (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  patient_id uuid not null references public.patients (id),
  constraint_type text not null check (constraint_type in ('ng', 'unavailable', 'available')),
  day_of_week smallint check (day_of_week between 0 and 6),
  specific_date date,
  start_time time,
  end_time time,
  effective_from date,
  effective_to date,
  source text not null default 'manual'
    check (source in ('manual', 'phone_confirmation', 'import', 'system')),
  is_hard boolean not null default true,
  confirmed_at timestamptz,
  confirmed_by uuid references auth.users (id),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id),
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  check (day_of_week is not null or specific_date is not null or start_time is not null)
);

create index idx_patient_constraints_patient
  on public.patient_constraints (patient_id)
  where deleted_at is null;
create index idx_patient_constraints_clinic
  on public.patient_constraints (clinic_id)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- 予約 / 電話確認
-- ---------------------------------------------------------------------------
create table public.visits (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  patient_id uuid not null references public.patients (id),
  team_id uuid references public.teams (id),
  staff_id uuid references public.staff_members (id),
  facility_id uuid references public.facilities (id),
  scheduled_date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'tentative'
    check (status in ('tentative', 'confirmed', 'cancelled', 'completed', 'no_show')),
  source text not null default 'manual'
    check (source in ('manual', 'auto_proposal', 'import')),
  schedule_job_id uuid,
  address_snapshot text,
  area_label_snapshot text,
  requires_doctor boolean not null default false,
  locked_fields text[] not null default '{}',
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id),
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  check (end_time > start_time)
);

create index idx_visits_clinic_date
  on public.visits (clinic_id, scheduled_date)
  where deleted_at is null;
create index idx_visits_patient
  on public.visits (patient_id, scheduled_date)
  where deleted_at is null;
create index idx_visits_team_date
  on public.visits (team_id, scheduled_date)
  where deleted_at is null;
create index idx_visits_status
  on public.visits (clinic_id, status)
  where deleted_at is null;

create table public.visit_phone_confirmations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  visit_id uuid not null references public.visits (id),
  patient_id uuid not null references public.patients (id),
  status text not null default 'pending'
    check (status in ('pending', 'ok', 'ng', 'absent', 'callback_waiting', 'facility_waiting')),
  contacted_at timestamptz,
  contacted_by uuid references auth.users (id),
  result_note text,
  constraint_candidate jsonb not null default '{}'::jsonb,
  promoted_constraint_id uuid references public.patient_constraints (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id),
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb
);

create index idx_visit_phone_confirmations_clinic_status
  on public.visit_phone_confirmations (clinic_id, status)
  where deleted_at is null;
create unique index uq_visit_phone_confirmations_active_visit
  on public.visit_phone_confirmations (visit_id)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- 自動提案ジョブ（エージェントは DB 直結せずスナップショットを読む）
-- ---------------------------------------------------------------------------
create table public.schedule_jobs (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  target_date date not null,
  team_id uuid references public.teams (id),
  status text not null default 'pending'
    check (status in ('pending', 'running', 'succeeded', 'failed', 'cancelled')),
  input_snapshot jsonb not null default '{}'::jsonb,
  distance_matrix jsonb,
  result_snapshot jsonb,
  model text,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id),
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb
);

create index idx_schedule_jobs_clinic_date
  on public.schedule_jobs (clinic_id, target_date)
  where deleted_at is null;

alter table public.visits
  add constraint visits_schedule_job_id_fkey
  foreign key (schedule_job_id) references public.schedule_jobs (id);

create table public.schedule_job_items (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  job_id uuid not null references public.schedule_jobs (id) on delete cascade,
  patient_id uuid not null references public.patients (id),
  team_id uuid references public.teams (id),
  staff_id uuid references public.staff_members (id),
  sequence_no integer not null default 0,
  proposed_date date not null,
  proposed_start time not null,
  proposed_end time not null,
  status text not null default 'proposed'
    check (status in ('proposed', 'adopted', 'rejected', 'superseded')),
  reason text,
  adopted_visit_id uuid references public.visits (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id),
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  check (proposed_end > proposed_start)
);

create index idx_schedule_job_items_job
  on public.schedule_job_items (job_id)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- 監査
-- ---------------------------------------------------------------------------
create table public.auth_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id),
  clinic_id uuid references public.clinics (id),
  event text not null check (event in ('login_success', 'login_failure', 'logout')),
  ip text,
  user_agent text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index idx_auth_audit_logs_user on public.auth_audit_logs (user_id, created_at desc);
create index idx_auth_audit_logs_clinic on public.auth_audit_logs (clinic_id, created_at desc);

create table public.operation_traces (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  actor_user_id uuid references auth.users (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index idx_operation_traces_clinic
  on public.operation_traces (clinic_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at トリガー
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'clinics', 'profiles', 'clinic_members', 'teams', 'staff_members',
    'team_members', 'working_slots', 'facilities', 'patients',
    'patient_visit_conditions', 'patient_constraints', 'visits',
    'visit_phone_confirmations', 'schedule_jobs', 'schedule_job_items'
  ]
  loop
    execute format(
      'create trigger trg_%s_updated_at before update on public.%I
       for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.clinics enable row level security;
alter table public.profiles enable row level security;
alter table public.clinic_members enable row level security;
alter table public.teams enable row level security;
alter table public.staff_members enable row level security;
alter table public.team_members enable row level security;
alter table public.working_slots enable row level security;
alter table public.facilities enable row level security;
alter table public.patients enable row level security;
alter table public.patient_visit_conditions enable row level security;
alter table public.patient_constraints enable row level security;
alter table public.visits enable row level security;
alter table public.visit_phone_confirmations enable row level security;
alter table public.schedule_jobs enable row level security;
alter table public.schedule_job_items enable row level security;
alter table public.auth_audit_logs enable row level security;
alter table public.operation_traces enable row level security;

-- profiles
create policy profiles_select_own_or_clinic
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.clinic_members me
      join public.clinic_members other
        on other.clinic_id = me.clinic_id
      where me.user_id = auth.uid()
        and other.user_id = profiles.id
        and me.status = 'active' and me.deleted_at is null
        and other.status = 'active' and other.deleted_at is null
        and (me.ended_at is null or me.ended_at > now())
        and (other.ended_at is null or other.ended_at > now())
    )
  );

create policy profiles_update_own
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- clinics
create policy clinics_select_member
  on public.clinics for select to authenticated
  using (
    deleted_at is null
    and (
      public.is_clinic_member(id)
      or created_by = auth.uid()
    )
  );

-- 初回作成（作成後に clinic_members で owner を紐づける）
create policy clinics_insert_authenticated
  on public.clinics for insert to authenticated
  with check (created_by = auth.uid());

create policy clinics_update_admin
  on public.clinics for update to authenticated
  using (public.is_clinic_admin(id))
  with check (public.is_clinic_admin(id));

-- clinic_members
create policy clinic_members_select_member
  on public.clinic_members for select to authenticated
  using (
    deleted_at is null
    and (
      public.is_clinic_member(clinic_id)
      or user_id = auth.uid()
    )
  );

-- クリニック作成直後: 作成者かつ未メンバーのクリニックに限り、自分を owner 登録可
create policy clinic_members_insert_bootstrap_owner
  on public.clinic_members for insert to authenticated
  with check (
    user_id = auth.uid()
    and role = 'owner'
    and created_by = auth.uid()
    and not public.clinic_has_active_member(clinic_id)
    and exists (
      select 1
      from public.clinics c
      where c.id = clinic_id
        and c.created_by = auth.uid()
        and c.deleted_at is null
    )
  );

create policy clinic_members_write_admin
  on public.clinic_members for all to authenticated
  using (public.is_clinic_admin(clinic_id))
  with check (public.is_clinic_admin(clinic_id));

-- 汎用: クリニックメンバー読取 / 運用ロール書込
-- 書込ロール: owner, admin, coordinator, call
create policy teams_select on public.teams for select to authenticated
  using (public.is_clinic_member(clinic_id) and deleted_at is null);
create policy teams_write on public.teams for all to authenticated
  using (public.has_clinic_role(clinic_id, array['owner', 'admin', 'coordinator']))
  with check (public.has_clinic_role(clinic_id, array['owner', 'admin', 'coordinator']));

create policy staff_members_select on public.staff_members for select to authenticated
  using (public.is_clinic_member(clinic_id) and deleted_at is null);
create policy staff_members_write on public.staff_members for all to authenticated
  using (public.has_clinic_role(clinic_id, array['owner', 'admin', 'coordinator']))
  with check (public.has_clinic_role(clinic_id, array['owner', 'admin', 'coordinator']));

create policy team_members_select on public.team_members for select to authenticated
  using (public.is_clinic_member(clinic_id) and deleted_at is null);
create policy team_members_write on public.team_members for all to authenticated
  using (public.has_clinic_role(clinic_id, array['owner', 'admin', 'coordinator']))
  with check (public.has_clinic_role(clinic_id, array['owner', 'admin', 'coordinator']));

create policy working_slots_select on public.working_slots for select to authenticated
  using (public.is_clinic_member(clinic_id) and deleted_at is null);
create policy working_slots_write on public.working_slots for all to authenticated
  using (public.has_clinic_role(clinic_id, array['owner', 'admin', 'coordinator']))
  with check (public.has_clinic_role(clinic_id, array['owner', 'admin', 'coordinator']));

create policy facilities_select on public.facilities for select to authenticated
  using (public.is_clinic_member(clinic_id) and deleted_at is null);
create policy facilities_write on public.facilities for all to authenticated
  using (public.has_clinic_role(clinic_id, array['owner', 'admin', 'coordinator', 'call']))
  with check (public.has_clinic_role(clinic_id, array['owner', 'admin', 'coordinator', 'call']));

create policy patients_select on public.patients for select to authenticated
  using (public.is_clinic_member(clinic_id) and deleted_at is null);
create policy patients_write on public.patients for all to authenticated
  using (public.has_clinic_role(clinic_id, array['owner', 'admin', 'coordinator', 'call']))
  with check (public.has_clinic_role(clinic_id, array['owner', 'admin', 'coordinator', 'call']));

create policy patient_visit_conditions_select on public.patient_visit_conditions for select to authenticated
  using (public.is_clinic_member(clinic_id) and deleted_at is null);
create policy patient_visit_conditions_write on public.patient_visit_conditions for all to authenticated
  using (public.has_clinic_role(clinic_id, array['owner', 'admin', 'coordinator', 'call']))
  with check (public.has_clinic_role(clinic_id, array['owner', 'admin', 'coordinator', 'call']));

create policy patient_constraints_select on public.patient_constraints for select to authenticated
  using (public.is_clinic_member(clinic_id) and deleted_at is null);
create policy patient_constraints_write on public.patient_constraints for all to authenticated
  using (public.has_clinic_role(clinic_id, array['owner', 'admin', 'coordinator', 'call']))
  with check (public.has_clinic_role(clinic_id, array['owner', 'admin', 'coordinator', 'call']));

create policy visits_select on public.visits for select to authenticated
  using (public.is_clinic_member(clinic_id) and deleted_at is null);
create policy visits_write on public.visits for all to authenticated
  using (public.has_clinic_role(clinic_id, array['owner', 'admin', 'coordinator', 'call']))
  with check (public.has_clinic_role(clinic_id, array['owner', 'admin', 'coordinator', 'call']));

create policy visit_phone_confirmations_select on public.visit_phone_confirmations for select to authenticated
  using (public.is_clinic_member(clinic_id) and deleted_at is null);
create policy visit_phone_confirmations_write on public.visit_phone_confirmations for all to authenticated
  using (public.has_clinic_role(clinic_id, array['owner', 'admin', 'coordinator', 'call']))
  with check (public.has_clinic_role(clinic_id, array['owner', 'admin', 'coordinator', 'call']));

create policy schedule_jobs_select on public.schedule_jobs for select to authenticated
  using (public.is_clinic_member(clinic_id) and deleted_at is null);
create policy schedule_jobs_write on public.schedule_jobs for all to authenticated
  using (public.has_clinic_role(clinic_id, array['owner', 'admin', 'coordinator']))
  with check (public.has_clinic_role(clinic_id, array['owner', 'admin', 'coordinator']));

create policy schedule_job_items_select on public.schedule_job_items for select to authenticated
  using (public.is_clinic_member(clinic_id) and deleted_at is null);
create policy schedule_job_items_write on public.schedule_job_items for all to authenticated
  using (public.has_clinic_role(clinic_id, array['owner', 'admin', 'coordinator']))
  with check (public.has_clinic_role(clinic_id, array['owner', 'admin', 'coordinator']));

-- 認証監査: 管理者読取のみ。書込はサーバー（service_role）のみ
create policy auth_audit_logs_admin_select
  on public.auth_audit_logs for select to authenticated
  using (clinic_id is not null and public.is_clinic_admin(clinic_id));

create policy operation_traces_select on public.operation_traces for select to authenticated
  using (public.is_clinic_member(clinic_id));
create policy operation_traces_insert on public.operation_traces for insert to authenticated
  with check (
    public.has_clinic_role(clinic_id, array['owner', 'admin', 'coordinator', 'call', 'doctor', 'dh'])
  );

-- ---------------------------------------------------------------------------
-- GRANT（最小権限。DELETE は原則不可、論理削除で対応）
-- ---------------------------------------------------------------------------
revoke all on table public.clinics from anon, authenticated;
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.clinic_members from anon, authenticated;
revoke all on table public.teams from anon, authenticated;
revoke all on table public.staff_members from anon, authenticated;
revoke all on table public.team_members from anon, authenticated;
revoke all on table public.working_slots from anon, authenticated;
revoke all on table public.facilities from anon, authenticated;
revoke all on table public.patients from anon, authenticated;
revoke all on table public.patient_visit_conditions from anon, authenticated;
revoke all on table public.patient_constraints from anon, authenticated;
revoke all on table public.visits from anon, authenticated;
revoke all on table public.visit_phone_confirmations from anon, authenticated;
revoke all on table public.schedule_jobs from anon, authenticated;
revoke all on table public.schedule_job_items from anon, authenticated;
revoke all on table public.auth_audit_logs from anon, authenticated;
revoke all on table public.operation_traces from anon, authenticated;

grant select, insert on table public.clinics to authenticated;
grant update (name, code, timezone, is_active, updated_by, metadata) on table public.clinics to authenticated;

grant select on table public.profiles to authenticated;
grant update (display_name, avatar_url, updated_at, metadata) on table public.profiles to authenticated;

grant select, insert, update on table public.clinic_members to authenticated;
grant select, insert, update on table public.teams to authenticated;
grant select, insert, update on table public.staff_members to authenticated;
grant select, insert, update on table public.team_members to authenticated;
grant select, insert, update on table public.working_slots to authenticated;
grant select, insert, update on table public.facilities to authenticated;
grant select, insert, update on table public.patients to authenticated;
grant select, insert, update on table public.patient_visit_conditions to authenticated;
grant select, insert, update on table public.patient_constraints to authenticated;
grant select, insert, update on table public.visits to authenticated;
grant select, insert, update on table public.visit_phone_confirmations to authenticated;
grant select, insert, update on table public.schedule_jobs to authenticated;
grant select, insert, update on table public.schedule_job_items to authenticated;
grant select on table public.auth_audit_logs to authenticated;
grant select, insert on table public.operation_traces to authenticated;
