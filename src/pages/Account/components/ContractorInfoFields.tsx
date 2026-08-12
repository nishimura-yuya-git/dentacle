import type { ContractorProfile } from '@/pages/Account/hooks/useContractorProfile'

const FIELDS: { key: keyof ContractorProfile; label: string }[] = [
  { key: 'corporate_name', label: '法人名' },
  { key: 'representative_name', label: '代表者名' },
  { key: 'postal_code', label: '郵便番号' },
  { key: 'prefecture', label: '都道府県' },
  { key: 'address', label: '住所' },
  { key: 'phone', label: '電話番号' },
  { key: 'login_email', label: 'ログイン用メールアドレス' },
  { key: 'invoice_email', label: '請求書送付用メールアドレス' },
]

function displayValue(value: unknown): string {
  if (typeof value !== 'string') return '—'
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : '—'
}

type Props = {
  profile: ContractorProfile | null
}

/** 契約者情報の読み取り専用フィールド一覧 */
export function ContractorInfoFields({ profile }: Props) {
  return (
    <dl className="grid gap-5 sm:grid-cols-2">
      {FIELDS.map((field) => (
        <div
          key={field.key}
          className={field.key === 'address' ? 'sm:col-span-2' : undefined}
        >
          <dt className="text-xs font-bold text-slate-400">{field.label}</dt>
          <dd className="mt-1.5 text-sm font-medium text-slate-800">
            {displayValue(profile?.[field.key])}
          </dd>
        </div>
      ))}
    </dl>
  )
}
