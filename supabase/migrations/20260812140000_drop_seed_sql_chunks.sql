-- S-01: シード用一時表。0行・アプリ未参照・RLS無効で Advisors Critical のため削除する。
-- 再シードが必要なら service_role のみの一時表として作り直す。
drop table if exists public._seed_sql_chunks;
