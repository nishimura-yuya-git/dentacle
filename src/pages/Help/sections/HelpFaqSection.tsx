import { HelpFaqItem } from '@/pages/Help/components/HelpFaqItem'
import type { HelpSection } from '@/pages/Help/helpCopy'

type Props = {
  section: HelpSection
  openIds: readonly string[]
  onToggle: (id: string) => void
}

/** 見出しは井戸の内側。左右のふちは白カードに対して細く保つ。 */
export function HelpFaqSection({ section, openIds, onToggle }: Props) {
  return (
    <section
      aria-labelledby={`${section.id}-heading`}
      className="rounded-[28px] bg-[#DCEFDD] px-1.5 pb-1.5 pt-4"
    >
      <h2
        id={`${section.id}-heading`}
        className="px-3.5 pb-3 text-sm font-semibold text-slate-500"
      >
        {section.title}
      </h2>
      <div className="overflow-hidden rounded-[20px] bg-white shadow-[0_2px_5px_-2px_rgba(0,20,40,0.08)]">
        {section.items.map((item, index) => (
          <HelpFaqItem
            key={item.id}
            item={item}
            open={openIds.includes(item.id)}
            isFirst={index === 0}
            isLast={index === section.items.length - 1}
            onToggle={onToggle}
          />
        ))}
      </div>
    </section>
  )
}
