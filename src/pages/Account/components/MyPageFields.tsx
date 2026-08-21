import {
  formatMyPageClinicLabel,
  formatMyPageText,
} from '@/pages/Account/hooks/myProfilePolicy'

type Props = {
  displayName: string | null | undefined
  email: string | null | undefined
  clinicReady: boolean
  clinicName: string | null | undefined
}

/** マイページの読み取り専用項目 */
export function MyPageFields({ displayName, email, clinicReady, clinicName }: Props) {
  return (
    <dl className="space-y-5">
      <div>
        <dt className="text-xs font-bold text-slate-400">表示名</dt>
        <dd className="mt-1.5 text-sm font-medium text-slate-800">
          {formatMyPageText(displayName)}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-bold text-slate-400">メールアドレス</dt>
        <dd className="mt-1.5 text-sm font-medium text-slate-800">{formatMyPageText(email)}</dd>
      </div>
      <div>
        <dt className="text-xs font-bold text-slate-400">所属クリニック</dt>
        <dd className="mt-1.5 text-sm font-medium text-slate-800">
          {formatMyPageClinicLabel(clinicReady, clinicName)}
        </dd>
      </div>
    </dl>
  )
}
