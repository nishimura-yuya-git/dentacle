import { patientIconSrc, type PatientIconId } from '@/pages/Patients/patientIconPolicy'

type Props = {
  iconId: PatientIconId
  name: string
  size?: 'sm' | 'md'
}

const SIZE_CLASS = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
} as const

/** 患者一覧・電話確認・選択用の丸アイコン */
export function PatientIcon({ iconId, name, size = 'sm' }: Props) {
  return (
    <img
      src={patientIconSrc(iconId)}
      alt={`${name}のアイコン`}
      className={`${SIZE_CLASS[size]} shrink-0 rounded-full object-cover`}
    />
  )
}
