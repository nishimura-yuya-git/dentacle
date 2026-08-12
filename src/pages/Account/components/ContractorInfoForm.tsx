import { Input } from '@/components/ui/Input'
import type { ContractorProfileDraft } from '@/pages/Account/hooks/useContractorProfile'

type Props = {
  value: ContractorProfileDraft
  onChange: (next: ContractorProfileDraft) => void
  disabled?: boolean
}

const FIELDS: {
  key: keyof ContractorProfileDraft
  label: string
  full?: boolean
  type?: 'text' | 'email' | 'tel'
}[] = [
  { key: 'corporate_name', label: '法人名' },
  { key: 'representative_name', label: '代表者名' },
  { key: 'postal_code', label: '郵便番号' },
  { key: 'prefecture', label: '都道府県' },
  { key: 'address', label: '住所', full: true },
  { key: 'phone', label: '電話番号', type: 'tel' },
  { key: 'login_email', label: 'ログイン用メールアドレス', type: 'email' },
  { key: 'invoice_email', label: '請求書送付用メールアドレス', type: 'email' },
]

/** 契約者情報の編集フォーム（運営向け） */
export function ContractorInfoForm({ value, onChange, disabled }: Props) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {FIELDS.map((field) => (
        <div key={field.key} className={field.full ? 'sm:col-span-2' : undefined}>
          <Input
            label={field.label}
            name={field.key}
            type={field.type ?? 'text'}
            value={value[field.key]}
            disabled={disabled}
            autoComplete="off"
            onChange={(event) =>
              onChange({
                ...value,
                [field.key]: event.target.value,
              })
            }
          />
        </div>
      ))}
    </div>
  )
}
