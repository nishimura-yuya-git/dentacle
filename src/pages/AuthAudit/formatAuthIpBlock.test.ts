import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatAuthIpBlockConfirmMessage } from './formatAuthIpBlock.ts'

describe('formatAuthIpBlockConfirmMessage', () => {
  it('回線共有と別端末確認の案内を含む', () => {
    const message = formatAuthIpBlockConfirmMessage('14.10.160.195')
    assert.match(message, /14\.10\.160\.195/)
    assert.match(message, /グローバルIP/)
    assert.match(message, /端末単体/)
    assert.match(message, /別端末/)
    assert.match(message, /運営アカウント/)
  })
})
