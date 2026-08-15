import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  isLatestCalendarDayLoad,
  shouldClearCalendarDayLoading,
} from './calendarDayLoadState.ts'

const here = dirname(fileURLToPath(import.meta.url))

describe('calendarDayLoadState', () => {
  it('古いリクエストは適用せず、loading も下ろさない', () => {
    assert.equal(isLatestCalendarDayLoad(1, 2), false)
    assert.equal(
      shouldClearCalendarDayLoading({ isLatest: false, silent: false }),
      false,
    )
  })

  it('非silentの途中にsilentが勝っても、最新ならloadingを下ろす', () => {
    assert.equal(isLatestCalendarDayLoad(2, 2), true)
    assert.equal(
      shouldClearCalendarDayLoading({ isLatest: true, silent: true }),
      true,
    )
    assert.equal(
      shouldClearCalendarDayLoading({ isLatest: true, silent: false }),
      true,
    )
  })

  it('日次loadは最新ならsilentでもsetLoading(false)する', () => {
    const source = readFileSync(join(here, 'useCalendarDayData.ts'), 'utf8')
    assert.match(source, /shouldClearCalendarDayLoading/)
    assert.match(source, /isLatestCalendarDayLoad/)
    assert.equal(source.includes('if (!silent) setLoading(false)'), false)
    assert.equal(source.includes('if (!silent) {\n      setLoading(false)'), false)
  })
})
