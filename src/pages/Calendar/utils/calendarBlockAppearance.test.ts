import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CALENDAR_HATCH_CLASS,
  calendarBlockClassName,
} from './calendarBlockAppearance.ts'

const here = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(join(here, '../../../index.css'), 'utf8')

assert.match(calendarBlockClassName(), new RegExp(CALENDAR_HATCH_CLASS))
assert.doesNotMatch(calendarBlockClassName(), /bg-slate-200/)
assert.match(css, /\.calendar-hatch-fill/)
assert.match(css, /repeating-linear-gradient/)
assert.match(css, /45deg/)

console.log('calendarBlockAppearance.test.ts: ok')
