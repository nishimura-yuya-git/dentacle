type Props = {
  id: string
  value: string
  onChange: (value: string) => void
}

/** 患者一覧・電話確認のコンパクト検索。見出し右の操作の左に置く。 */
export function NameChartSearchInput({ id, value, onChange }: Props) {
  return (
    <label className="block w-[200px] max-w-full sm:w-[220px]">
      <span className="sr-only">氏名・カルテで検索</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">
          <SearchGlyph />
        </span>
        <input
          id={id}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="氏名・カルテで検索"
          className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-8 pr-3 text-sm font-medium leading-5 text-slate-900 outline-none transition focus:border-[#008C01] focus:ring-4 focus:ring-[#008C01]/20"
        />
      </div>
    </label>
  )
}

function SearchGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
