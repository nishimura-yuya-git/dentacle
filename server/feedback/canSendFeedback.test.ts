import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { decideFeedbackCanSend } from './canSendFeedback.ts'

describe('decideFeedbackCanSend', () => {
  it('AAL2 運営は所属なしでも送れる', () => {
    assert.equal(
      decideFeedbackCanSend({
        isPlatformAdminAal2: true,
        clinicId: null,
        isClinicMember: false,
      }),
      true,
    )
  })

  it('AAL1 運営（身分だけ）は所属がなければ送れない', () => {
    assert.equal(
      decideFeedbackCanSend({
        isPlatformAdminAal2: false,
        clinicId: null,
        isClinicMember: false,
      }),
      false,
    )
  })

  it('クリニック会員は所属院へ送れる', () => {
    assert.equal(
      decideFeedbackCanSend({
        isPlatformAdminAal2: false,
        clinicId: 'clinic-1',
        isClinicMember: true,
      }),
      true,
    )
    assert.equal(
      decideFeedbackCanSend({
        isPlatformAdminAal2: false,
        clinicId: 'clinic-1',
        isClinicMember: false,
      }),
      false,
    )
  })
})
