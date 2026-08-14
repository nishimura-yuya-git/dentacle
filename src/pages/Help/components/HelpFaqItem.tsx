import { SecurityTextLink } from '@/pages/Security/sections/SecuritySectionBlock'
import type { HelpFaqItem as HelpFaqItemData } from '@/pages/Help/helpCopy'

type Props = {
  item: HelpFaqItemData
  open: boolean
  isFirst: boolean
  isLast: boolean
  onToggle: (id: string) => void
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 motion-reduce:transition-none ${
        open ? 'rotate-180' : ''
      }`}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 9.5 12 15.5 18 9.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** 1件の質問行。開くと回答を下に出す。 */
export function HelpFaqItem({ item, open, isFirst, isLast, onToggle }: Props) {
  const panelId = `${item.id}-answer`
  const radius = [isFirst ? 'rounded-t-[20px]' : '', isLast ? 'rounded-b-[20px]' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <div id={item.id} className={`${isFirst ? '' : 'border-t border-slate-100'} ${radius}`}>
      <button
        type="button"
        className={`flex w-full items-center justify-between gap-4 p-4 text-left text-sm font-bold leading-[1.4] text-slate-800 transition-colors hover:text-slate-950 ${radius}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onToggle(item.id)}
      >
        <span>{item.question}</span>
        <ChevronIcon open={open} />
      </button>
      {open ? (
        <div id={panelId} className="px-4 pb-4 text-sm leading-[1.7] text-slate-600">
          {item.paragraphs.map((paragraph) => (
            <p key={paragraph} className="mt-2.5 first:mt-0">
              {paragraph}
            </p>
          ))}
          {item.bullets?.length ? (
            <ul className="mt-2.5 list-disc space-y-1.5 pl-5">
              {item.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          ) : null}
          {item.links?.length ? (
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              {item.links.map((link) => (
                <SecurityTextLink key={link.href} {...link} />
              ))}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
