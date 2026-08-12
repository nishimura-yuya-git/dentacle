/** 電話アイコン（`public/icon/telephone.png`）
 * PNGの描画領域が広いため、禁止アイコンと揃えて一回り小さく表示する
 */
export function PhoneIcon({ className = '' }: { className?: string }) {
  return (
    <img
      src="/icon/telephone.png"
      alt=""
      width={14}
      height={14}
      className={`h-[14px] w-[14px] object-contain ${className}`}
      draggable={false}
    />
  )
}
