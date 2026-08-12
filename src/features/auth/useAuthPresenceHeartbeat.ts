import { useEffect, useRef } from 'react'
import {
  AUTH_PRESENCE_POLL_SECONDS,
  touchAuthPresence,
} from '@/features/auth/authPresence'

/**
 * ログイン中のみハートビートを送る。
 * タブ非表示中は止め、復帰時に即時1回送る。
 */
export function useAuthPresenceHeartbeat(enabled: boolean) {
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    let timer: ReturnType<typeof setInterval> | null = null

    const beat = () => {
      if (cancelled || !enabledRef.current) return
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return
      }
      void touchAuthPresence()
    }

    beat()
    timer = setInterval(beat, AUTH_PRESENCE_POLL_SECONDS * 1000)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') beat()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled])
}
