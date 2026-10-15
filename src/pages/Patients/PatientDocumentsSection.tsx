import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { PatientPdfDropZone } from '@/pages/Patients/PatientPdfDropZone'
import {
  createPatientDocumentUrl,
  deletePatientDocument,
  listPatientDocuments,
  uploadPatientPdf,
  type PatientDocumentItem,
} from '@/pages/Patients/patientDocumentApi'
import {
  formatDocumentBytes,
  partitionPatientPdfs,
} from '@/pages/Patients/patientDocumentPolicy'

type Props = {
  clinicId: string
  patientId: string
  canWrite: boolean
}

function formatUploadedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** 患者編集画面の書類。追加と削除はその場で保存する。 */
export function PatientDocumentsSection({ clinicId, patientId, canWrite }: Props) {
  const toast = useToast()
  const [documents, setDocuments] = useState<PatientDocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const result = await listPatientDocuments(clinicId, patientId)
    setLoading(false)
    if (!result.ok) {
      setError(result.message)
      setDocuments([])
      return
    }
    setError(null)
    setDocuments(result.documents)
  }, [clinicId, patientId])

  useEffect(() => {
    void load()
  }, [load])

  async function handleFiles(incoming: File[]) {
    const reviewed = await partitionPatientPdfs({
      existingCount: documents.length,
      incoming,
    })
    if (reviewed.message) toast.error(reviewed.message)
    if (reviewed.accepted.length === 0) return

    setBusy(true)
    let existingCount = documents.length
    const failures: string[] = []
    for (const file of reviewed.accepted) {
      const result = await uploadPatientPdf({
        clinicId,
        patientId,
        file,
        existingCount,
      })
      if (!result.ok) {
        failures.push(`${file.name}: ${result.message}`)
        continue
      }
      existingCount += 1
    }
    setBusy(false)
    if (failures.length > 0) {
      toast.error(failures.join(' '))
    } else {
      toast.success('PDFを追加しました')
    }
    await load()
  }

  async function handleOpen(document: PatientDocumentItem) {
    const result = await createPatientDocumentUrl(clinicId, document.storagePath)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    window.open(result.url, '_blank', 'noopener,noreferrer')
  }

  async function handleDelete(document: PatientDocumentItem) {
    setBusy(true)
    const result = await deletePatientDocument({ clinicId, document })
    setBusy(false)
    setConfirmId(null)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success('書類を削除しました')
    await load()
  }

  return (
    <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm md:p-8">
      <div>
        <h2 className="text-sm font-bold text-slate-900">書類</h2>
        <p className="mt-1 text-xs font-medium text-slate-400">
          紹介状や同意書などのPDFです。追加したファイルはすぐに保存されます。
        </p>
      </div>

      {loading ? (
        <p className="mt-5 text-sm font-medium text-slate-400">書類を読み込んでいます…</p>
      ) : error ? (
        <p className="mt-5 text-sm font-medium text-rose-600">{error}</p>
      ) : documents.length === 0 ? (
        <p className="mt-5 text-sm font-medium text-slate-400">
          {canWrite
            ? '書類はまだありません。下からPDFを追加できます。'
            : '書類はまだ登録されていません。'}
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-slate-100">
          {documents.map((document) => {
            const uploadedLabel = formatUploadedAt(document.uploadedAt)
            return (
            <li key={document.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">{document.fileName}</p>
                <p className="mt-1 text-xs font-medium text-slate-400">
                  {formatDocumentBytes(document.byteSize)}
                  {uploadedLabel ? ` · ${uploadedLabel}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => void handleOpen(document)}>
                  開く
                </Button>
                {canWrite && confirmId === document.id ? (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded-xl px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                      onClick={() => void handleDelete(document)}
                    >
                      削除する
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded-xl px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-50"
                      onClick={() => setConfirmId(null)}
                    >
                      やめる
                    </button>
                  </>
                ) : null}
                {canWrite && confirmId !== document.id ? (
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-xl px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                    onClick={() => setConfirmId(document.id)}
                  >
                    削除
                  </button>
                ) : null}
              </div>
            </li>
            )
          })}
        </ul>
      )}

      {canWrite ? (
        <div className="mt-6">
          <PatientPdfDropZone
            disabled={loading || Boolean(error)}
            busy={busy}
            onFiles={(files) => void handleFiles(files)}
          />
        </div>
      ) : null}
    </section>
  )
}
