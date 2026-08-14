-- 更新情報タイムラインの左アイコン。種類とは別に指定する。
-- propose_product_update のシグネチャは変えない。
-- set_updated_at が version を増やすため、更新できるよう列を足す。

alter table public.product_updates
  add column version integer not null default 1;

alter table public.product_updates
  add column timeline_mark text not null default 'sparkle';

alter table public.product_updates
  add constraint product_updates_timeline_mark_check
  check (
    timeline_mark in (
      'sparkle',
      'note',
      'calendar',
      'optimization',
      'solution',
      'gears'
    )
  );

comment on column public.product_updates.timeline_mark is
  '更新情報タイムライン左の目印。種類とは別。見本の絵文字は使わない。';

update public.product_updates
set timeline_mark = 'note'
where kind = 'fix';

create or replace function public.set_product_update_timeline_mark(
  p_id uuid,
  p_mark text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mark text := nullif(trim(coalesce(p_mark, '')), '');
begin
  if not public.is_platform_admin() then
    raise exception '権限がありません';
  end if;

  if v_mark not in (
    'sparkle',
    'note',
    'calendar',
    'optimization',
    'solution',
    'gears'
  ) then
    raise exception 'アイコンを選んでください';
  end if;

  update public.product_updates
  set timeline_mark = v_mark
  where id = p_id
    and status in ('proposed', 'published');

  if not found then
    raise exception '提案中または公開中の更新だけアイコンを変えられます';
  end if;

  return true;
end;
$$;

revoke all on function public.set_product_update_timeline_mark(uuid, text) from public, anon;
grant execute on function public.set_product_update_timeline_mark(uuid, text) to authenticated;

comment on function public.set_product_update_timeline_mark(uuid, text) is
  'お知らせのタイムラインアイコンを指定する。公開判定は変えない。';
