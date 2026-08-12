-- PostgREST embed 用（profiles と clinic_members を user_id で結合）
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'clinic_members_user_id_profiles_fkey'
  ) then
    alter table public.clinic_members
      add constraint clinic_members_user_id_profiles_fkey
      foreign key (user_id) references public.profiles(id);
  end if;
end;
$$;
