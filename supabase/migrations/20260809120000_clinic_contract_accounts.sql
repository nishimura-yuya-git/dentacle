-- 契約者情報・締結PDF・プラットフォーム運営権限
-- 方針: クリニック会員は閲覧のみ。書込は is_platform_admin() のみ。

-- ---------------------------------------------------------------------------
-- platform_admins
-- ---------------------------------------------------------------------------
create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);

comment on table public.platform_admins is 'デンタクル運営（クリニック横断）。契約者情報・締結PDFの書込権限。';

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
  );
$$;

revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

alter table public.platform_admins enable row level security;

create policy platform_admins_select_self_or_admin
  on public.platform_admins for select to authenticated
  using (user_id = auth.uid() or public.is_platform_admin());

-- 初回 seed は service role / Dashboard SQL。以降は運営同士のみ追加可
create policy platform_admins_insert_admin
  on public.platform_admins for insert to authenticated
  with check (public.is_platform_admin());

create policy platform_admins_delete_admin
  on public.platform_admins for delete to authenticated
  using (public.is_platform_admin());

revoke all on table public.platform_admins from anon, authenticated;
grant select, insert, delete on table public.platform_admins to authenticated;

-- ---------------------------------------------------------------------------
-- clinic_contractor_profiles（契約者情報・クリニック1:1）
-- ---------------------------------------------------------------------------
create table public.clinic_contractor_profiles (
  clinic_id uuid primary key references public.clinics (id) on delete cascade,
  corporate_name text,
  representative_name text,
  postal_code text,
  prefecture text,
  address text,
  phone text,
  login_email text,
  invoice_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb
);

comment on table public.clinic_contractor_profiles is '契約者情報。login_email は契約上の連絡用（auth ユーザーと自動同期しない）。';

alter table public.clinic_contractor_profiles enable row level security;

create policy clinic_contractor_profiles_select_member_or_admin
  on public.clinic_contractor_profiles for select to authenticated
  using (
    public.is_clinic_member(clinic_id)
    or public.is_platform_admin()
  );

create policy clinic_contractor_profiles_write_platform
  on public.clinic_contractor_profiles for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

revoke all on table public.clinic_contractor_profiles from anon, authenticated;
grant select, insert, update, delete on table public.clinic_contractor_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- clinic_contract_documents（締結PDFメタ）
-- ---------------------------------------------------------------------------
create table public.clinic_contract_documents (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  content_type text not null default 'application/pdf',
  byte_size bigint,
  is_active boolean not null default true,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint clinic_contract_documents_pdf_type
    check (content_type = 'application/pdf')
);

create index idx_clinic_contract_documents_clinic
  on public.clinic_contract_documents (clinic_id, uploaded_at desc);

create unique index idx_clinic_contract_documents_one_active
  on public.clinic_contract_documents (clinic_id)
  where is_active = true;

comment on table public.clinic_contract_documents is '締結PDF。storage.objects の clinic-contracts バケットと対になる。';

alter table public.clinic_contract_documents enable row level security;

create policy clinic_contract_documents_select_member_or_admin
  on public.clinic_contract_documents for select to authenticated
  using (
    public.is_clinic_member(clinic_id)
    or public.is_platform_admin()
  );

create policy clinic_contract_documents_write_platform
  on public.clinic_contract_documents for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

revoke all on table public.clinic_contract_documents from anon, authenticated;
grant select, insert, update, delete on table public.clinic_contract_documents to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: clinic-contracts（非公開PDF）
-- パス規約: {clinic_id}/{document_id}.pdf
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'clinic-contracts',
  'clinic-contracts',
  false,
  10485760,
  array['application/pdf']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy clinic_contracts_storage_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'clinic-contracts'
    and (
      public.is_platform_admin()
      or public.is_clinic_member((storage.foldername(name))[1]::uuid)
    )
  );

create policy clinic_contracts_storage_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'clinic-contracts'
    and public.is_platform_admin()
    and (storage.foldername(name))[1] is not null
  );

create policy clinic_contracts_storage_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'clinic-contracts'
    and public.is_platform_admin()
  )
  with check (
    bucket_id = 'clinic-contracts'
    and public.is_platform_admin()
  );

create policy clinic_contracts_storage_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'clinic-contracts'
    and public.is_platform_admin()
  );
