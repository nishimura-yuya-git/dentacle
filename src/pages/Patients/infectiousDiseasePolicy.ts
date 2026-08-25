/** 感染症フラグの表示・判定。正は patients.has_infectious_disease。 */

export const INFECTIOUS_DISEASE_LABEL = '感染症'

export const INFECTIOUS_DISEASE_HINT = '器具・接触に注意。他の患者へうつさない'

/** 一覧・カレンダー・電話確認で共通の黒寄り灰色 */
export const INFECTIOUS_FILL_CLASS = 'bg-slate-800'

export const INFECTIOUS_BLOCK_SURFACE_CLASS = 'border-slate-900 bg-slate-800'

export function readHasInfectiousDisease(value: unknown): boolean {
  return value === true
}

export function listRowClassName(hasInfectious: boolean, index: number): string {
  if (hasInfectious) return `group ${INFECTIOUS_FILL_CLASS} hover:bg-slate-800`
  const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'
  return `group ${rowBg} hover:bg-emerald-50/40`
}

export function listCellClassName(hasInfectious: boolean, extra = ''): string {
  const tone = hasInfectious
    ? 'border-b border-slate-700 px-3 py-3 align-middle text-sm text-slate-100'
    : 'border-b border-slate-100 px-3 py-3 align-middle text-sm text-slate-700'
  return extra ? `${tone} ${extra}` : tone
}

export function listNameClassName(hasInfectious: boolean): string {
  return hasInfectious ? 'text-slate-50' : 'text-slate-900'
}

export function listKanaClassName(hasInfectious: boolean): string {
  return hasInfectious ? 'text-slate-300' : 'text-slate-500'
}

export function listMetaClassName(hasInfectious: boolean): string {
  return hasInfectious ? 'text-slate-400' : 'text-slate-400'
}

export function visitBlockTextClasses(hasInfectious: boolean): {
  time: string
  name: string
  status: string
} {
  if (hasInfectious) {
    return {
      time: 'truncate text-[10px] font-bold leading-none text-slate-300',
      name: 'mt-0.5 truncate text-[11px] font-bold leading-none text-slate-50',
      status: 'mt-0.5 shrink-0 truncate text-[10px] font-bold leading-none text-slate-300',
    }
  }
  return {
    time: 'truncate text-[10px] font-bold leading-none text-slate-500',
    name: 'mt-0.5 truncate text-[11px] font-bold leading-none text-slate-900',
    status: 'mt-0.5 shrink-0 truncate text-[10px] font-bold leading-none',
  }
}
