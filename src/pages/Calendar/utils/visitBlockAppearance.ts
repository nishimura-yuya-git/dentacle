import {
  INFECTIOUS_BLOCK_SURFACE_CLASS,
  INFECTIOUS_FILL_CLASS,
  readHasInfectiousDisease,
} from '../../Patients/infectiousDiseasePolicy.ts'
import {
  DEFAULT_VISIT_CELL_COLOR,
  isVisitCellColor,
  visitCellColorOption,
} from '../../../utils/visitMenus/visitCellColor.ts'

/** 自動提案由来の仮予約（点線枠の対象） */
export function isAutoProposalTentative(visit: {
  status: string
  source?: string | null
}): boolean {
  return visit.status === 'tentative' && visit.source === 'auto_proposal'
}

/** 仮枠で「仮（クリックで詳細）」を切らさず見せる最小高さ */
export const PROVISIONAL_BLOCK_MIN_HEIGHT_PX = 64

/**
 * 枠高さに応じた仮ラベル。短い枠では「仮」のみにして切れを防ぐ。
 */
export function provisionalStatusLabel(heightPx: number): string {
  return heightPx < PROVISIONAL_BLOCK_MIN_HEIGHT_PX ? '仮' : '仮（クリックで詳細）'
}

/** 仮枠の描画高さ（時間幅と読みやすさの大きい方） */
export function provisionalBlockHeightPx(durationHeightPx: number): number {
  return Math.max(durationHeightPx, PROVISIONAL_BLOCK_MIN_HEIGHT_PX)
}

/** 枠線 2px。行間は gap-0.5。文字を縮めて重ねない */
const VISIT_CARD_CHROME_PX = 2
const VISIT_CARD_GAP_PX = 2
const VISIT_CARD_TIME_PX = 12
const VISIT_CARD_NAME_PX = 13
const VISIT_CARD_EXTRA_PX = 12

export type VisitCardLayout = {
  showTreatment: boolean
  /** 状態を独立した行にする。false のときは時刻と同じ行の右に置く */
  statusOnOwnLine: boolean
}

function visitCardRowsHeight(rowHeights: number[]): number {
  if (rowHeights.length === 0) return 0
  const gaps = VISIT_CARD_GAP_PX * (rowHeights.length - 1)
  return rowHeights.reduce((sum, row) => sum + row, 0) + gaps
}

/** 予約カードの行構成。高さに入らない行は潰さず、状態を時刻行へ寄せる */
export function planVisitCardLayout(heightPx: number, hasTreatment: boolean): VisitCardLayout {
  const budget = Math.max(0, heightPx - VISIT_CARD_CHROME_PX)
  const base = [VISIT_CARD_TIME_PX, VISIT_CARD_NAME_PX]
  const withTreatment = hasTreatment ? [...base, VISIT_CARD_EXTRA_PX] : base
  if (budget >= visitCardRowsHeight([...withTreatment, VISIT_CARD_EXTRA_PX])) {
    return { showTreatment: hasTreatment, statusOnOwnLine: true }
  }
  if (hasTreatment && budget >= visitCardRowsHeight(withTreatment)) {
    return { showTreatment: true, statusOnOwnLine: false }
  }
  return {
    showTreatment: false,
    statusOnOwnLine: budget >= visitCardRowsHeight([...base, VISIT_CARD_EXTRA_PX]),
  }
}


/** カレンダー訪問ブロックの見た目クラス */
export function visitBlockClassName(visit: {
  status: string
  source?: string | null
  cell_color?: string | null
  has_infectious_disease?: boolean
  patients?: { has_infectious_disease?: boolean } | null
}): string {
  const infectious = readHasInfectiousDisease(
    visit.has_infectious_disease ?? visit.patients?.has_infectious_disease,
  )
  const color = visitCellColorOption(
    isVisitCellColor(visit.cell_color) ? visit.cell_color : DEFAULT_VISIT_CELL_COLOR,
  )
  const fillClass = infectious ? INFECTIOUS_FILL_CLASS : color.fillClass
  const surfaceClass = infectious ? INFECTIOUS_BLOCK_SURFACE_CLASS : color.surfaceClass

  if (isAutoProposalTentative(visit)) {
    return [
      'absolute left-1 right-1 z-[2] flex cursor-pointer flex-col justify-start overflow-hidden rounded-md',
      `border-2 border-dashed ${infectious ? 'border-slate-400' : 'border-[#008C01]/55'} ${fillClass} gap-0.5 px-1.5 py-0 text-left`,
      'shadow-none outline-none',
      'focus:outline-none focus-visible:outline-none focus-visible:ring-0',
      'active:cursor-grabbing',
    ].join(' ')
  }

  return [
    'absolute left-1 right-1 z-[1] flex cursor-grab flex-col overflow-hidden rounded-md',
    `border ${surfaceClass} gap-0.5 px-1.5 py-0 text-left shadow-sm`,
    'outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0',
    'active:cursor-grabbing',
  ].join(' ')
}
