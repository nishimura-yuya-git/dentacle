/** 整数ステッパーの範囲と入力。ネイティブ number は使わない。 */

export function clampStepperInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.trunc(value)))
}

export function parseStepperInt(
  raw: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const digits = raw.replace(/[^\d]/g, '')
  if (!digits) return clampStepperInt(fallback, min, max)
  return clampStepperInt(Number(digits), min, max)
}

export function stepStepperInt(
  value: number,
  delta: number,
  min: number,
  max: number,
): number {
  return clampStepperInt(value + delta, min, max)
}

export function digitsOnly(raw: string): string {
  return raw.replace(/[^\d]/g, '')
}
