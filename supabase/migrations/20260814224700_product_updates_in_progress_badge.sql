-- リリース予定チップの「開発中」表示をON/OFFする。
-- 公開ゲート（提案→入れる）と院向け可視は変えない。既存行は表示あり。

alter table public.product_updates
  add column show_in_progress_badge boolean not null default true;

comment on column public.product_updates.show_in_progress_badge is
  'リリース予定チップに「開発中」を出すか。公開面では使わない。';

create or replace function public.set_product_update_in_progress_badge(
  p_id uuid,
  p_show boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception '権限がありません';
  end if;

  update public.product_updates
  set show_in_progress_badge = coalesce(p_show, false)
  where id = p_id
    and status = 'proposed';

  if not found then
    raise exception '提案中の更新だけ開発中表示を変えられます';
  end if;

  return true;
end;
$$;

revoke all on function public.set_product_update_in_progress_badge(uuid, boolean) from public, anon;
grant execute on function public.set_product_update_in_progress_badge(uuid, boolean) to authenticated;

comment on function public.set_product_update_in_progress_badge(uuid, boolean) is
  '提案中のお知らせの開発中バッジ表示を切り替える。院向け公開判定は変えない。';
