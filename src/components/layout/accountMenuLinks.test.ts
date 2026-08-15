import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { visibleAccountMenuLinks } from './accountMenuLinks.ts'

describe('visibleAccountMenuLinks', () => {
  it('運営だけ「改善の進捗」を出す', () => {
    const admin = visibleAccountMenuLinks(true)
    const clinic = visibleAccountMenuLinks(false)
    assert.equal(
      admin.some((item) => item.to === '/progress' && item.label === '改善の進捗'),
      true,
    )
    assert.equal(
      clinic.some((item) => item.to === '/progress'),
      false,
    )
  })

  it('お知らせの次に改善の進捗を置く', () => {
    const admin = visibleAccountMenuLinks(true)
    const announcement = admin.findIndex((item) => item.to === '/announcements')
    const progress = admin.findIndex((item) => item.to === '/progress')
    assert.equal(progress, announcement + 1)
  })

  it('運営だけ「運営」を出し、改善の進捗の次に置く', () => {
    const admin = visibleAccountMenuLinks(true)
    const clinic = visibleAccountMenuLinks(false)
    const progress = admin.findIndex((item) => item.to === '/progress')
    const admins = admin.findIndex((item) => item.to === '/admins')
    assert.equal(admin[admins]?.label, '運営')
    assert.equal(admins, progress + 1)
    assert.equal(clinic.some((item) => item.to === '/admins'), false)
  })

  it('院ユーザーにもお知らせとご意見は残す', () => {
    const clinic = visibleAccountMenuLinks(false)
    assert.equal(clinic.some((item) => item.to === '/announcements'), true)
    assert.equal(clinic.some((item) => item.to === '/feedback'), true)
  })

  it('安全性の次にヘルプを置く', () => {
    const clinic = visibleAccountMenuLinks(false)
    const security = clinic.findIndex((item) => item.to === '/security')
    const help = clinic.findIndex((item) => item.to === '/help')
    assert.equal(help, security + 1)
    assert.equal(clinic[help]?.label, 'ヘルプ')
  })
})
