-- 患者住所のジオコード結果（割付距離行列の根拠）。
-- 生住所はエージェントへ渡さず、座標→travelMinutesMatrix のみ渡す（PROJECT_MEMORY §6.12 / §6.16）。
alter table public.patients
  add column if not exists latitude numeric(10, 7),
  add column if not exists longitude numeric(10, 7);

comment on column public.patients.latitude is '住所ジオコード結果（緯度）。scripts/geocode-patient-addresses.mjs で更新';
comment on column public.patients.longitude is '住所ジオコード結果（経度）。scripts/geocode-patient-addresses.mjs で更新';
