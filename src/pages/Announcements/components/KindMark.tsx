import {
  formatProductUpdateMarkLabel,
  productUpdateMarkSrc,
  type ProductUpdateMark,
} from '@/pages/Announcements/productUpdateMark'

/** 更新情報タイムラインの目印。表示は public/icon/news を正とする。 */
export function KindMark({ mark }: { mark: ProductUpdateMark }) {
  const label = formatProductUpdateMarkLabel(mark)
  const src = productUpdateMarkSrc(mark)
  return (
    <span
      className="relative z-10 flex h-8 w-8 items-center justify-center"
      title={label}
      aria-hidden="true"
    >
      <img src={src} alt="" width={28} height={28} className="h-7 w-7 object-contain" />
    </span>
  )
}
