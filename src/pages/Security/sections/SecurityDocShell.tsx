import type { ReactNode } from 'react'

/**
 * Nani 安全性ページの面: 薄いグラデキャンバス + 白の大判パネル。
 * 色はデンタクル（緑系）。Nani の青は使わない。
 */
export function SecurityDocShell({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-4 -my-4 min-h-[calc(100dvh-52px)] bg-[linear-gradient(-15deg,#F8FBF8,#F0F9F0,#E7F4E8_85%)] px-4 py-10 md:-mx-5 md:-my-5 md:px-6 md:py-12">
      <div className="mx-auto w-full max-w-3xl rounded-[32px] bg-white p-5 leading-[1.7] text-[16px] text-slate-900 shadow-sm sm:p-7 md:p-8">
        {children}
      </div>
    </div>
  )
}
