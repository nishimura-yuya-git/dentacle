-- 患者書類（PDF）。本体は非公開バケット patient-documents。
-- パス規約: {clinic_id}/{patient_id}/{document_id}.pdf
-- 患者の登録・編集と同じロール（owner / admin / coordinator / call）が追加・削除できる。
-- 所属メンバーは閲覧できる。削除は論理削除。ストレージ上の実体はアプリが先に消す。

create unique index if not exists uq_patients_id_clinic_id
  on public.patients (id, clinic_id);

create table public.patient_documents (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  patient_id uuid not null,
  storage_path text not null,
  file_name text not null check (char_length(btrim(file_name)) between 1 and 200),
  content_type text not null default 'application/pdf' check (content_type = 'application/pdf'),
  byte_size bigint not null check (byte_size > 0 and byte_size <= 10485760),
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id),
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  constraint patient_documents_patient_clinic_fkey
    foreign key (patient_id, clinic_id)
    references public.patients (id, clinic_id),
  constraint patient_documents_storage_path_shape
    check (
      storage_path = clinic_id::text || '/' || patient_id::text || '/' || id::text || '.pdf'
    )
);

create unique index uq_patient_documents_storage_path_active
  on public.patient_documents (storage_path)
  where deleted_at is null;

create index idx_patient_documents_patient_active
  on public.patient_documents (clinic_id, patient_id, uploaded_at desc)
  where deleted_at is null;

create trigger trg_patient_documents_updated_at
  before update on public.patient_documents
  for each row execute function public.set_updated_at();

-- 有効書類は患者あたり20件。同時登録でも超えないよう患者単位でロックする。
create or replace function public.enforce_patient_document_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_count integer;
begin
  if new.deleted_at is not null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext(new.patient_id::text)::bigint);

  select count(*) into active_count
  from public.patient_documents
  where patient_id = new.patient_id
    and clinic_id = new.clinic_id
    and deleted_at is null
    and id <> new.id;

  if active_count >= 20 then
    raise exception 'patient document limit exceeded' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger trg_patient_documents_limit
  before insert or update on public.patient_documents
  for each row execute function public.enforce_patient_document_limit();

revoke all on function public.enforce_patient_document_limit() from public, anon, authenticated;

alter table public.patient_documents enable row level security;

create policy patient_documents_select
  on public.patient_documents for select to authenticated
  using (
    public.is_clinic_member(clinic_id)
    and deleted_at is null
  );

create policy patient_documents_insert
  on public.patient_documents for insert to authenticated
  with check (
    public.has_clinic_role(clinic_id, array['owner', 'admin', 'coordinator', 'call'])
    and deleted_at is null
  );

create policy patient_documents_update
  on public.patient_documents for update to authenticated
  using (
    public.has_clinic_role(clinic_id, array['owner', 'admin', 'coordinator', 'call'])
    and deleted_at is null
  )
  with check (
    public.has_clinic_role(clinic_id, array['owner', 'admin', 'coordinator', 'call'])
  );

revoke all on table public.patient_documents from anon, authenticated;
grant select, insert on table public.patient_documents to authenticated;
grant update (deleted_at, deleted_by) on table public.patient_documents to authenticated;

comment on table public.patient_documents is
  '患者書類PDFのメタデータ。本体は storage バケット patient-documents。';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'patient-documents',
  'patient-documents',
  false,
  10485760,
  array['application/pdf']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy patient_documents_storage_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'patient-documents'
    and name ~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}\.pdf$'
    and public.is_clinic_member(((storage.foldername(name))[1])::uuid)
  );

create policy patient_documents_storage_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'patient-documents'
    and name ~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}\.pdf$'
    and public.has_clinic_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner', 'admin', 'coordinator', 'call']
    )
  );

create policy patient_documents_storage_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'patient-documents'
    and name ~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}\.pdf$'
    and public.has_clinic_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner', 'admin', 'coordinator', 'call']
    )
  );
