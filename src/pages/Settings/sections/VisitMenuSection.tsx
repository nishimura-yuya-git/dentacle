import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { VisitMenuDeleteConfirm } from '@/pages/Settings/sections/VisitMenuDeleteConfirm'
import { VisitMenuEditModal } from '@/pages/Settings/sections/VisitMenuEditModal'
import type { useVisitMenuSettings } from '@/pages/Settings/hooks/useVisitMenuSettings'

type Props = {
  menus: ReturnType<typeof useVisitMenuSettings>
}

/** 院ごとに使う診療メニューの登録・編集・削除・ON/OFF */
export function VisitMenuSection({ menus }: Props) {
  const onCount = menus.items.filter((item) => item.isEnabled).length

  return (
    <section aria-label="メニュー" className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-medium text-slate-400">
          使う処置だけ ON にします。OFF は予約の選択肢から外れます。過去の訪問に書いた名称は残ります
          {!menus.canEdit ? '（変更できる権限がありません）' : ''}
        </p>
        <p className="text-xs font-bold text-slate-400">
          {menus.saving ? '保存中…' : menus.loading ? '読込中…' : `ON ${onCount} / ${menus.items.length}`}
        </p>
      </div>

      <div className="mt-6 min-h-0 flex-1 overflow-auto">
        {menus.items.length === 0 && !menus.loading ? (
          <p className="py-8 text-center text-sm text-slate-400">
            メニューがありません。下のフォームから追加してください
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {menus.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800">{item.name}</p>
                  <p className="mt-0.5 text-xs font-medium text-slate-400">
                    {item.durationMinutes}分
                  </p>
                </div>
                {menus.canEdit ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      className="!px-3 !py-2 !text-xs"
                      disabled={menus.saving}
                      onClick={() => menus.openEdit(item)}
                    >
                      編集
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="!px-3 !py-2 !text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      disabled={menus.saving}
                      onClick={() => menus.openDelete(item)}
                    >
                      削除
                    </Button>
                  </div>
                ) : null}
                <Switch
                  checked={item.isEnabled}
                  disabled={!menus.canEdit || menus.saving}
                  onChange={(next) => void menus.handleToggle(item, next)}
                  aria-label={`${item.name}を${item.isEnabled ? 'OFF' : 'ON'}にする`}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {menus.canEdit ? (
        <form
          onSubmit={(event) => void menus.handleAdd(event)}
          className="mt-4 shrink-0 border-t border-slate-100 pt-4 pr-20"
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_7rem_auto]">
            <Input
              label="名称"
              value={menus.newName}
              onChange={(event) => menus.setNewName(event.target.value)}
              error={menus.addNameError || undefined}
              className="!px-3 !py-2"
            />
            <Input
              label="所要（分）"
              inputMode="numeric"
              value={menus.newDuration}
              onChange={(event) => menus.setNewDuration(event.target.value)}
              error={menus.addDurationError || undefined}
              className="!px-3 !py-2"
            />
            <div className="flex items-end">
              <Button type="submit" className="w-full !px-4 !py-2 !text-sm sm:w-auto" disabled={menus.saving}>
                追加
              </Button>
            </div>
          </div>
        </form>
      ) : null}

      <VisitMenuEditModal
        target={menus.editTarget}
        name={menus.editName}
        duration={menus.editDuration}
        nameError={menus.editNameError}
        durationError={menus.editDurationError}
        busy={menus.saving}
        onClose={menus.closeEdit}
        onChangeName={menus.setEditName}
        onChangeDuration={menus.setEditDuration}
        onSubmit={() => void menus.handleEdit()}
      />
      <VisitMenuDeleteConfirm
        target={menus.deleteTarget}
        busy={menus.saving}
        onClose={menus.closeDelete}
        onConfirm={() => void menus.handleDelete()}
      />
    </section>
  )
}
