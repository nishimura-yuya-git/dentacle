/** カレンダー枠クリックは常に詳細を開く。本予約確定は詳細の主操作 */
export function shouldOpenDetailOnVisitClick(_status: string): boolean {
  return true
}

/** 詳細から本予約にできるのは仮予約だけ */
export function canConfirmTentativeFromDetail(status: string): boolean {
  return status === 'tentative'
}
