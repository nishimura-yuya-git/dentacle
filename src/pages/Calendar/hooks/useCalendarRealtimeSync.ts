import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  CALENDAR_SYNC_RELOAD_DEBOUNCE_MS,
  createDebouncedRunner,
  shouldReloadCalendarFromSyncTick,
} from '@/pages/Calendar/utils/calendarRealtimeSync'
import type { LoadOptions } from '@/pages/Calendar/hooks/useCalendarDayData'

/** 他端末の保存を、枠を消さずに取り直す */
export function useCalendarRealtimeSync(
  clinicId: string | undefined,
  date: string,
  load: (options?: LoadOptions) => Promise<void>,
) {
  useEffect(() => {
    if (!clinicId) return
    const viewingClinicId = clinicId
    const runner = createDebouncedRunner(CALENDAR_SYNC_RELOAD_DEBOUNCE_MS)
    const channel = supabase
      .channel(`clinic-calendar-sync:${viewingClinicId}:${date}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clinic_calendar_sync',
          filter: `clinic_id=eq.${viewingClinicId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as { clinic_id?: string } | null
          if (
            !shouldReloadCalendarFromSyncTick({
              viewingClinicId,
              eventClinicId: row?.clinic_id ?? viewingClinicId,
            })
          ) {
            return
          }
          runner.run(() => {
            void load({ silent: true })
          })
        },
      )
      .subscribe()

    return () => {
      runner.cancel()
      void supabase.removeChannel(channel)
    }
  }, [clinicId, date, load])
}
