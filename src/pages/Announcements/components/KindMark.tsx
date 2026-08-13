import type { ProductUpdateKind } from '@/pages/Announcements/productUpdatePolicy'
import { formatProductUpdateKindLabel } from '@/pages/Announcements/formatProductUpdate'

/** 種類の目印。禁止アイコンライブラリは使わずインラインSVG。 */
export function KindMark({ kind }: { kind: ProductUpdateKind }) {
  const label = formatProductUpdateKindLabel(kind)
  return (
    <span className="flex h-7 w-7 items-center justify-center" title={label} aria-hidden="true">
      {kind === 'feature' ? <SparkleIcon /> : null}
      {kind === 'improve' ? <ImproveIcon /> : null}
      {kind === 'fix' ? <NoteIcon /> : null}
    </span>
  )
}

function SparkleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3.2 13.4 9 19 10.4 13.4 11.8 12 17.6 10.6 11.8 5 10.4 10.6 9 12 3.2Z"
        fill="#008C01"
      />
      <path d="M18.2 14.2 18.8 16.4 21 17 18.8 17.6 18.2 19.8 17.6 17.6 15.4 17 17.6 16.4 18.2 14.2Z" fill="#4ADE80" />
    </svg>
  )
}

function ImproveIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M5 16.5 9.2 12l3 3L19 8.2" stroke="#008C01" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.2 8.2H19V13" stroke="#008C01" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function NoteIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 4.8h8.2L18.8 8.4V19.2a1.4 1.4 0 0 1-1.4 1.4H7A1.4 1.4 0 0 1 5.6 19.2V6.2A1.4 1.4 0 0 1 7 4.8Z"
        stroke="#D97706"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M15.1 4.8V8.6h3.7" stroke="#D97706" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8.4 12.2h7.2M8.4 15.6h5.2" stroke="#D97706" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
