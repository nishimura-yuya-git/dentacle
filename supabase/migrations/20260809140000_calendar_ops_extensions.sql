-- カレンダー運用拡張: 日別メモ・空きブロック（休憩/移動など）

create table public.clinic_day_memos (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  memo_date date not null,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id),
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb
);

create unique index uq_clinic_day_memos_active
  on public.clinic_day_memos (clinic_id, memo_date)
  where deleted_at is null;

create index idx_clinic_day_memos_clinic
  on public.clinic_day_memos (clinic_id)
  where deleted_at is null;

create table public.calendar_blocks (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  team_id uuid references public.teams (id),
  scheduled_date date not null,
  start_time time not null,
  end_time time not null,
  block_type text not null default 'other'
    check (block_type in ('break', 'travel', 'meeting', 'other')),
  title text not null default '',
  note text,
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

create index idx_calendar_blocks_clinic_date
  on public.calendar_blocks (clinic_id, scheduled_date)
  where deleted_at is null;

create trigger trg_clinic_day_memos_updated_at
  before update on public.clinic_day_memos
  for each row execute function public.set_updated_at();

create trigger trg_calendar_blocks_updated_at
  before update on public.calendar_blocks
  for each row execute function public.set_updated_at();

alter table public.clinic_day_memos enable row level security;
alter table public.calendar_blocks enable row level security;

create policy clinic_day_memos_select on public.clinic_day_memos
  for select to authenticated
  using (public.is_clinic_member(clinic_id) and deleted_at is null);

create policy clinic_day_memos_write on public.clinic_day_memos
  for all to authenticated
  using (public.has_clinic_role(clinic_id, array['owner', 'admin', 'coordinator', 'call']))
  with check (public.has_clinic_role(clinic_id, array['owner', 'admin', 'coordinator', 'call']));

create policy calendar_blocks_select on public.calendar_blocks
  for select to authenticated
  using (public.is_clinic_member(clinic_id) and deleted_at is null);

create policy calendar_blocks_write on public.calendar_blocks
  for all to authenticated
  using (public.has_clinic_role(clinic_id, array['owner', 'admin', 'coordinator', 'call']))
  with check (public.has_clinic_role(clinic_id, array['owner', 'admin', 'coordinator', 'call']));

revoke all on table public.clinic_day_memos from anon, authenticated;
revoke all on table public.calendar_blocks from anon, authenticated;
grant select, insert, update on table public.clinic_day_memos to authenticated;
grant select, insert, update on table public.calendar_blocks to authenticated;
