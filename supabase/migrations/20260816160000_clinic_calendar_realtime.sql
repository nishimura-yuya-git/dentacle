-- 診療カレンダーの他端末同期。
-- clinic_calendar_sync: 訪問・空きブロック・日別メモの保存を1行に集約して Realtime 配信する。
-- clinic_calendar_peers: 操作中の端末（同一アカウントの別PC含む）。名前は持たない。

create table public.clinic_calendar_sync (
  clinic_id uuid primary key references public.clinics (id) on delete cascade,
  last_change_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clinic_calendar_peers (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  scheduled_date date not null,
  peer_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  pc_label integer not null check (pc_label >= 1 and pc_label <= 99),
  focus_visit_id uuid,
  drag_mode text
    check (drag_mode is null or drag_mode in ('move', 'resize', 'create')),
  drag_visit_id uuid,
  drag_team_id uuid,
  drag_start_time time,
  drag_end_time time,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index uq_clinic_calendar_peers_clinic_date_peer
  on public.clinic_calendar_peers (clinic_id, scheduled_date, peer_id);

create index idx_clinic_calendar_peers_clinic_date
  on public.clinic_calendar_peers (clinic_id, scheduled_date, last_seen_at);

create trigger trg_clinic_calendar_sync_updated_at
  before update on public.clinic_calendar_sync
  for each row execute function public.set_updated_at();

create trigger trg_clinic_calendar_peers_updated_at
  before update on public.clinic_calendar_peers
  for each row execute function public.set_updated_at();

create or replace function public.bump_clinic_calendar_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
begin
  cid := coalesce(new.clinic_id, old.clinic_id);
  if cid is null then
    return coalesce(new, old);
  end if;

  insert into public.clinic_calendar_sync (clinic_id, last_change_at, updated_at)
  values (cid, now(), now())
  on conflict (clinic_id) do update
    set last_change_at = excluded.last_change_at,
        updated_at = excluded.updated_at;

  return coalesce(new, old);
end;
$$;

revoke all on function public.bump_clinic_calendar_sync() from public, anon, authenticated;

create trigger trg_visits_calendar_sync
  after insert or update or delete on public.visits
  for each row execute function public.bump_clinic_calendar_sync();

create trigger trg_calendar_blocks_calendar_sync
  after insert or update or delete on public.calendar_blocks
  for each row execute function public.bump_clinic_calendar_sync();

create trigger trg_clinic_day_memos_calendar_sync
  after insert or update or delete on public.clinic_day_memos
  for each row execute function public.bump_clinic_calendar_sync();

alter table public.clinic_calendar_sync enable row level security;
alter table public.clinic_calendar_peers enable row level security;

alter table public.clinic_calendar_peers replica identity full;

create policy clinic_calendar_sync_select on public.clinic_calendar_sync
  for select to authenticated
  using (public.is_clinic_member(clinic_id));

create policy clinic_calendar_peers_select on public.clinic_calendar_peers
  for select to authenticated
  using (public.is_clinic_member(clinic_id));

create policy clinic_calendar_peers_insert on public.clinic_calendar_peers
  for insert to authenticated
  with check (
    public.is_clinic_member(clinic_id)
    and user_id = auth.uid()
  );

create policy clinic_calendar_peers_update on public.clinic_calendar_peers
  for update to authenticated
  using (user_id = auth.uid() and public.is_clinic_member(clinic_id))
  with check (user_id = auth.uid() and public.is_clinic_member(clinic_id));

create policy clinic_calendar_peers_delete on public.clinic_calendar_peers
  for delete to authenticated
  using (user_id = auth.uid());

revoke all on table public.clinic_calendar_sync from anon, authenticated;
revoke all on table public.clinic_calendar_peers from anon, authenticated;
grant select on table public.clinic_calendar_sync to authenticated;
grant select, insert, update, delete on table public.clinic_calendar_peers to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'clinic_calendar_sync'
  ) then
    execute 'alter publication supabase_realtime add table public.clinic_calendar_sync';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'clinic_calendar_peers'
  ) then
    execute 'alter publication supabase_realtime add table public.clinic_calendar_peers';
  end if;
end $$;

comment on table public.clinic_calendar_sync is
  '診療カレンダー保存の院単位ティック。画面はこれを購読して silent 再読込する。';
comment on table public.clinic_calendar_peers is
  '診療カレンダーを開いている端末。pc_label は PC1 表記用。氏名は保存しない。';
comment on function public.bump_clinic_calendar_sync() is
  'visits / calendar_blocks / clinic_day_memos 変更時に同期ティックを更新する。';
