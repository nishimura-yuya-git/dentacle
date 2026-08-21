/** マイページ本人編集。編集してよいのは表示名だけ。 */

export type DisplayNameDraft = {
  displayName: string
}

export type DisplayNameValidation =
  | { ok: true; displayName: string }
  | { ok: false; message: string }

export function profileToDraft(displayName: string | null | undefined): DisplayNameDraft {
  return { displayName: displayName ?? '' }
}

export function validateDisplayName(value: string): DisplayNameValidation {
  const displayName = value.trim()
  if (displayName.length === 0) {
    return { ok: false, message: '表示名を入力してください。' }
  }
  return { ok: true, displayName }
}

export function toMyProfilePublicError(raw: string): string {
  const lower = raw.toLowerCase()
  if (lower.includes('row-level security') || lower.includes('permission denied')) {
    return 'アカウント情報を保存する権限がありません。'
  }
  return 'アカウント情報の保存に失敗しました。時間をおいて再度お試しください。'
}

export function formatMyPageText(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? ''
  return trimmed.length > 0 ? trimmed : '—'
}

export function formatMyPageClinicLabel(
  clinicReady: boolean,
  clinicName: string | null | undefined,
): string {
  if (!clinicReady) return '—'
  const trimmed = clinicName?.trim() ?? ''
  return trimmed.length > 0 ? trimmed : '未所属'
}
