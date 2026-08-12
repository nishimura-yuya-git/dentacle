-- clinic_members: オーナー保護・運営除外を RLS で強制（セキュリティ監査 2026-08-11）
-- UI ロック（§6.25）と運営非掲載（§6.29）を DB 側でも守る。

-- 他ユーザーが platform_admins かを RLS 下でも判定できる helper
create or replace function public.is_platform_admin_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = p_user_id
  );
$$;

revoke all on function public.is_platform_admin_user(uuid) from public, anon;
grant execute on function public.is_platform_admin_user(uuid) to authenticated;

comment on function public.is_platform_admin_user(uuid) is
  '指定ユーザーが運営か。clinic_members ポリシーから参照（platform_admins RLS を迂回）';

-- 広すぎる FOR ALL を廃止し、INSERT / UPDATE / DELETE に分割
drop policy if exists clinic_members_write_admin on public.clinic_members;
drop policy if exists clinic_members_insert_bootstrap_owner on public.clinic_members;

-- 初回 owner: 作成者本人のみ。運営は載せない（§6.29）
create policy clinic_members_insert_bootstrap_owner
  on public.clinic_members for insert to authenticated
  with check (
    user_id = auth.uid()
    and role = 'owner'
    and created_by = auth.uid()
    and not public.is_platform_admin()
    and not public.clinic_has_active_member(clinic_id)
    and exists (
      select 1
      from public.clinics c
      where c.id = clinic_id
        and c.created_by = auth.uid()
        and c.deleted_at is null
    )
  );

-- admin の直接 INSERT: owner 付与不可・運営ユーザー不可（招待は RPC 推奨）
create policy clinic_members_insert_admin
  on public.clinic_members for insert to authenticated
  with check (
    public.is_clinic_admin(clinic_id)
    and role <> 'owner'
    and not public.is_platform_admin_user(user_id)
  );

-- admin UPDATE: 既存 owner 行は触れない。owner 昇格・運営ユーザー化も不可
create policy clinic_members_update_admin
  on public.clinic_members for update to authenticated
  using (
    public.is_clinic_admin(clinic_id)
    and role <> 'owner'
    and deleted_at is null
  )
  with check (
    public.is_clinic_admin(clinic_id)
    and role <> 'owner'
    and not public.is_platform_admin_user(user_id)
  );

-- DELETE grant は無いが、ポリシーでも owner 行を守る
create policy clinic_members_delete_admin
  on public.clinic_members for delete to authenticated
  using (
    public.is_clinic_admin(clinic_id)
    and role <> 'owner'
  );

-- 招待 RPC: owner 役割の付与を禁止（owner は create_clinic_with_owner / bootstrap のみ）
create or replace function public.add_clinic_member_by_email(
  p_clinic_id uuid,
  p_email text,
  p_role text default 'coordinator'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_target uuid;
  v_member_id uuid;
begin
  if v_uid is null then
    raise exception 'ログインが必要です';
  end if;
  if not public.is_clinic_admin(p_clinic_id) then
    raise exception '管理者のみ実行できます';
  end if;
  -- owner は招待 RPC では付けない
  if p_role not in ('admin', 'coordinator', 'call', 'doctor', 'dh') then
    raise exception '不正な役割です';
  end if;

  select p.id into v_target
  from public.profiles p
  where lower(p.email) = lower(trim(p_email))
    and p.deleted_at is null
  limit 1;

  if v_target is null then
    raise exception '該当するユーザーが見つかりません。先に管理者画面でアカウントを作成してください';
  end if;

  if public.is_platform_admin_user(v_target) then
    raise exception '運営アカウントはクリニックのユーザー管理に追加できません';
  end if;

  if exists (
    select 1 from public.clinic_members cm
    where cm.clinic_id = p_clinic_id
      and cm.user_id = v_target
      and cm.status = 'active'
      and cm.deleted_at is null
      and (cm.ended_at is null or cm.ended_at > now())
  ) then
    raise exception 'すでに所属しています';
  end if;

  insert into public.clinic_members (
    clinic_id, user_id, role, status, created_by, updated_by
  ) values (
    p_clinic_id, v_target, p_role, 'active', v_uid, v_uid
  )
  returning id into v_member_id;

  return v_member_id;
end;
$$;
