-- S-05: ログイン監査の閲覧は運営のみ。書込は SECURITY DEFINER RPC（クライアントIP申告禁止）

drop policy if exists auth_audit_logs_admin_select on public.auth_audit_logs;

create policy auth_audit_logs_platform_admin_select
  on public.auth_audit_logs for select to authenticated
  using (public.is_platform_admin());

create or replace function public.log_auth_audit_event(p_event text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_headers jsonb := '{}'::jsonb;
  v_ip text;
  v_ua text;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'ログインが必要です';
  end if;
  if p_event not in ('login_success', 'logout') then
    raise exception '不正なイベントです';
  end if;

  begin
    v_headers := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  exception when others then
    v_headers := '{}'::jsonb;
  end;

  v_ip := nullif(trim(split_part(coalesce(
    v_headers->>'x-forwarded-for',
    v_headers->>'cf-connecting-ip',
    v_headers->>'x-real-ip',
    ''
  ), ',', 1)), '');
  v_ua := nullif(left(coalesce(v_headers->>'user-agent', ''), 500), '');

  insert into public.auth_audit_logs (user_id, clinic_id, event, ip, user_agent)
  values (v_uid, null, p_event, v_ip, v_ua)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.log_auth_audit_event(text) from public, anon;
grant execute on function public.log_auth_audit_event(text) to authenticated;

comment on function public.log_auth_audit_event(text) is
  '認証監査の記録。IP/UA は request.headers から取得。login_success / logout のみ。';
