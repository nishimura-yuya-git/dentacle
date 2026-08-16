-- set_updated_at は new.version を必ず更新する。
-- clinic_calendar_sync / clinic_calendar_peers には version が無いため、
-- 心拍 upsert と訪問移動（sync ティック更新）が
-- 「record new has no field version」で 400 になっていた。

drop trigger if exists trg_clinic_calendar_sync_updated_at
  on public.clinic_calendar_sync;

drop trigger if exists trg_clinic_calendar_peers_updated_at
  on public.clinic_calendar_peers;
