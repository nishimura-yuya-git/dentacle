import {
  formatPlatformAdminDate,
  formatPlatformAdminEmptyCopy,
  formatPlatformAdminName,
  formatPlatformAdminNote,
  PLATFORM_ADMIN_TABLE_COLUMNS,
} from '@/pages/Admins/formatPlatformAdmin'
import { canEditPlatformAdmin, canRevokePlatformAdmin } from '@/pages/Admins/platformAdminPolicy'
import type { PlatformAdminView } from '@/pages/Admins/platformAdminTypes'

const TH =
  'whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-xs font-bold text-slate-600'
const TD = 'border-b border-slate-100 px-3 py-3 align-middle text-sm text-slate-700'
const ACTION_BUTTON =
  'inline-flex items-center rounded-lg px-2 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:text-slate-300'

export function AdminList({
  items,
  loading,
  selfUserId,
  busyId,
  onEdit,
  onRevoke,
}: {
  items: PlatformAdminView[]
  loading: boolean
  selfUserId: string | null
  busyId: string | null
  onEdit: (userId: string) => void
  onRevoke: (userId: string) => void
}) {
  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <p className="text-sm text-slate-400">運営を読み込んでいます…</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-4">
        <p className="text-center text-sm font-medium leading-relaxed text-slate-400">
          {formatPlatformAdminEmptyCopy()}
        </p>
      </div>
    )
  }

  return (
    <table className="min-w-[880px] w-full border-separate border-spacing-0 text-left text-sm">
      <thead className="sticky top-0 z-10 shadow-sm">
        <tr>
          {PLATFORM_ADMIN_TABLE_COLUMNS.map((column) => (
            <th key={column} className={TH}>
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => {
          const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'
          const canEdit = canEditPlatformAdmin()
          const canRevoke = canRevokePlatformAdmin({
            targetUserId: item.userId,
            selfUserId,
            adminCount: items.length,
          })
          const isSelf = item.userId === selfUserId
          return (
            <tr key={item.userId} className={`${rowBg} hover:bg-emerald-50/40`}>
              <td className={`${TD} font-bold text-slate-800`}>
                {formatPlatformAdminName(item)}
                {isSelf ? (
                  <span className="ml-2 text-xs font-medium text-slate-400">自分</span>
                ) : null}
              </td>
              <td className={`${TD} text-slate-500`}>{item.email ?? '—'}</td>
              <td className={`${TD} max-w-[220px] truncate text-slate-500`} title={item.note ?? undefined}>
                {formatPlatformAdminNote(item.note)}
              </td>
              <td className={`${TD} whitespace-nowrap text-slate-500`}>
                <time dateTime={item.createdAt}>{formatPlatformAdminDate(item.createdAt)}</time>
              </td>
              <td className={TD}>
                <div className="flex flex-wrap items-center gap-1">
                  {canEdit ? (
                    <button
                      type="button"
                      className={`${ACTION_BUTTON} text-slate-600 hover:bg-slate-100`}
                      disabled={busyId != null}
                      onClick={() => onEdit(item.userId)}
                    >
                      編集
                    </button>
                  ) : null}
                  {canRevoke ? (
                    <button
                      type="button"
                      className={`${ACTION_BUTTON} text-rose-600 hover:bg-rose-50`}
                      disabled={busyId != null}
                      onClick={() => onRevoke(item.userId)}
                    >
                      削除
                    </button>
                  ) : (
                    <span className="px-2 text-xs font-medium text-slate-400">
                      {isSelf ? '自分は削除できません' : '最後の1人は削除できません'}
                    </span>
                  )}
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
