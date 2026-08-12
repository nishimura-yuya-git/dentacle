type ExportPatient = {
  name_kanji: string
  name_kana: string | null
  chart_number: string | null
  area_label: string | null
  address: string | null
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/** 患者一覧をCSV文字列にする（表示中の絞り込み結果を想定） */
export function buildPatientsCsv(patients: ExportPatient[]): string {
  const header = ['氏名', 'フリガナ', 'カルテ番号', 'エリア', '住所']
  const lines = patients.map((patient) =>
    [
      patient.name_kanji,
      patient.name_kana ?? '',
      patient.chart_number ?? '',
      patient.area_label ?? '',
      patient.address ?? '',
    ]
      .map((cell) => escapeCsvCell(cell))
      .join(','),
  )
  return [`\uFEFF${header.join(',')}`, ...lines].join('\n')
}

export function downloadPatientsCsv(patients: ExportPatient[], fileName: string) {
  const csv = buildPatientsCsv(patients)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}
