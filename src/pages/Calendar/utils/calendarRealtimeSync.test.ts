import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CALENDAR_SYNC_RELOAD_DEBOUNCE_MS,
  createDebouncedRunner,
  shouldReloadCalendarFromSyncTick,
} from './calendarRealtimeSync.ts'

const here = dirname(fileURLToPath(import.meta.url))

describe('calendarRealtimeSync', () => {
  it('同じ院の変更だけ silent 再読込する', () => {
    assert.equal(
      shouldReloadCalendarFromSyncTick({
        viewingClinicId: 'clinic-a',
        eventClinicId: 'clinic-a',
      }),
      true,
    )
    assert.equal(
      shouldReloadCalendarFromSyncTick({
        viewingClinicId: 'clinic-a',
        eventClinicId: 'clinic-b',
      }),
      false,
    )
    assert.equal(
      shouldReloadCalendarFromSyncTick({
        viewingClinicId: undefined,
        eventClinicId: 'clinic-a',
      }),
      false,
    )
  })

  it('最初の1回は待たずに実行する', async () => {
    const runner = createDebouncedRunner(40)
    let count = 0
    runner.run(() => {
      count += 1
    })
    assert.equal(count, 1)
    await new Promise((resolve) => setTimeout(resolve, 60))
    assert.equal(count, 1)
    runner.cancel()
  })

  it('連打は先頭1回と、静穏後の1回にまとめる', async () => {
    const runner = createDebouncedRunner(20)
    let count = 0
    runner.run(() => {
      count += 1
    })
    runner.run(() => {
      count += 1
    })
    runner.run(() => {
      count += 1
    })
    assert.equal(count, 1)
    await new Promise((resolve) => setTimeout(resolve, 40))
    assert.equal(count, 2)
    runner.cancel()
  })

  it('日次loadは silent で枠を消さない', () => {
    const source = readFileSync(
      join(here, '../hooks/useCalendarRealtimeSync.ts'),
      'utf8',
    )
    const dayData = readFileSync(
      join(here, '../hooks/useCalendarDayData.ts'),
      'utf8',
    )
    const migration = readFileSync(
      join(
        here,
        '../../../../supabase/migrations/20260816160000_clinic_calendar_realtime.sql',
      ),
      'utf8',
    )
    assert.match(source, /load\(\{ silent: true \}\)/)
    assert.match(source, /CALENDAR_SYNC_RELOAD_DEBOUNCE_MS/)
    assert.match(dayData, /useCalendarRealtimeSync/)
    assert.match(dayData, /shouldUseCalendarDayOnlyReload/)
    assert.equal(source.includes('setVisits([])'), false)
    assert.equal(CALENDAR_SYNC_RELOAD_DEBOUNCE_MS, 400)
    assert.match(migration, /clinic_calendar_sync/)
    assert.match(migration, /clinic_calendar_peers/)
    assert.match(migration, /supabase_realtime/)
    assert.equal(migration.includes('on public.clinic_calendar_peers'), true)
    assert.equal(
      /trg_.*peers.*calendar_sync/.test(migration),
      false,
    )
    assert.match(migration, /grant select on table public.clinic_calendar_sync/)
    assert.equal(
      migration.includes('grant insert on table public.clinic_calendar_sync'),
      false,
    )
  })

  it('version のない同期テーブルに set_updated_at を付けない', () => {
    const fix = readFileSync(
      join(
        here,
        '../../../../supabase/migrations/20260816161000_clinic_calendar_drop_version_trigger.sql',
      ),
      'utf8',
    )
    assert.match(fix, /drop trigger if exists trg_clinic_calendar_sync_updated_at/i)
    assert.match(fix, /drop trigger if exists trg_clinic_calendar_peers_updated_at/i)
    assert.equal(fix.includes('execute function public.set_updated_at()'), false)
  })
})
