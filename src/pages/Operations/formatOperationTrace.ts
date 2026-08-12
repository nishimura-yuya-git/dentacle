/** 操作ログ表示用の日本語整形・絞り込み（SSoT） */

export type OperationTraceViewInput = {
  action: string
  entity_type: string
  entity_id: string | null
  payload: Record<string, unknown> | null
  created_at: string
}

export type OperationTraceFilter = {
  /** 空文字 = すべてのクリニック */
  clinicId: string
  /** 空文字 = すべて */
  action: string
  /** 空文字 = すべて */
  entityType: string
}

const ACTION_LABEL: Record<string, string> = {
  'visit.create_manual': '手動で仮予約を作成',
  'visit.create_auto_proposal_gap_fill': '空き枠埋めから仮予約を作成',
  'visit.update': '訪問を更新',
  'visit.cancel': '訪問を取消',
  'visit.move': '訪問を移動',
  'visit.resize': '訪問時間を変更',
  'visit.confirm_from_calendar': 'カレンダーで本予約に確定',
  'visit.confirm_auto_proposals': '自動提案を一括確定',
  'visit.clear_auto_proposals': '自動提案をクリア',
  'calendar_block.create': '空きブロックを作成',
  'phone.ok_confirm_visit': '電話確認OK→本予約',
  'phone.ng_repropose': '電話確認NG→再提案',
}

const ENTITY_LABEL: Record<string, string> = {
  visit: '訪問',
  calendar_block: '空きブロック',
  phone_confirmation: '電話確認',
  patient: '患者',
}

/** Select 用: 操作（先頭はすべて） */
export const OPERATION_ACTION_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'すべて' },
  ...Object.entries(ACTION_LABEL).map(([value, label]) => ({ value, label })),
]

/** Select 用: 対象（先頭はすべて） */
export const OPERATION_ENTITY_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'すべて' },
  ...Object.entries(ENTITY_LABEL).map(([value, label]) => ({ value, label })),
]

/** 操作名（未知キーは「その他の操作」） */
export function formatOperationActionLabel(action: string): string {
  return ACTION_LABEL[action] ?? 'その他の操作'
}

/** 対象種別の日本語 */
export function formatOperationEntityLabel(entityType: string): string {
  return ENTITY_LABEL[entityType] ?? 'その他'
}

function asPositiveInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value)
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const n = Number(value)
    return n > 0 ? n : null
  }
  return null
}

function asDateLabel(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  // YYYY-MM-DD をそのまま読める形に
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return value.trim()
  return `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日`
}

/** payload / entity から詳細1行を作る */
export function formatOperationDetail(input: {
  action: string
  entity_id: string | null
  payload: Record<string, unknown> | null
}): string {
  const payload = input.payload ?? {}
  const parts: string[] = []
  const dateLabel = asDateLabel(payload.date)
  if (dateLabel) parts.push(`対象日 ${dateLabel}`)
  const count = asPositiveInt(payload.count)
  if (count != null) parts.push(`${count}件`)

  if (parts.length > 0) return parts.join('・')

  // 個別操作で ID しかない場合は短く示す（主表示にはしない）
  if (input.entity_id) {
    return `対象ID ${input.entity_id.slice(0, 8)}…`
  }

  // 未知 action のときだけキーを補助表示
  if (!ACTION_LABEL[input.action]) {
    return input.action
  }

  return '—'
}

export function formatOperationCreatedAt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('ja-JP')
}

/** 取得済み行をクリニック・操作・対象で絞り込む（空文字はすべて） */
export function filterOperationTraces<
  T extends { action: string; entity_type: string; clinic_id: string },
>(rows: T[], filter: OperationTraceFilter): T[] {
  return rows.filter((row) => {
    if (filter.clinicId && row.clinic_id !== filter.clinicId) return false
    if (filter.action && row.action !== filter.action) return false
    if (filter.entityType && row.entity_type !== filter.entityType) return false
    return true
  })
}

/** クリニック Select 用オプション（先頭にすべて） */
export function buildOperationClinicFilterOptions(
  clinics: Array<{ id: string; name: string }>,
): Array<{ value: string; label: string }> {
  const sorted = [...clinics].sort((a, b) => a.name.localeCompare(b.name, 'ja'))
  return [
    { value: '', label: 'すべてのクリニック' },
    ...sorted.map((c) => ({ value: c.id, label: c.name })),
  ]
}

/** 右下の表示件数切替（Select 用） */
export const OPERATION_PAGE_SIZE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '10', label: '10件' },
  { value: '20', label: '20件' },
  { value: '50', label: '50件' },
]

export const DEFAULT_OPERATION_PAGE_SIZE = 20

/** 絞り込み後の行をページ分割する（page は 1 始まり） */
export function paginateOperationTraces<T>(
  rows: T[],
  page: number,
  pageSize: number,
): { pageRows: T[]; totalPages: number; page: number; pageSize: number } {
  const size = pageSize > 0 ? pageSize : DEFAULT_OPERATION_PAGE_SIZE
  const totalPages = Math.max(1, Math.ceil(rows.length / size))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * size
  return {
    pageRows: rows.slice(start, start + size),
    totalPages,
    page: safePage,
    pageSize: size,
  }
}
