import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { ClinicAccessPlaceholder } from '@/features/clinic/ClinicAccessPlaceholder'
import { useClinic } from '@/features/clinic/useClinic'
import { ContractorInfoFields } from '@/pages/Account/components/ContractorInfoFields'
import { ContractorInfoForm } from '@/pages/Account/components/ContractorInfoForm'
import {
  profileToDraft,
  useContractorProfile,
  type ContractorProfileDraft,
} from '@/pages/Account/hooks/useContractorProfile'
import { usePlatformAdmin } from '@/pages/Account/hooks/usePlatformAdmin'

export function ContractorInfoPage() {
  const { clinic, clinicReady } = useClinic()
  const { isPlatformAdmin, loading: adminLoading } = usePlatformAdmin()
  const { profile, loading, saving, error, saveProfile } = useContractorProfile(clinic?.id)
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ContractorProfileDraft>(() => profileToDraft(null))

  useEffect(() => {
    if (!editing) {
      setDraft(profileToDraft(profile))
    }
  }, [profile, editing])

  useEffect(() => {
    setEditing(false)
  }, [clinic?.id])

  async function handleSave() {
    const result = await saveProfile(draft)
    if (result.ok) {
      toast.success('契約者情報を保存しました。')
      setEditing(false)
      return
    }
    toast.error(result.message)
  }

  function handleCancel() {
    setDraft(profileToDraft(profile))
    setEditing(false)
  }

  const busy = loading || adminLoading

  return (
    <DashboardLayout
      title="契約者情報"
      description="契約者の基本情報"
      actions={
        isPlatformAdmin && clinic && !busy && !error ? (
          editing ? (
            <div className="flex flex-nowrap items-center gap-2">
              <Button variant="secondary" disabled={saving} onClick={handleCancel}>
                キャンセル
              </Button>
              <Button variant="primary" loading={saving} onClick={() => void handleSave()}>
                保存する
              </Button>
            </div>
          ) : (
            <Button variant="primary" onClick={() => setEditing(true)}>
              編集する
            </Button>
          )
        ) : null
      }
    >
      <section className="max-w-3xl rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm md:p-8">
        {!clinicReady ? (
          <ClinicAccessPlaceholder />
        ) : !clinic ? (
          <p className="text-sm font-medium text-slate-500">
            クリニックを選択すると契約者情報を表示します。
          </p>
        ) : busy ? (
          <p className="text-sm font-medium text-slate-500">契約者情報を読み込んでいます…</p>
        ) : error ? (
          <p className="text-sm font-medium text-rose-600">{error}</p>
        ) : (
          <>
            {editing ? (
              <ContractorInfoForm value={draft} onChange={setDraft} disabled={saving} />
            ) : (
              <ContractorInfoFields profile={profile} />
            )}

            {isPlatformAdmin ? (
              <p className="mt-8 text-xs font-medium leading-relaxed text-slate-400">
                運営アカウントのみ契約者情報を登録・変更できます。ログイン用メールアドレスは認証アカウントと自動同期しません。
              </p>
            ) : (
              <p className="mt-8 text-xs font-medium leading-relaxed text-slate-400">
                契約者情報の登録・変更はデンタクル運営が行います。内容に誤りがある場合は運営へご連絡ください。
              </p>
            )}
          </>
        )}
      </section>
    </DashboardLayout>
  )
}
