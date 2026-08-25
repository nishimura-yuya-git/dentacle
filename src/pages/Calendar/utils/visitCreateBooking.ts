/** 手動登録の予約状態。既定は仮予約。 */

export type VisitBookingStatus = 'tentative' | 'confirmed'

export function resolveCreateVisitStatus(
  bookingStatus: VisitBookingStatus | undefined,
): 'tentative' | 'confirmed' {
  return bookingStatus === 'confirmed' ? 'confirmed' : 'tentative'
}

export function createVisitRegisteredMessage(
  status: 'tentative' | 'confirmed',
): string {
  return status === 'confirmed'
    ? '本予約として登録しました'
    : '仮予約を登録し、電話確認キューに追加しました'
}
