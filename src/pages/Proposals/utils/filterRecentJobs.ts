/** 最近の提案ジョブ履歴のクリニック絞り込み（空文字 = すべて） */

export type RecentJobClinicFields = {
  clinic_id: string
  clinicName: string
}

/** クリニック Select 用オプション（先頭にすべて） */
export function buildRecentJobsClinicFilterOptions(
  clinics: Array<{ id: string; name: string }>,
): Array<{ value: string; label: string }> {
  const sorted = [...clinics].sort((a, b) => a.name.localeCompare(b.name, 'ja'))
  return [
    { value: '', label: 'すべてのクリニック' },
    ...sorted.map((clinic) => ({ value: clinic.id, label: clinic.name })),
  ]
}

/** 履歴行をクリニックで絞る */
export function filterRecentJobsByClinic<T extends RecentJobClinicFields>(
  rows: T[],
  clinicId: string,
): T[] {
  if (!clinicId) return rows
  return rows.filter((row) => row.clinic_id === clinicId)
}

/** 全院表示のときクリニック列を出す */
export function shouldShowRecentJobsClinicColumn(clinicFilter: string): boolean {
  return clinicFilter === ''
}
