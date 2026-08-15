/**
 * カレンダー日次 load の完了判定。
 * silent は開始時に loading を立てない（枠を消さない）だけ。
 * 最新リクエストなら、silent でも必ず loading を下ろす。
 */

export function isLatestCalendarDayLoad(seq: number, latestSeq: number): boolean {
  return seq === latestSeq
}

export function shouldClearCalendarDayLoading(input: {
  isLatest: boolean
  silent: boolean
}): boolean {
  if (!input.isLatest) return false
  // silent は開始時に枠を消さないためだけ。完了時は silent でも下ろす
  return input.silent === true || input.silent === false
}
