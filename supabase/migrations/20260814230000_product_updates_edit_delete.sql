-- お知らせの文言編集と削除。公開ゲートの propose / publish / reject は変えない。
-- 入れる／入れないの更新は version 列（前マイグレーション）で set_updated_at が動く。

create or replace function public.update_product_update_copy(
  p_id uuid,
  p_title text,
  p_body text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text := trim(coalesce(p_title, ''));
  v_body text;
begin
  if not public.is_platform_admin() then
    raise exception '権限がありません';
  end if;

  if v_title = '' then
    raise exception '見出しを入力してください';
  end if;

  if p_body is null then
    update public.product_updates
    set title = v_title
    where id = p_id
      and status in ('proposed', 'published');
  else
    v_body := nullif(trim(p_body), '');
    update public.product_updates
    set
      title = v_title,
      body = v_body
    where id = p_id
      and status in ('proposed', 'published');
  end if;

  if not found then
    raise exception '提案中または公開中の更新だけ編集できます';
  end if;

  return true;
end;
$$;

revoke all on function public.update_product_update_copy(uuid, text, text) from public, anon;
grant execute on function public.update_product_update_copy(uuid, text, text) to authenticated;

comment on function public.update_product_update_copy(uuid, text, text) is
  'お知らせの見出し・本文を直す。公開判定は変えない。';

create or replace function public.delete_product_update(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception '権限がありません';
  end if;

  if exists (
    select 1
    from public.improvement_items
    where product_update_id = p_id
  ) then
    raise exception '進捗とつながっている更新は削除できません';
  end if;

  delete from public.product_updates
  where id = p_id
    and status in ('proposed', 'published', 'rejected');

  if not found then
    raise exception 'この更新は削除できません';
  end if;

  return true;
end;
$$;

revoke all on function public.delete_product_update(uuid) from public, anon;
grant execute on function public.delete_product_update(uuid) to authenticated;

comment on function public.delete_product_update(uuid) is
  'お知らせを削除する。進捗とつながっている件は消さない。';
