import { Input } from '@/components/ui/Input'
import {
  formatMyPageClinicLabel,
  formatMyPageText,
  type DisplayNameDraft,
} from '@/pages/Account/hooks/myProfilePolicy'

type Props = {
  value: DisplayNameDraft
  email: string | null | undefined
  clinicReady: boolean
  clinicName: string | null | undefined
  disabled?: boolean
  error?: string
  onChange: (next: DisplayNameDraft) => void
}

/** マイページの編集フォーム。入力できるのは表示名だけ。 */
export function MyPageForm({
  value,
  email,
  clinicReady,
  clinicName,
  disabled,
  error,
  onChange,
}: Props) {
  return (
    <div className="space-y-5">
      <Input
        id="my-page-display-name"
        name="displayName"
        label="表示名"
        value={value.displayName}
        disabled={disabled}
        error={error}
        autoComplete="name"
        onChange={(event) => onChange({ displayName: event.target.value })}
      />
      <div>
        <p className="text-xs font-bold text-slate-400">メールアドレス</p>
        <p className="mt-1.5 text-sm font-medium text-slate-800">{formatMyPageText(email)}</p>
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400">所属クリニック</p>
        <p className="mt-1.5 text-sm font-medium text-slate-800">
          {formatMyPageClinicLabel(clinicReady, clinicName)}
        </p>
      </div>
    </div>
  )
}
