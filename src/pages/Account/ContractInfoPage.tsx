import { useRef, type ChangeEvent } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { APP_DISPLAY_NAME } from '@/config/appName'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { ClinicAccessPlaceholder } from '@/features/clinic/ClinicAccessPlaceholder'
import { useClinic } from '@/features/clinic/useClinic'
import { useContractDocument } from '@/pages/Account/hooks/useContractDocument'
import { usePlatformAdmin } from '@/pages/Account/hooks/usePlatformAdmin'

export function ContractInfoPage() {
  const { clinic, clinicReady } = useClinic()
  const { isPlatformAdmin, loading: adminLoading } = usePlatformAdmin()
  const { document, signedUrl, loading, error, uploading, uploadPdf } = useContractDocument(
    clinic?.id,
  )
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const result = await uploadPdf(file)
    if (result.ok) {
      toast.success('締結PDFを登録しました。')
    } else {
      toast.error(result.message)
    }
  }

  return (
    <DashboardLayout title="契約情報" description="締結書類の確認">
      <section className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm md:p-8">
          {!clinicReady ? (
            <ClinicAccessPlaceholder />
          ) : !clinic ? (
            <p className="text-sm font-medium text-slate-500">
              クリニックを選択すると契約情報を表示します。
            </p>
          ) : loading || adminLoading ? (
            <p className="text-sm font-medium text-slate-500">契約情報を準備しています…</p>
          ) : error ? (
            <p className="text-sm font-medium text-rose-600">{error}</p>
          ) : document && signedUrl ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-400">締結PDF</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{document.file_name}</p>
                  <p className="mt-1 text-xs font-medium text-slate-400">
                    登録日{' '}
                    {new Date(document.uploaded_at).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <a
                  href={signedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  PDFを開く
                </a>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                <iframe
                  title="締結PDFプレビュー"
                  src={signedUrl}
                  className="h-[70vh] w-full bg-white"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
              <p className="text-sm font-bold text-slate-700">
                締結書類はまだ登録されていません
              </p>
              <p className="mt-2 text-xs font-medium text-slate-400">
                {APP_DISPLAY_NAME}運営が締結PDFを登録すると、こちらに表示されます。
              </p>
            </div>
          )}

          {isPlatformAdmin ? (
            <div className="mt-8 space-y-3 border-t border-slate-100 pt-6">
              <p className="text-sm font-bold text-slate-800">運営：締結PDFのアップロード</p>
              <p className="text-xs font-medium text-slate-400">
                PDFのみ（最大10MB）。新しいファイルを登録すると、以前の書類は非表示になります。
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                onChange={(event) => {
                  void handleFileChange(event)
                }}
              />
              <Button
                variant="primary"
                loading={uploading}
                disabled={!clinic || uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                PDFをアップロード
              </Button>
            </div>
          ) : null}
        </div>
      </section>
    </DashboardLayout>
  )
}
