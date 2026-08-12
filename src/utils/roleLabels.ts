export const CLINIC_ROLES = [
  'owner',
  'admin',
  'coordinator',
  'call',
  'doctor',
  'dh',
] as const

export type ClinicRole = (typeof CLINIC_ROLES)[number]

export function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    owner: 'オーナー',
    admin: '管理者',
    coordinator: 'コーディネーター',
    call: 'コール担当',
    doctor: '医師',
    dh: '歯科衛生士',
  }
  return labels[role] ?? role
}

export function frequencyLabel(value: string): string {
  const labels: Record<string, string> = {
    weekly: '毎週',
    biweekly: '隔週',
    monthly: '毎月',
    custom: 'カスタム',
    unknown: '未設定（仮）',
  }
  return labels[value] ?? value
}

export const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

export function phoneStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: '未確認',
    ok: 'OK',
    ng: 'NG',
    absent: '不在',
    callback_waiting: '折返し待ち',
    facility_waiting: '施設確認待ち',
  }
  return labels[status] ?? status
}

export function visitStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    tentative: '仮予約',
    confirmed: '本予約',
    cancelled: '取消',
    completed: '完了',
    no_show: '不在',
  }
  return labels[status] ?? status
}
