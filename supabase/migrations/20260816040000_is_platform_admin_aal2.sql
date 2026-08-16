-- 運営の危険操作は AAL2 必須。is_platform_admin() は身分判定のまま（MFA前に使う）。
-- RLS の運営追加アクセスは aal2 に上げる（弱体化ではない）。

create or replace function public.is_platform_admin_aal2()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_platform_admin()
    and coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

revoke all on function public.is_platform_admin_aal2() from public, anon;
grant execute on function public.is_platform_admin_aal2() to authenticated;

comment on function public.is_platform_admin_aal2() is
  '運営かつ Authenticator 確認済み（AAL2）。身分判定の is_platform_admin() とは別。';

create or replace function public.is_clinic_member(p_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_platform_admin_aal2()
    or exists (
      select 1
      from public.clinic_members cm
      where cm.clinic_id = p_clinic_id
        and cm.user_id = auth.uid()
        and cm.status = 'active'
        and cm.deleted_at is null
        and (cm.ended_at is null or cm.ended_at > now())
    );
$$;

create or replace function public.is_clinic_admin(p_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_platform_admin_aal2()
    or exists (
      select 1
      from public.clinic_members cm
      where cm.clinic_id = p_clinic_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin')
        and cm.status = 'active'
        and cm.deleted_at is null
        and (cm.ended_at is null or cm.ended_at > now())
    );
$$;

create or replace function public.has_clinic_role(p_clinic_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_platform_admin_aal2()
    or exists (
      select 1
      from public.clinic_members cm
      where cm.clinic_id = p_clinic_id
        and cm.user_id = auth.uid()
        and cm.role = any (p_roles)
        and cm.status = 'active'
        and cm.deleted_at is null
        and (cm.ended_at is null or cm.ended_at > now())
    );
$$;

-- 運営専用の追加閲覧・書込。身分だけの is_platform_admin() では開けない。
drop policy if exists platform_admins_select_self_or_admin on public.platform_admins;
create policy platform_admins_select_self_or_admin
  on public.platform_admins for select to authenticated
  using (user_id = auth.uid() or public.is_platform_admin_aal2());

drop policy if exists platform_admins_insert_admin on public.platform_admins;
create policy platform_admins_insert_admin
  on public.platform_admins for insert to authenticated
  with check (public.is_platform_admin_aal2());

drop policy if exists platform_admins_delete_admin on public.platform_admins;
create policy platform_admins_delete_admin
  on public.platform_admins for delete to authenticated
  using (public.is_platform_admin_aal2());

drop policy if exists auth_audit_logs_platform_admin_select on public.auth_audit_logs;
create policy auth_audit_logs_platform_admin_select
  on public.auth_audit_logs for select to authenticated
  using (public.is_platform_admin_aal2());

drop policy if exists auth_ip_blocks_platform_admin_all on public.auth_ip_blocks;
create policy auth_ip_blocks_platform_admin_all
  on public.auth_ip_blocks for all to authenticated
  using (public.is_platform_admin_aal2())
  with check (public.is_platform_admin_aal2());

drop policy if exists auth_presence_platform_admin_select on public.auth_presence;
create policy auth_presence_platform_admin_select
  on public.auth_presence for select to authenticated
  using (public.is_platform_admin_aal2());

drop policy if exists improvement_items_select_platform_admin on public.improvement_items;
create policy improvement_items_select_platform_admin
  on public.improvement_items for select to authenticated
  using (public.is_platform_admin_aal2());

drop policy if exists product_updates_select_published_or_admin on public.product_updates;
create policy product_updates_select_published_or_admin
  on public.product_updates for select to authenticated
  using (status = 'published' or public.is_platform_admin_aal2());

drop policy if exists clinic_contractor_profiles_select_member_or_admin
  on public.clinic_contractor_profiles;
create policy clinic_contractor_profiles_select_member_or_admin
  on public.clinic_contractor_profiles for select to authenticated
  using (public.is_clinic_member(clinic_id) or public.is_platform_admin_aal2());

drop policy if exists clinic_contractor_profiles_write_platform
  on public.clinic_contractor_profiles;
create policy clinic_contractor_profiles_write_platform
  on public.clinic_contractor_profiles for all to authenticated
  using (public.is_platform_admin_aal2())
  with check (public.is_platform_admin_aal2());

drop policy if exists clinic_contract_documents_select_member_or_admin
  on public.clinic_contract_documents;
create policy clinic_contract_documents_select_member_or_admin
  on public.clinic_contract_documents for select to authenticated
  using (public.is_clinic_member(clinic_id) or public.is_platform_admin_aal2());

drop policy if exists clinic_contract_documents_write_platform
  on public.clinic_contract_documents;
create policy clinic_contract_documents_write_platform
  on public.clinic_contract_documents for all to authenticated
  using (public.is_platform_admin_aal2())
  with check (public.is_platform_admin_aal2());

drop policy if exists clinic_contracts_storage_select on storage.objects;
create policy clinic_contracts_storage_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'clinic-contracts'
    and (
      public.is_platform_admin_aal2()
      or public.is_clinic_member((storage.foldername(name))[1]::uuid)
    )
  );

drop policy if exists clinic_contracts_storage_insert on storage.objects;
create policy clinic_contracts_storage_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'clinic-contracts'
    and public.is_platform_admin_aal2()
    and (storage.foldername(name))[1] is not null
  );

drop policy if exists clinic_contracts_storage_update on storage.objects;
create policy clinic_contracts_storage_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'clinic-contracts'
    and public.is_platform_admin_aal2()
  )
  with check (
    bucket_id = 'clinic-contracts'
    and public.is_platform_admin_aal2()
  );

drop policy if exists clinic_contracts_storage_delete on storage.objects;
create policy clinic_contracts_storage_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'clinic-contracts'
    and public.is_platform_admin_aal2()
  );

drop policy if exists feedback_threads_select on public.feedback_threads;
create policy feedback_threads_select
  on public.feedback_threads for select to authenticated
  using (auth.uid() = user_id or public.is_platform_admin_aal2());

drop policy if exists feedback_threads_insert on public.feedback_threads;
create policy feedback_threads_insert
  on public.feedback_threads for insert to authenticated
  with check (
    auth.uid() = user_id
    and (
      public.is_platform_admin_aal2()
      or (clinic_id is not null and public.is_clinic_member(clinic_id))
    )
  );

drop policy if exists feedback_messages_select on public.feedback_messages;
create policy feedback_messages_select
  on public.feedback_messages for select to authenticated
  using (auth.uid() = user_id or public.is_platform_admin_aal2());

drop policy if exists platform_ai_settings_update_admin on public.platform_ai_settings;
create policy platform_ai_settings_update_admin
  on public.platform_ai_settings for update to authenticated
  using (public.is_platform_admin_aal2())
  with check (public.is_platform_admin_aal2());

drop policy if exists platform_ai_settings_insert_admin on public.platform_ai_settings;
create policy platform_ai_settings_insert_admin
  on public.platform_ai_settings for insert to authenticated
  with check (public.is_platform_admin_aal2());

drop policy if exists clinics_insert_platform_admin on public.clinics;
create policy clinics_insert_platform_admin
  on public.clinics for insert to authenticated
  with check (public.is_platform_admin_aal2());
