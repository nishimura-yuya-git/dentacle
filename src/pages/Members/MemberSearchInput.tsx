import { SearchIcon } from '@/pages/Members/MemberIcons'

type Props = {
  value: string
  onChange: (value: string) => void
}

/** ヘッダー用のコンパクト検索（タイトル右隣） */
export function MemberSearchInput({ value, onChange }: Props) {
  return (
    <label className="block w-[200px] max-w-full sm:w-[220px]">
      <span className="sr-only">名前・メールで検索</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 scale-90 text-slate-400">
          <SearchIcon />
        </span>
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="名前・メールで検索"
          className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-2.5 text-xs text-slate-900 outline-none transition focus:border-[#008C01] focus:ring-2 focus:ring-[#008C01]/20"
        />
      </div>
    </label>
  )
}
