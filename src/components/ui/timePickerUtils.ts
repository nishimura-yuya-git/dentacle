/** HH:mm（または HH:mm:ss）のパース・整形。TimePicker の SSoT。 */

export function parseTimeHm(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim())
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null
  }
  return { hour, minute }
}

export function formatTimeHm(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function buildHourOptions(
  minHour = 0,
  maxHour = 23,
): { value: number; label: string }[] {
  const options: { value: number; label: string }[] = []
  for (let h = minHour; h <= maxHour; h += 1) {
    options.push({ value: h, label: String(h).padStart(2, '0') })
  }
  return options
}

export function buildMinuteOptions(
  step = 5,
): { value: number; label: string }[] {
  const safeStep = step > 0 && 60 % step === 0 ? step : 5
  const options: { value: number; label: string }[] = []
  for (let m = 0; m < 60; m += safeStep) {
    options.push({ value: m, label: String(m).padStart(2, '0') })
  }
  return options
}

/** ステップに合わない分を最も近い候補へ丸める */
export function snapMinute(minute: number, step = 5): number {
  const safeStep = step > 0 && 60 % step === 0 ? step : 5
  const snapped = Math.round(minute / safeStep) * safeStep
  return Math.min(59, Math.max(0, snapped === 60 ? 60 - safeStep : snapped))
}
