import { useCallback, useEffect, useState } from 'react'
import {
  parseSendOnEnterPreference,
  SEND_ON_ENTER_STORAGE_KEY,
  serializeSendOnEnterPreference,
} from '@/features/feedback/sendOnEnterPolicy'

/** ご意見の Enter 送信。端末にだけ残す。既定はオフ */
export function useSendOnEnterPreference() {
  const [sendOnEnter, setEnabled] = useState(false)

  useEffect(() => {
    try {
      setEnabled(parseSendOnEnterPreference(localStorage.getItem(SEND_ON_ENTER_STORAGE_KEY)))
    } catch {
      // private mode 等では既定オフ
    }
  }, [])

  const setSendOnEnter = useCallback((next: boolean) => {
    setEnabled(next)
    try {
      localStorage.setItem(SEND_ON_ENTER_STORAGE_KEY, serializeSendOnEnterPreference(next))
    } catch {
      // 保存できなくても操作自体は続ける
    }
  }, [])

  return { sendOnEnter, setSendOnEnter }
}
