/** メモアイコン（`public/icon/note.png`） */
export function NoteIcon({ className = '' }: { className?: string }) {
  return (
    <img
      src="/icon/note.png"
      alt=""
      width={15}
      height={15}
      className={`h-[15px] w-[15px] object-contain ${className}`}
      draggable={false}
    />
  )
}
