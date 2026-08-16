-- お知らせ・進捗の運営 RPC を AAL2 必須にする。シグネチャは変えない。

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
  if not public.is_platform_admin_aal2() then
    raise exception '権限がありません';
  end if;

  if v_title = '' then
    raise exception '見出しを入力してください';
  end if;

  if v_platform not in ('web', 'mac', 'windows') then
    raise exception '対象環境を選んでください';
  end if;

  insert into public.product_updates (
    status, kind, title, body, detail_url, surfaces, platform, proposed_by
  )
  values (
    'proposed', p_kind, v_title, v_body, v_url, v_surfaces, v_platform, auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.publish_product_update(p_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_number integer;
begin
  if not public.is_platform_admin_aal2() then
    raise exception '権限がありません';
  end if;

  select coalesce(max(update_number), 0) + 1
    into v_number
  from public.product_updates;

  update public.product_updates
  set
    status = 'published',
    update_number = v_number,
    published_at = now(),
    reviewed_at = now(),
    reviewed_by = auth.uid()
  where id = p_id
    and status = 'proposed';

  if not found then
    raise exception '提案中の更新だけ入れられます';
  end if;

  return v_number;
end;
$$;

create or replace function public.reject_product_update(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin_aal2() then
    raise exception '権限がありません';
  end if;

  update public.product_updates
  set
    status = 'rejected',
    reviewed_at = now(),
    reviewed_by = auth.uid()
  where id = p_id
    and status = 'proposed';

  if not found then
    raise exception '提案中の更新だけ判定できます';
  end if;

  return true;
end;
$$;

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
  if not public.is_platform_admin_aal2() then
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
    set title = v_title, body = v_body
    where id = p_id
      and status in ('proposed', 'published');
  end if;

  if not found then
    raise exception '提案中または公開中の更新だけ編集できます';
  end if;

  return true;
end;
$$;

create or replace function public.delete_product_update(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin_aal2() then
    raise exception '権限がありません';
  end if;

  if exists (
    select 1 from public.improvement_items where product_update_id = p_id
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
  if not public.is_platform_admin_aal2() then
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
  if not public.is_platform_admin_aal2() then
    raise exception '権限がありません';
  end if;

  if v_mark not in ('sparkle', 'note', 'calendar', 'optimization', 'solution', 'gears') then
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

create or replace function public.create_improvement_item_for_thread(p_thread_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_thread public.feedback_threads%rowtype;
  v_id uuid;
  v_summary text;
begin
  if auth.uid() is null then
    raise exception '権限がありません';
  end if;

  select * into v_thread from public.feedback_threads where id = p_thread_id;

  if not found then
    raise exception '対象のご意見が見つかりません';
  end if;

  if v_thread.user_id <> auth.uid()
     and not public.is_platform_admin_aal2() then
    raise exception '権限がありません';
  end if;

  select id into v_id
  from public.improvement_items
  where feedback_thread_id = p_thread_id;

  if found then
    return v_id;
  end if;

  select left(trim(body), 2000)
    into v_summary
  from public.feedback_messages
  where thread_id = p_thread_id
    and author_role = 'user'
  order by created_at
  limit 1;

  insert into public.improvement_items (
    feedback_thread_id, clinic_id, github_issue_number, github_issue_url,
    share_title, share_summary, page_path, status
  )
  values (
    v_thread.id, v_thread.clinic_id, v_thread.github_issue_number, v_thread.github_issue_url,
    v_thread.title, nullif(trim(coalesce(v_summary, '')), ''), v_thread.page_path, 'received'
  )
  returning id into v_id;

  return v_id;
end;
$$;

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
  if not public.is_platform_admin_aal2() then
    raise exception '権限がありません';
  end if;

  if p_status not in ('received', 'reviewing', 'in_progress', 'done', 'wont_fix') then
    raise exception '状態が不正です';
  end if;

  select * into v_item from public.improvement_items where id = p_id for update;

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
    select * into v_thread
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

    insert into public.feedback_messages (thread_id, user_id, author_role, body)
    values (v_thread.id, v_thread.user_id, 'system', v_reply_body)
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
