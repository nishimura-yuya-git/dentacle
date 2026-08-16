import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/features/auth/useAuth'
import { writeOperationTrace } from '@/features/calendar/writeOperationTrace'
import { ClinicAccessPlaceholder } from '@/features/clinic/ClinicAccessPlaceholder'
import { useClinic } from '@/features/clinic/useClinic'
import {
  importNormalizedPatients,
  type ImportProgressStep,
} from '@/features/patientImport/importPatientCsv'
import { normalizePatientCsvRows } from '@/features/patientImport/normalizePatientCsv'
import { parsePatientCsv } from '@/features/patientImport/parsePatientCsv'
import {
  RECECON_IMPORT_ACTION,
  RECECON_IMPORT_ENTITY,
  RECECON_IMPORT_PAGE_AUDIT_NOTE,
  buildRececonImportAuditPayload,
  formatRececonImportAllowedColumnsLabel,
} from '@/features/patientImport/receconImportPolicy'
import {
  ImportProgressModal,
  type ImportResultSummary,
} from '@/pages/Import/ImportProgressModal'

/** UTF-8 失敗時に Shift_JIS を試す（レセコン系エクスポート向け） */
async function readCsvText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer)
  if (utf8.includes('カルテ番号') && !utf8.includes('\uFFFD')) {
    return utf8
  }
  try {
    const sjis = new TextDecoder('shift-jis', { fatal: false }).decode(buffer)
    if (sjis.includes('カルテ番号')) return sjis
  } catch {
    // 環境が Shift_JIS 非対応の場合は UTF-8 結果を返す
  }
  return utf8
}

export function PatientImportPage() {
  const { clinic, canWriteOperations, clinicReady } = useClinic()
  const { user } = useAuth()
  const toast = useToast()
  const [fileName, setFileName] = useState<string | null>(null)
  const [rawText, setRawText] = useState('')
  const [defaultYear, setDefaultYear] = useState(String(new Date().getFullYear()))
  /** 空文字 = 全件 */
  const [limit, setLimit] = useState('')
  const [dragging, setDragging] = useState(false)
  const [progressOpen, setProgressOpen] = useState(false)
  const [activeStep, setActiveStep] = useState<ImportProgressStep>('準備')
  const [detail, setDetail] = useState('CSVを選択してください')
  const [result, setResult] = useState<ImportResultSummary | null>(null)
  const [running, setRunning] = useState(false)

  const preview = useMemo(() => {
    if (!rawText) return null
    try {
      const parsed = parsePatientCsv(rawText)
      const limitNumber = limit.trim() === '' ? undefined : Math.max(1, Number(limit) || 1)
      const normalized = normalizePatientCsvRows(parsed.rows, {
        defaultYear: Number(defaultYear) || new Date().getFullYear(),
        limit: limitNumber,
      })
      return { parsed, normalized, parseError: null as string | null }
    } catch (err) {
      return {
        parsed: null,
        normalized: null,
        parseError: err instanceof Error ? err.message : '解析に失敗しました',
      }
    }
  }, [rawText, defaultYear, limit])

  useEffect(() => {
    const year = preview?.parsed?.detectedYear
    if (year == null) return
    setDefaultYear(String(year))
    // ファイル選択時のみ推定年を反映（手動変更後の上書き防止）
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fileName 変化時だけ
  }, [fileName])

  async function readFile(file: File) {
    setResult(null)
    setFileName(file.name)
    const text = await readCsvText(file)
    setRawText(text)
    setActiveStep('準備')
    setDetail('プレビューを確認してから取り込んでください')
    setProgressOpen(true)
  }

  async function handleImport() {
    if (!clinic || !preview?.normalized || !canWriteOperations) return
    setProgressOpen(true)
    setRunning(true)
    setResult(null)
    setActiveStep('準備')
    setDetail('取込を開始します')
    const parsedCount = preview.normalized.patients.length
    const recordAudit = (input: Parameters<typeof buildRececonImportAuditPayload>[0]) => {
      void writeOperationTrace({
        clinicId: clinic.id,
        userId: user?.id ?? null,
        action: RECECON_IMPORT_ACTION,
        entityType: RECECON_IMPORT_ENTITY,
        payload: buildRececonImportAuditPayload(input),
      })
    }
    try {
      const imported = await importNormalizedPatients({
        clinicId: clinic.id,
        staff: preview.normalized.staff,
        patients: preview.normalized.patients,
        onProgress: (step, nextDetail) => {
          setActiveStep(step)
          setDetail(nextDetail)
        },
      })
      setResult(imported)
      recordAudit({
        parsedCount,
        staffUpserted: imported.staffUpserted,
        patientsInserted: imported.patientsInserted,
        patientsUpdated: imported.patientsUpdated,
        conditionsUpserted: imported.conditionsUpserted,
        errorCount: imported.errors.length,
        outcome: imported.errors.length > 0 ? 'partial' : 'success',
      })
      if (imported.errors.length > 0) {
        toast.error(`一部エラーがあります（${imported.errors.length} 件）。先頭のみ表示します。`)
      } else {
        toast.success('患者CSVの取込が完了しました')
      }
    } catch (err) {
      recordAudit({
        parsedCount,
        staffUpserted: 0,
        patientsInserted: 0,
        patientsUpdated: 0,
        conditionsUpserted: 0,
        errorCount: 1,
        outcome: 'failed',
      })
      toast.error(err instanceof Error ? err.message : '取込に失敗しました')
      setDetail(err instanceof Error ? err.message : '取込に失敗しました')
    } finally {
      setRunning(false)
    }
  }

  if (!clinicReady) {
    return (
      <DashboardLayout title="患者CSV取込">
        <ClinicAccessPlaceholder />
      </DashboardLayout>
    )
  }

  if (!clinic) {
    return (
      <DashboardLayout title="患者CSV取込">
        <p className="text-sm text-slate-500">クリニックを選択または作成してください。</p>
      </DashboardLayout>
    )
  }

  const parsedCount = preview?.parsed?.rows.length ?? 0
  const importCount = preview?.normalized?.patients.length ?? 0

  return (
    <DashboardLayout
      title="患者CSV取込"
      description="レセコン個人別集計の種まき。取込完了＝導入完了ではありません"
      actions={
        canWriteOperations ? (
          <Button
            onClick={() => void handleImport()}
            loading={running}
            disabled={!preview?.normalized}
          >
            {importCount > 0 ? `${importCount} 件を取り込む` : '取り込みを開始'}
          </Button>
        ) : (
          <p className="text-xs font-medium text-slate-400">取込権限がありません</p>
        )
      }
    >
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-sm font-bold text-slate-900">対応形式</h2>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-slate-500">
            レセコンの「管理集計【個人別全集計データ】」CSV（例:{' '}
            <code className="text-slate-700">doc/患者データ.csv</code>
            ）を想定しています。Apotoolのエクスポートではありません。いま開いている経路はこのCSV取込です。レセコン接続は導入に備え、身元と安全条件を先に固定しています。
          </p>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-slate-500">
            登録する列: {formatRececonImportAllowedColumnsLabel()}
            。住所・頻度・可能曜日・NG
            は空のまま仮条件で入れ、あとから患者カルテで育てます。会計・点数列は無視します。
          </p>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-slate-500">
            {RECECON_IMPORT_PAGE_AUDIT_NOTE}{' '}
            <Link
              to="/security#rececon"
              className="font-bold text-[#008C01] underline decoration-dotted underline-offset-4"
            >
              安全性の説明を見る
            </Link>
          </p>
          <div className="mt-6 grid max-w-xl gap-4 sm:grid-cols-2">
            <Input
              label="最終日付の年（CSVに年が無いため）"
              type="number"
              value={defaultYear}
              onChange={(e) => setDefaultYear(e.target.value)}
            />
            <Input
              label="取込上限件数（空欄で全件）"
              type="number"
              min={1}
              value={limit}
              placeholder="全件"
              onChange={(e) => setLimit(e.target.value)}
            />
          </div>
          {preview?.parsed?.detectedYear != null ? (
            <p className="mt-3 text-xs font-medium text-slate-400">
              期間行から西暦 {preview.parsed.detectedYear}{' '}
              年を推定しました（必要なら上で変更できます）。
            </p>
          ) : null}
        </section>

        <button
          type="button"
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            const file = event.dataTransfer.files?.[0]
            if (file) void readFile(file)
          }}
          onClick={() => document.getElementById('patient-csv-input')?.click()}
          className={[
            'w-full max-w-xl rounded-2xl border-2 border-dashed px-6 py-8 text-center transition',
            dragging
              ? 'border-emerald-400 bg-emerald-50'
              : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40',
          ].join(' ')}
        >
          <p className="text-sm font-bold text-slate-700">
            {fileName ?? 'CSVをドロップ、またはクリックして選択'}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-400">
            UTF-8 / Shift_JIS 対応・レセコン個人別全集計形式
          </p>
          <input
            id="patient-csv-input"
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void readFile(file)
            }}
          />
        </button>

        {preview?.parseError ? (
          <div className="max-w-xl rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {preview.parseError}
          </div>
        ) : null}

        {preview?.normalized ? (
          <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-900">プレビュー（件数のみ）</h2>
              {canWriteOperations ? (
                <Button
                  variant="soft"
                  className="!px-3 !py-1.5 !text-xs"
                  onClick={() => setProgressOpen(true)}
                >
                  進捗を表示
                </Button>
              ) : null}
            </div>
            <div className="mt-4 grid max-w-xl gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 py-4 text-center text-sm font-bold text-slate-700">
                解析行 {parsedCount}
              </div>
              <div className="rounded-2xl bg-emerald-50 py-4 text-center text-sm font-bold text-emerald-700">
                取込予定患者 {importCount}
              </div>
              <div className="rounded-2xl bg-indigo-50 py-4 text-center text-sm font-bold text-indigo-700">
                担当者候補 {preview.normalized.staff.length}
              </div>
            </div>
            <ul className="mt-4 max-w-xl space-y-2">
              {preview.normalized.warnings.slice(0, 5).map((warning) => (
                <li key={warning} className="text-xs font-medium text-amber-700">
                  {warning}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <ImportProgressModal
        open={progressOpen}
        running={running}
        activeStep={activeStep}
        detail={detail}
        result={result}
        onClose={() => {
          if (running) return
          setProgressOpen(false)
        }}
      />
    </DashboardLayout>
  )
}
