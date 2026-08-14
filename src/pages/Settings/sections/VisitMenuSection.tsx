import { PreferenceRow } from '@/components/ui/PreferenceRow'
import { VISIT_MENU_CATALOG } from '@/utils/visitMenus/visitMenuCatalog'
import { isVisitMenuEnabled } from '@/utils/visitMenus/visitMenuState'

type Props = {
  enabled: Record<string, boolean>
  canEdit: boolean
  saving: boolean
  onToggle: (code: string, next: boolean) => void
}

/** 院ごとに使う診療メニューを ON/OFF する */
export function VisitMenuSection({ enabled, canEdit, saving, onToggle }: Props) {
  const onCount = VISIT_MENU_CATALOG.filter((item) =>
    isVisitMenuEnabled(enabled, item.code),
  ).length

  return (
    <section aria-label="メニュー" className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-medium text-slate-400">
          使う処置だけ ON にします。OFF は予約の選択肢から外れます。過去の訪問に書いた名称は残ります
          {!canEdit ? '（変更できる権限がありません）' : ''}
        </p>
        <p className="text-xs font-bold text-slate-400">
          {saving ? '保存中…' : `ON ${onCount} / ${VISIT_MENU_CATALOG.length}`}
        </p>
      </div>

      <div className="mt-6 min-h-0 flex-1 overflow-auto">
        <ul className="divide-y divide-slate-100">
          {VISIT_MENU_CATALOG.map((item) => (
            <li key={item.code} className="py-3 first:pt-0 last:pb-0">
              <PreferenceRow
                label={item.name}
                description={`${item.durationMinutes}分`}
                checked={isVisitMenuEnabled(enabled, item.code)}
                disabled={!canEdit || saving}
                onChange={(next) => onToggle(item.code, next)}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
