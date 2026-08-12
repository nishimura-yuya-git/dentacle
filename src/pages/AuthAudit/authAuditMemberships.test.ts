import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  formatAuthAuditMembershipsLabel,
  parseAuthAuditMemberships,
} from './authAuditMemberships.ts'

describe('parseAuthAuditMemberships', () => {
  it('metadata から所属を読む', () => {
    const rows = parseAuthAuditMemberships({
      memberships: [
        { clinic_id: 'a', clinic_name: '本院', role: 'admin' },
        { clinic_id: 'b', clinic_name: '分院', role: 'staff' },
      ],
    })
    assert.equal(rows.length, 2)
    assert.equal(rows[0]?.clinic_name, '本院')
  })
})

describe('formatAuthAuditMembershipsLabel', () => {
  it('所属なしを出す', () => {
    assert.equal(formatAuthAuditMembershipsLabel([]), '所属なし')
  })

  it('複数院を読点でつなぐ', () => {
    assert.equal(
      formatAuthAuditMembershipsLabel([
        { clinic_id: 'a', clinic_name: '本院' },
        { clinic_id: 'b', clinic_name: '分院' },
      ]),
      '本院、分院',
    )
  })
})
