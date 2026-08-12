import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { CloseIcon } from '@/pages/Members/MemberIcons'
import { CLINIC_ROLES, roleLabel } from '@/utils/roleLabels'
import type { Clinic } from '@/features/clinic/clinicContext'

type Props = {
  open: boolean
  busy: boolean
  clinics: Clinic[]
  clinicId: string
  email: string
  role: string
  onClose: () => void
  onClinicIdChange: (value: string) => void
  onEmailChange: (value: string) => void
  onRoleChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
}

const EXIT_MS = 280

/** 右からスライドインする招待ドロワー */
export function MemberInviteDrawer({
  open,
  busy,
  clinics,
  clinicId,
  email,
  role,
  onClose,
  onClinicIdChange,
  onEmailChange,
  onRoleChange,
  onSubmit,
}: Props) {
  const [mounted, setMounted] = useState(open)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduceMotion) {
        setEntered(true)
        return
      }
      const frame = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setEntered(true))
      })
      return () => window.cancelAnimationFrame(frame)
    }

    setEntered(false)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      setMounted(false)
      return
    }
    const timer = window.setTimeout(() => setMounted(false), EXIT_MS)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!mounted) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [mounted, onClose])

  if (!mounted) return null

  const inviteRoles = CLINIC_ROLES.filter((item) => item !== 'owner')

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className={[
          'absolute inset-0 bg-slate-900/30 transition-opacity ease-out motion-reduce:transition-none',
          entered ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        style={{ transitionDuration: `${EXIT_MS}ms` }}
        aria-label="閉じる"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="メンバーを招待"
        className={[
          'relative z-10 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl',
          'transition-transform ease-out motion-reduce:transition-none',
          entered ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
        style={{ transitionDuration: `${EXIT_MS}ms` }}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <h2 className="text-base font-bold text-slate-900">メンバーを招待</h2>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="閉じる"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
            <Input
              label="メールアドレス"
              type="email"
              placeholder="メールアドレスを入力"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              required
            />
            <Select
              label="役割"
              value={role}
              onChange={(e) => onRoleChange(e.target.value)}
              options={inviteRoles.map((item) => ({
                value: item,
                label: roleLabel(item),
              }))}
            />
            <Select
              label="所属"
              value={clinicId}
              onChange={(e) => onClinicIdChange(e.target.value)}
              options={clinics.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
            />
            <p className="text-xs font-medium leading-relaxed text-slate-400">
              既にアカウントがあるユーザーを所属に追加します。未登録の場合は先にアカウント作成が必要です。
            </p>
          </div>

          <div className="flex gap-3 border-t border-slate-100 px-6 py-5">
            <Button type="submit" className="flex-1" loading={busy}>
              招待を送信
            </Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              キャンセル
            </Button>
          </div>
        </form>
      </aside>
    </div>,
    document.body
  )
}
