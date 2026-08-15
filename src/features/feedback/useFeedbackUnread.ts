import { useCallback, useEffect, useState } from 'react'
import { loadHasUnreadFeedbackReply } from '@/features/feedback/loadFeedbackUnread'

/** FAB の未読点。開くときと focus で取り直す。Realtime は使わない。 */
export function useFeedbackUnread() {
  const [hasUnreadReply, setHasUnreadReply] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setHasUnreadReply(await loadHasUnreadFeedbackReply())
    } catch {
      setHasUnreadReply(false)
    }
  }, [])

  useEffect(() => {
    void refresh()

    function onFocus() {
      void refresh()
    }

    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh])

  return { hasUnreadReply, refresh }
}
