import { useRef, useState, type DragEvent } from 'react'

type Props = {
  disabled?: boolean
  busy?: boolean
  onFiles: (files: File[]) => void
}

/** 患者書類の選択面。登録モーダルと編集画面で共用する。 */
export function PatientPdfDropZone({ disabled = false, busy = false, onFiles }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const inactive = disabled || busy

  function take(list: FileList | null) {
    if (!list || list.length === 0 || inactive) return
    onFiles(Array.from(list))
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    setDragging(false)
    take(event.dataTransfer.files)
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="sr-only"
        disabled={inactive}
        onChange={(event) => {
          take(event.target.files)
          event.target.value = ''
        }}
      />
      <button
        type="button"
        disabled={inactive}
        aria-label="PDFを選択"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          if (!inactive) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`w-full rounded-2xl border-2 border-dashed px-8 py-7 text-center transition disabled:cursor-not-allowed disabled:opacity-60 ${
          dragging
            ? 'border-emerald-400 bg-emerald-50'
            : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40'
        }`}
      >
        <p className="text-sm font-bold text-slate-700">
          {busy ? 'PDFを保存しています…' : 'PDFをドロップ、またはクリックして選択'}
        </p>
        <p className="mt-1 text-xs font-medium text-slate-400">
          PDFのみ。1ファイル10MBまで、患者あたり20件まで
        </p>
      </button>
    </div>
  )
}
