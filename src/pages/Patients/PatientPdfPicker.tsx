import { useState } from 'react'
import { PatientPdfDropZone } from '@/pages/Patients/PatientPdfDropZone'
import {
  formatDocumentBytes,
  partitionPatientPdfs,
} from '@/pages/Patients/patientDocumentPolicy'

type Props = {
  files: File[]
  disabled?: boolean
  onChange: (files: File[]) => void
  onReject: (message: string) => void
}

/** 新規患者登録で、まだ患者IDがないPDFを預かる。 */
export function PatientPdfPicker({ files, disabled = false, onChange, onReject }: Props) {
  const [checking, setChecking] = useState(false)

  async function handleFiles(incoming: File[]) {
    setChecking(true)
    const result = await partitionPatientPdfs({
      existingCount: files.length,
      incoming,
    })
    setChecking(false)
    if (result.accepted.length > 0) {
      onChange([...files, ...result.accepted])
    }
    if (result.message) onReject(result.message)
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-bold text-slate-800">書類（PDF）</p>
        <p className="mt-1 text-xs font-medium text-slate-400">
          任意です。紹介状や同意書などを、登録と同時に保存します。
        </p>
      </div>
      <PatientPdfDropZone disabled={disabled} busy={checking} onFiles={(next) => void handleFiles(next)} />
      {files.length > 0 ? (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-100">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${file.lastModified}-${index}`} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">{file.name}</p>
                <p className="mt-0.5 text-xs font-medium text-slate-400">
                  {formatDocumentBytes(file.size)}
                </p>
              </div>
              <button
                type="button"
                disabled={disabled}
                className="shrink-0 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                onClick={() => onChange(files.filter((_, itemIndex) => itemIndex !== index))}
              >
                外す
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
