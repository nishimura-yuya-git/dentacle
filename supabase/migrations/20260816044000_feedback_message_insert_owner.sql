-- ご意見メッセージの insert はスレッド本人だけ。
-- 他人の thread_id に自分の user_id で行を足せない。
-- 受付の system 行も本人 JWT で書く。運営の反映返信は security definer RPC。

drop policy if exists feedback_messages_insert on public.feedback_messages;
create policy feedback_messages_insert
  on public.feedback_messages for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.feedback_threads t
      where t.id = thread_id
        and t.user_id = auth.uid()
    )
  );

comment on policy feedback_messages_insert on public.feedback_messages is
  'スレッド本人だけメッセージを追加できる。他人の会話に紛れ込ませない。';
