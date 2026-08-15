-- 反映済みにしたとき、打った人のチャットに system 返信を1通入れる。
-- お知らせ経路（propose → publish）は変えない。見送りではチャットに出さない。
-- 1改善1通。院向け本文に GitHub / Issue は出さない。
-- set_improvement_item_status(uuid, text) のシグネチャは変えない。
-- テーブルへの一般 UPDATE ポリシーは付けない。既読は本人専用 RPC のみ。

alter table public.feedback_threads
  add column if not exists has_unread_reply boolean not null default false;

comment on column public.feedback_threads.has_unread_reply is
  '反映の system 返信が未読。本人がチャットを開いたら RPC で落とす。';

create index if not exists idx_feedback_threads_user_unread
  on public.feedback_threads (user_id, created_at desc)
  where has_unread_reply = true;

alter table public.improvement_items
  add column if not exists clinic_reply_message_id uuid unique
    references public.feedback_messages (id) on delete restrict;

comment on column public.improvement_items.clinic_reply_message_id is
  '反映済みで入れた本人チャット返信。1改善につき1通。再送しない。';

-- ---------------------------------------------------------------------------
-- スレッド本人だけ未読を落とす。運営でも他人の未読は落とせない。
-- ---------------------------------------------------------------------------
create or replace function public.mark_feedback_thread_read(p_thread_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception '権限がありません';
  end if;

  update public.feedback_threads
  set has_unread_reply = false
  where id = p_thread_id
    and user_id = auth.uid();

  if not found then
    raise exception '対象のご意見が見つかりません';
  end if;

  return true;
end;
$$;

revoke all on function public.mark_feedback_thread_read(uuid) from public, anon;
grant execute on function public.mark_feedback_thread_read(uuid) to authenticated;

comment on function public.mark_feedback_thread_read(uuid) is
  'ご意見スレッドの未読を落とす。スレッド本人のみ。';

-- ---------------------------------------------------------------------------
-- 状態変更（運営のみ）。反映済みならお知らせ＋本人チャット返信。
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
  v_thread public.feedback_threads%rowtype;
  v_update_id uuid;
  v_title text;
  v_body text;
  v_reply_id uuid;
  v_reply_body text;
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
  v_reply_id := v_item.clinic_reply_message_id;

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

  if p_status = 'done' and v_reply_id is null then
    select *
      into v_thread
      from public.feedback_threads
     where id = v_item.feedback_thread_id
     for update;

    if not found then
      raise exception '対象のご意見が見つかりません';
    end if;

    v_title := left(btrim(coalesce(v_item.share_title, '')), 200);
    if v_title = '' or v_title ~* 'github|issue' then
      v_title := 'ご意見の反映';
    end if;

    v_reply_body := v_title || E'\n\nご意見いただいた内容を反映しました。';

    insert into public.feedback_messages (
      thread_id,
      user_id,
      author_role,
      body
    )
    values (
      v_thread.id,
      v_thread.user_id,
      'system',
      v_reply_body
    )
    returning id into v_reply_id;

    update public.feedback_threads
    set has_unread_reply = true
    where id = v_thread.id;
  end if;

  update public.improvement_items
  set
    status = p_status,
    product_update_id = v_update_id,
    clinic_reply_message_id = v_reply_id,
    status_changed_at = now(),
    status_changed_by = auth.uid()
  where id = p_id;

  return true;
end;
$$;

comment on function public.set_improvement_item_status(uuid, text) is
  '進捗の状態を変える。運営のみ。反映済みかつ未掲載ならお知らせを提案して入れる。未返信なら本人チャットに1通返す。失敗時は状態も戻す。';
