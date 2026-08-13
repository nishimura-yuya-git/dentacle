import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useClinic } from '@/features/clinic/useClinic'
import {
  FEEDBACK_GREETING,
  FEEDBACK_PII_NOTICE,
} from '@/features/feedback/feedbackCopy'
import { loadLatestFeedbackThread } from '@/features/feedback/loadFeedbackHistory'
import {
  sendFeedback,
  type FeedbackChatMessage,
} from '@/features/feedback/sendFeedback'

function greetingMessage(): FeedbackChatMessage {
  return {
    id: 'greeting',
    role: 'system',
    body: `${FEEDBACK_GREETING} ${FEEDBACK_PII_NOTICE}`,
    createdAt: new Date().toISOString(),
  }
}

/** ご意見チャットの状態。送信は GitHub Issue 化 API へ渡す */
export function useFeedbackChat() {
  const { clinic } = useClinic()
  const { pathname } = useLocation()
  const [threadId, setThreadId] = useState<string | null>(null)
  const [issueNumber, setIssueNumber] = useState<number | null>(null)
  const [issueUrl, setIssueUrl] = useState<string | null>(null)
  const [messages, setMessages] = useState<FeedbackChatMessage[]>([greetingMessage()])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [historyReady, setHistoryReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const latest = await loadLatestFeedbackThread()
        if (cancelled) return
        if (latest && latest.messages.length > 0) {
          setThreadId(latest.id)
          setIssueNumber(latest.issueNumber)
          setIssueUrl(latest.issueUrl)
          setMessages(latest.messages)
        }
      } catch {
        // 履歴がまだ無い（マイグレーション前）でもチャット自体は使える
      } finally {
        if (!cancelled) setHistoryReady(true)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const startNewThread = useCallback(() => {
    setThreadId(null)
    setIssueNumber(null)
    setIssueUrl(null)
    setMessages([greetingMessage()])
    setDraft('')
    setError(null)
  }, [])

  const send = useCallback(async () => {
    const body = draft.trim()
    if (!body || busy) return
    setBusy(true)
    setError(null)
    try {
      const result = await sendFeedback({
        body,
        clinicId: clinic?.id ?? null,
        pagePath: pathname,
        threadId,
      })
      setThreadId(result.threadId)
      setIssueNumber(result.issueNumber)
      setIssueUrl(result.issueUrl)
      setMessages((current) => {
        const withoutGreeting = current.filter((item) => item.id !== 'greeting')
        return [...withoutGreeting, ...result.messages]
      })
      setDraft('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ご意見の送信に失敗しました')
    } finally {
      setBusy(false)
    }
  }, [busy, clinic?.id, draft, pathname, threadId])

  return {
    threadId,
    issueNumber,
    issueUrl,
    messages,
    draft,
    setDraft,
    busy,
    error,
    historyReady,
    send,
    startNewThread,
  }
}
