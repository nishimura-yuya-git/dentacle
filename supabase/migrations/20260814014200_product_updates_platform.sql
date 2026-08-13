-- お知らせの対象環境（Web / Mac / Windows）。画面対象 surfaces とは別。
-- 既存行は Web。公開ゲート（提案→入れる）と RLS は変えない。

alter table public.product_updates
  add column platform text not null default 'web';

alter table public.product_updates
  add constraint product_updates_platform_check
  check (platform in ('web', 'mac', 'windows'));

comment on column public.product_updates.platform is
  '対象環境。画面対象 surfaces とは別。表示用。一覧の絞り込みはしない。';

-- 旧5引数を残すと platform が保存されないため付け替える
drop function if exists public.propose_product_update(text, text, text, text, text[]);

create or replace function public.propose_product_update(
  p_kind text,
  p_title text,
  p_body text default null,
  p_detail_url text default null,
  p_surfaces text[] default '{}'::text[],
  p_platform text default 'web'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_title text := trim(coalesce(p_title, ''));
  v_body text := nullif(trim(coalesce(p_body, '')), '');
  v_url text := nullif(trim(coalesce(p_detail_url, '')), '');
  v_surfaces text[] := coalesce(p_surfaces, '{}'::text[]);
  v_platform text := coalesce(nullif(trim(coalesce(p_platform, '')), ''), 'web');
begin
  if not public.is_platform_admin() then
    raise exception '権限がありません';
  end if;

  if v_title = '' then
    raise exception '見出しを入力してください';
  end if;

  if v_platform not in ('web', 'mac', 'windows') then
    raise exception '対象環境を選んでください';
  end if;

  insert into public.product_updates (
    status,
    kind,
    title,
    body,
    detail_url,
    surfaces,
    platform,
    proposed_by
  )
  values (
    'proposed',
    p_kind,
    v_title,
    v_body,
    v_url,
    v_surfaces,
    v_platform,
    auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.propose_product_update(text, text, text, text, text[], text) from public, anon;
grant execute on function public.propose_product_update(text, text, text, text, text[], text) to authenticated;

comment on function public.propose_product_update(text, text, text, text, text[], text) is
  'お知らせを提案する。この時点では院ユーザーの画面に出ない。対象環境は Web / Mac / Windows。';
