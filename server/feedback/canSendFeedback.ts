/** ご意見送信の可否。運営は AAL2 だけ。所属はクリニック会員。 */
export function decideFeedbackCanSend(input: {
  isPlatformAdminAal2: boolean
  clinicId: string | null
  isClinicMember: boolean
}): boolean {
  if (input.isPlatformAdminAal2) return true
  if (!input.clinicId) return false
  return input.isClinicMember
}
