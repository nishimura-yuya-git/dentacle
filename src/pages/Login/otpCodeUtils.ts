/** 認証コード文字列から数字だけを最大 length 桁取り出す（コピペ用） */
export function normalizeOtpDigits(raw: string, length = 6): string {
  return raw.replace(/\D/g, '').slice(0, length)
}

export function otpDigitsArray(code: string, length = 6): string[] {
  const normalized = normalizeOtpDigits(code, length)
  return Array.from({ length }, (_, index) => normalized[index] ?? '')
}
