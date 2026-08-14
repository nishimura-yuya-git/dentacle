/** 空きブロック（休憩・移動など）の斜線見た目 */
export const CALENDAR_HATCH_CLASS = 'calendar-hatch-fill'

export function calendarBlockClassName(): string {
  return [
    'absolute left-1 right-1 z-[1] overflow-hidden rounded-md',
    `border border-slate-300/80 ${CALENDAR_HATCH_CLASS} px-1.5 py-1 text-left`,
  ].join(' ')
}
