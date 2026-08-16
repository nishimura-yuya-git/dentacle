/**
 * 先頭のティックは待たずに再取得する。
 * 自動提案の連打は、静穏がこの時間続いたあとに1回だけ追加で取る。
 */
export const CALENDAR_SYNC_RELOAD_DEBOUNCE_MS = 400

export function shouldReloadCalendarFromSyncTick(input: {
  viewingClinicId: string | undefined
  eventClinicId: string | null
}): boolean {
  if (!input.viewingClinicId || !input.eventClinicId) return false
  return input.viewingClinicId === input.eventClinicId
}

export function createDebouncedRunner(delayMs: number) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let pending = false
  let lastTask: (() => void) | null = null

  const onWindowEnd = () => {
    timer = null
    if (!pending || !lastTask) {
      pending = false
      lastTask = null
      return
    }
    pending = false
    const task = lastTask
    lastTask = null
    task()
  }

  const run = (task: () => void) => {
    if (!timer) {
      task()
      timer = setTimeout(onWindowEnd, delayMs)
      return
    }
    lastTask = task
    pending = true
    clearTimeout(timer)
    timer = setTimeout(onWindowEnd, delayMs)
  }

  const cancel = () => {
    if (timer) clearTimeout(timer)
    timer = null
    pending = false
    lastTask = null
  }

  return { run, cancel }
}
