import { PatientIcon } from '@/pages/Patients/PatientIcon'
import { PATIENT_ICON_IDS, type PatientIconId } from '@/pages/Patients/patientIconPolicy'

type Props = {
  value: PatientIconId
  disabled?: boolean
  onChange: (next: PatientIconId) => void
  className?: string
}

/** 基本情報・新規登録で患者アイコンを選ぶ */
export function PatientIconPicker({
  value,
  disabled,
  onChange,
  className = 'md:col-span-2',
}: Props) {
  return (
    <fieldset className={className} disabled={disabled}>
      <legend className="mb-2 text-sm font-bold text-slate-800">患者アイコン</legend>
      <div className="flex flex-wrap gap-2">
        {PATIENT_ICON_IDS.map((id) => {
          const selected = id === value
          return (
            <button
              key={id}
              type="button"
              aria-pressed={selected}
              aria-label={`アイコン${id}`}
              className={[
                'rounded-full p-0.5 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#008C01]/30',
                selected ? 'ring-2 ring-[#008C01] ring-offset-2' : 'hover:bg-slate-50',
              ].join(' ')}
              onClick={() => onChange(id)}
            >
              <PatientIcon iconId={id} name={`候補${id}`} size="md" />
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
