-- 反映済みにしたとき、未掲載ならお知らせを提案して入れる。
-- 送信時は載せない。見送りでは載せない。既に紐づいていれば再作成しない。
-- 院向け本文に GitHub / Issue は出さない。detail_url も付けない。
-- 既存の propose_product_update / publish_product_update のシグネチャは変えない。

alter table public.improvement_items
  add column product_update_id uuid unique
    references public.product_updates (id) on delete restrict;

comment on column public.improvement_items.product_update_id is
  '反映済みで入れたお知らせ。1改善につき1件。再掲載しない。';

-- ---------------------------------------------------------------------------
-- 画面パス → お知らせ対象画面。TS の surfaceFromImprovementPagePath と揃える。
-- ---------------------------------------------------------------------------
create or replace function public.improvement_page_to_surfaces(p_page_path text)
returns text[]
language plpgsql
immutable
set search_path = public
as $$
declare
  v_path text := split_part(split_part(btrim(coalesce(p_page_path, '')), '?', 1), '#', 1);
begin
  if v_path = '/calendar' or v_path like '/calendar/%' then
    return array['calendar']::text[];
  end if;
  if v_path = '/patients' or v_path like '/patients/%' then
    return array['patients']::text[];
  end if;
  if v_path = '/contacts' or v_path like '/contacts/%' then
    return array['contacts']::text[];
  end if;
  if v_path = '/users' or v_path like '/users/%' then
    return array['users']::text[];
  end if;
  if v_path = '/settings' or v_path like '/settings/%' then
    return array['settings']::text[];
  end if;
  if v_path = '/import' or v_path like '/import/%' then
    return array['import']::text[];
  end if;
  return array['all']::text[];
end;
$$;

revoke all on function public.improvement_page_to_surfaces(text) from public, anon, authenticated;

comment on function public.improvement_page_to_surfaces(text) is
  '進捗の画面パスをお知らせの対象画面にする。authenticated からは呼ばない。';

-- ---------------------------------------------------------------------------
-- 状態変更（運営のみ）。反映済みかつ未紐づけなら提案→入れる。
-- ---------------------------------------------------------------------------
create or replace function public.set_improvement_item_status(
  p_id uuid,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.improvement_items%rowtype;
  v_update_id uuid;
  v_title text;
  v_body text;
begin
  if not public.is_platform_admin() then
    raise exception '権限がありません';
  end if;

  if p_status not in ('received', 'reviewing', 'in_progress', 'done', 'wont_fix') then
    raise exception '状態が不正です';
  end if;

  select *
    into v_item
  from public.improvement_items
  where id = p_id
  for update;

  if not found then
    raise exception '対象の進捗が見つかりません';
  end if;

  v_update_id := v_item.product_update_id;

  if p_status = 'done' and v_update_id is null then
    v_title := left(btrim(coalesce(v_item.share_title, '')), 200);
    if v_title = '' or v_title ~* 'github|issue' then
      v_title := 'ご意見の反映';
    end if;

    v_body := nullif(btrim(coalesce(v_item.share_summary, '')), '');
    if v_body is null or v_body = v_title or v_body ~* 'github|issue' then
      v_body := 'ご意見いただいた内容を反映しました。';
    end if;

    v_update_id := public.propose_product_update(
      p_kind => 'fix',
      p_title => v_title,
      p_body => v_body,
      p_detail_url => null,
      p_surfaces => public.improvement_page_to_surfaces(v_item.page_path),
      p_platform => 'web'
    );

    perform public.publish_product_update(v_update_id);
  end if;

  update public.improvement_items
  set
    status = p_status,
    product_update_id = v_update_id,
    status_changed_at = now(),
    status_changed_by = auth.uid()
  where id = p_id;

  return true;
end;
$$;

comment on function public.set_improvement_item_status(uuid, text) is
  '進捗の状態を変える。運営のみ。反映済みかつ未掲載ならお知らせを提案して入れる。失敗時は状態も戻す。';
