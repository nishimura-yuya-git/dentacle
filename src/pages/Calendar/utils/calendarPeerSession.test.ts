import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import {
  isCalendarPeerId,
  readOrCreateCalendarPeerId,
  resetCalendarPeerIdMemory,
} from './calendarPeerSession.ts'

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial }
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value
    },
    data,
  }
}

describe('calendarPeerSession', () => {
  afterEach(() => {
    resetCalendarPeerIdMemory()
  })

  it('保存済みの端末IDを再利用する', () => {
    const id = '11111111-1111-4111-8111-111111111111'
    const storage = memoryStorage({ 'dentacle.calendar.peerId': id })
    assert.equal(readOrCreateCalendarPeerId(storage, () => 'new'), id)
  })

  it('未保存なら新規IDを保存する', () => {
    const storage = memoryStorage()
    const created = '22222222-2222-4222-8222-222222222222'
    assert.equal(readOrCreateCalendarPeerId(storage, () => created), created)
    assert.equal(storage.data['dentacle.calendar.peerId'], created)
  })

  it('壊れた値は新規IDに差し替える', () => {
    const storage = memoryStorage({ 'dentacle.calendar.peerId': 'pc-1' })
    const created = '33333333-3333-4333-8333-333333333333'
    assert.equal(readOrCreateCalendarPeerId(storage, () => created), created)
    assert.equal(isCalendarPeerId('pc-1'), false)
    assert.equal(isCalendarPeerId(created), true)
  })

  it('同一タブの連続呼び出しは同じIDにする', () => {
    const first = '44444444-4444-4444-8444-444444444444'
    const second = '55555555-5555-4555-8555-555555555555'
    let n = 0
    const createId = () => {
      n += 1
      return n === 1 ? first : second
    }
    const a = readOrCreateCalendarPeerId(memoryStorage(), createId)
    const b = readOrCreateCalendarPeerId(memoryStorage(), createId)
    assert.equal(a, first)
    assert.equal(b, first)
  })
})
