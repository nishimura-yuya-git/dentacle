const STEPS = [
  { id: 1, title: '条件設定' },
  { id: 2, title: '提案生成' },
  { id: 3, title: '内容確認' },
  { id: 4, title: '採用' },
] as const

type Props = {
  /** 1〜4 */
  activeStep: number
}

/** 条件設定パネル内のコンパクトな進捗表示 */
export function ProposalStepper({ activeStep }: Props) {
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {STEPS.map((step, index) => {
        const active = activeStep === step.id
        const done = activeStep > step.id
        return (
          <li key={step.id} className="flex items-center gap-2">
            <span
              className={[
                'inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[11px] font-black',
                done || active
                  ? 'bg-[#008C01] text-white'
                  : 'border border-slate-200 bg-slate-50 text-slate-400',
              ].join(' ')}
            >
              {done ? '✓' : step.id}
            </span>
            <span
              className={[
                'text-xs font-bold',
                active || done ? 'text-slate-800' : 'text-slate-400',
              ].join(' ')}
            >
              {step.title}
            </span>
            {index < STEPS.length - 1 ? (
              <span className="mx-1 hidden h-px w-4 bg-slate-200 sm:block" aria-hidden />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
