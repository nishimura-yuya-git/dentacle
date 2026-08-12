/** ユーザー＋取消アイコン（`public/icon/block-user.png`） */
export function CancelUserIcon({ className = '' }: { className?: string }) {
  return (
    <img
      src="/icon/block-user.png"
      alt=""
      width={18}
      height={18}
      className={`h-[18px] w-[18px] object-contain ${className}`}
      draggable={false}
    />
  )
}
