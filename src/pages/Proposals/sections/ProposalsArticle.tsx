import type { ReactNode } from 'react'

/**
 * 見出し帯の直下からメイン列いっぱいに広げる。
 * 角丸カード・外枠・影は置かない（浮いた面にしない）。
 */
export function ProposalsArticle({ children }: { children: ReactNode }) {
  return (
    <article className="-mx-3 -my-2 flex min-h-0 flex-1 flex-col overflow-auto bg-white px-5 py-5 font-normal leading-[1.7] text-[16px] text-slate-900 md:-mx-4 md:-my-3 md:px-8 md:py-6">
      {children}
    </article>
  )
}

export function ProposalsSectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-1 mt-8 border-b border-slate-200 pb-1.5 text-lg font-bold text-slate-900">
      {children}
    </h2>
  )
}
