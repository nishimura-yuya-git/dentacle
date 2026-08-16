-- 招待後のパスワード強制は app_metadata。本人の user_metadata 更新では外せない。
-- パスワードハッシュが変わったときだけフラグを下ろす。

create or replace function public.clear_must_set_password_on_password_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and old.encrypted_password is distinct from new.encrypted_password
  then
    new.raw_app_meta_data :=
      coalesce(new.raw_app_meta_data, '{}'::jsonb) || '{"must_set_password": false}'::jsonb;
    new.raw_user_meta_data :=
      coalesce(new.raw_user_meta_data, '{}'::jsonb) || '{"must_set_password": false}'::jsonb;
  end if;
  return new;
end;
$$;

drop trigger if exists clear_must_set_password_on_password_change on auth.users;
create trigger clear_must_set_password_on_password_change
before update on auth.users
for each row
execute function public.clear_must_set_password_on_password_change();

revoke all on function public.clear_must_set_password_on_password_change() from public, anon;

comment on function public.clear_must_set_password_on_password_change() is
  'パスワード変更時だけ must_set_password を下ろす。クライアントの user_metadata 更新では動かない。';
