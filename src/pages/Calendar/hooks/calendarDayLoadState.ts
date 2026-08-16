/**
 * カレンダー日次 load の完了判定。
 * silent は開始時に loading を立てない（枠を消さない）だけ。
 * 最新リクエストなら、silent でも必ず loading を下ろす。
 */

export function isLatestCalendarDayLoad(seq: number, latestSeq: number): boolean {
  return seq === latestSeq
}

/**
 * 他端末同期・移動後の silent 再取得は、号車が既にあるなら当日分だけ取る。
 * 号車確保・職員・全患者・全日 team_id・院 metadata は日付切替の非silent に任せる。
 */
export function shouldUseCalendarDayOnlyReload(input: {
  silent: boolean
  hasTeams: boolean
}): boolean {
  return input.silent === true && input.hasTeams === true
}

export function shouldClearCalendarDayLoading(input: {
  isLatest: boolean
  silent: boolean
}): boolean {
  if (!input.isLatest) return false
  // silent は開始時に枠を消さないためだけ。完了時は silent でも下ろす
  return input.silent === true || input.silent === false
}
