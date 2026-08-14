import { Select } from '@/components/ui/Select'
import {
  visitMenuSelectOptions,
  type VisitMenuForm,
} from '@/utils/visitMenus/visitMenuState'

type Props = {
  value: VisitMenuForm
  enabled: Record<string, boolean>
  onChange: (next: VisitMenuForm) => void
}

/** メニュー1〜3とサブメニュー。時間はメニュー1だけ使う */
export function VisitMenuFields({ value, enabled, onChange }: Props) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Select
        label="メニュー1"
        value={value.menu_1}
        onChange={(event) => onChange({ ...value, menu_1: event.target.value })}
        options={visitMenuSelectOptions(enabled, value.menu_1)}
      />
      <Select
        label="メニュー2"
        value={value.menu_2}
        onChange={(event) => onChange({ ...value, menu_2: event.target.value })}
        options={visitMenuSelectOptions(enabled, value.menu_2)}
      />
      <Select
        label="メニュー3"
        value={value.menu_3}
        onChange={(event) => onChange({ ...value, menu_3: event.target.value })}
        options={visitMenuSelectOptions(enabled, value.menu_3)}
      />
      <Select
        label="サブメニュー"
        value={value.menu_sub}
        onChange={(event) => onChange({ ...value, menu_sub: event.target.value })}
        options={visitMenuSelectOptions(enabled, value.menu_sub)}
      />
    </div>
  )
}
