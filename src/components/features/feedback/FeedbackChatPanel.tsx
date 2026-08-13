import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { FEEDBACK_PII_NOTICE } from '@/features/feedback/feedbackCopy'
import { useFeedbackChat } from '@/features/feedback/useFeedbackChat'
import type { FeedbackChatMessage } from '@/features/feedback/sendFeedback'

type Props = {
  /** page: 専用画面 / float: 右下パネル */
  variant: 'page' | 'float'
  onClose?: () => void
}

/** ご意見チャット本体（日本語・個人情報注意） */
export function FeedbackChatPanel({ variant, onClose }: Props) {
  const chat = useFeedbackChat()
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = listRef.current
    if (!root) return
    root.scrollTop = root.scrollHeight
  }, [chat.messages.length])

  const shellClass =
    variant === 'page'
      ? 'flex h-full min-h-0 flex-col rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm'
      : 'flex h-[min(560px,calc(100dvh-6rem))] w-[min(100vw-2rem,400px)] flex-col rounded-[28px] border border-slate-100 bg-white p-6 shadow-lg'

  return (
    <section className={shellClass} aria-label="ご意見チャット">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">ご意見・不具合</h2>
          <p className="mt-1 text-xs font-medium text-slate-400">{FEEDBACK_PII_NOTICE}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="md"
            className="px-3 py-2 text-xs"
            onClick={chat.startNewThread}
          >
            新しいご意見
          </Button>
          {onClose ? (
            <button
              type="button"
              className="rounded-xl px-2 py-1 text-sm font-bold text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
              aria-label="チャットを閉じる"
              onClick={onClose}
            >
              ×
            </button>
          ) : null}
        </div>
      </header>

      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1"
      >
        {chat.messages.map((item) => (
          <MessageBubble key={item.id} message={item} />
        ))}
      </div>

      {chat.error ? (
        <p className="mt-3 text-xs font-medium text-rose-600" role="alert">
          {chat.error}
        </p>
      ) : null}

      <form
        className="mt-4"
        onSubmit={(event) => {
          event.preventDefault()
          void chat.send()
        }}
      >
        <label className="relative block">
          <span className="sr-only">ご意見の本文</span>
          <textarea
            value={chat.draft}
            onChange={(event) => chat.setDraft(event.target.value)}
            rows={3}
            placeholder="気づいたこと、再現手順、期待する動きを書いてください"
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-16 text-sm text-slate-900 outline-none transition focus:border-[#008C01] focus:ring-4 focus:ring-[#008C01]/20"
            disabled={chat.busy}
          />
          <button
            type="submit"
            disabled={!chat.draft.trim() || chat.busy}
            aria-label="送信する"
            aria-busy={chat.busy}
            className="absolute bottom-2 right-2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#E7F4E7] shadow-sm transition-colors hover:bg-[#D5EDD5] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#008C01]/35 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <img
              src="/icon/paper-plane.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
              draggable={false}
            />
          </button>
        </label>
      </form>
    </section>
  )
}

function MessageBubble({ message }: { message: FeedbackChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
      <p
        className={[
          'max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6',
          isUser
            ? 'bg-[#008C01] text-white'
            : 'bg-slate-50 text-slate-700',
        ].join(' ')}
      >
        {message.body}
      </p>
    </div>
  )
}
