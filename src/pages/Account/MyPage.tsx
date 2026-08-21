import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/features/auth/useAuth'
import { useClinic } from '@/features/clinic/useClinic'
import { MyPageFields } from '@/pages/Account/components/MyPageFields'
import { MyPageForm } from '@/pages/Account/components/MyPageForm'
import { profileToDraft } from '@/pages/Account/hooks/myProfilePolicy'
import { useMyProfile } from '@/pages/Account/hooks/useMyProfile'

export function MyPage() {
  const { user } = useAuth()
  const { clinic, clinicReady } = useClinic()
  const { profile, loading, saving, error, saveProfile } = useMyProfile(user?.id)
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(() => profileToDraft(null))
  const [fieldError, setFieldError] = useState<string | null>(null)

  useEffect(() => {
    if (!editing) {
      setDraft(profileToDraft(profile?.display_name))
      setFieldError(null)
    }
  }, [profile, editing])

  async function handleSave() {
    if (saving) return
    const result = await saveProfile(draft)
    if (result.ok) {
      toast.success('表示名を保存しました。')
      setFieldError(null)
      setEditing(false)
      return
    }
    if (result.field === 'displayName') {
      setFieldError(result.message)
      return
    }
    toast.error(result.message)
  }

  function handleCancel() {
    setDraft(profileToDraft(profile?.display_name))
    setFieldError(null)
    setEditing(false)
  }

  const canEdit = Boolean(user) && !loading && !error

  return (
    <DashboardLayout
      title="マイページ"
      description="アカウント情報"
      actions={
        canEdit ? (
          editing ? (
            <div className="flex flex-nowrap items-center gap-2">
              <Button variant="secondary" disabled={saving} onClick={handleCancel}>
                キャンセル
              </Button>
              <Button
                type="submit"
                form="my-page-form"
                variant="primary"
                loading={saving}
              >
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
      <section className="max-w-xl rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm md:p-8">
        {loading ? (
          <p className="text-sm font-medium text-slate-500">アカウント情報を読み込んでいます…</p>
        ) : (
          <>
            {error ? (
              <p className="mb-5 text-sm font-medium text-rose-600">{error}</p>
            ) : null}
            {editing ? (
              <form
                id="my-page-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  void handleSave()
                }}
              >
                <MyPageForm
                  value={draft}
                  email={user?.email}
                  clinicReady={clinicReady}
                  clinicName={clinic?.name}
                  disabled={saving}
                  error={fieldError ?? undefined}
                  onChange={(next) => {
                    setDraft(next)
                    setFieldError(null)
                  }}
                />
              </form>
            ) : (
              <MyPageFields
                displayName={profile?.display_name}
                email={user?.email}
                clinicReady={clinicReady}
                clinicName={clinic?.name}
              />
            )}
          </>
        )}

        {loading ? null : (
          <p className="mt-8 text-xs font-medium leading-relaxed text-slate-400">
            表示名だけ変更できます。メールアドレスと所属クリニックは、この画面では変更できません。
          </p>
        )}
      </section>
    </DashboardLayout>
  )
}
