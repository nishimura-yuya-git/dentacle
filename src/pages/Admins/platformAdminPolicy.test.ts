import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  canEditPlatformAdmin,
  canRevokePlatformAdmin,
  toPlatformAdminPublicError,
} from './platformAdminPolicy.ts'

const here = dirname(fileURLToPath(import.meta.url))

describe('canEditPlatformAdmin', () => {
  it('運営画面では編集できる', () => {
    assert.equal(canEditPlatformAdmin(), true)
  })
})

describe('canRevokePlatformAdmin', () => {
  it('自分と最後の1人は外せない', () => {
    assert.equal(
      canRevokePlatformAdmin({
        targetUserId: 'a',
        selfUserId: 'a',
        adminCount: 2,
      }),
      false,
    )
    assert.equal(
      canRevokePlatformAdmin({
        targetUserId: 'b',
        selfUserId: 'a',
        adminCount: 1,
      }),
      false,
    )
  })

  it('他の運営は外せる', () => {
    assert.equal(
      canRevokePlatformAdmin({
        targetUserId: 'b',
        selfUserId: 'a',
        adminCount: 2,
      }),
      true,
    )
  })
})

describe('toPlatformAdminPublicError', () => {
  it('DBの日本語例外はそのまま出す', () => {
    assert.equal(
      toPlatformAdminPublicError('すでに運営です', '失敗しました。'),
      'すでに運営です',
    )
    assert.equal(
      toPlatformAdminPublicError('表示名は80文字以内にしてください', '失敗しました。'),
      '表示名は80文字以内にしてください',
    )
  })

  it('未知の文は院向けに伏せる', () => {
    assert.equal(
      toPlatformAdminPublicError('permission denied for table', '運営の保存に失敗しました。'),
      '運営の保存に失敗しました。',
    )
  })
})

describe('運営ページの入口', () => {
  it('直URLは運営専用ルートの中に置く', () => {
    const app = readFileSync(join(here, '../../App.tsx'), 'utf8')
    const adminRoute = app.indexOf('<Route element={<PlatformAdminRoute />}>')
    const adminsPage = app.indexOf('path="/admins"')
    assert.ok(adminRoute > 0 && adminsPage > adminRoute)
  })

  it('パスワード設定はログイン前の公開ルートに置く', () => {
    const app = readFileSync(join(here, '../../App.tsx'), 'utf8')
    const setPassword = app.indexOf('path="/set-password"')
    const protectedRoute = app.indexOf('<Route element={<ProtectedRoute />}>')
    assert.ok(setPassword > 0 && setPassword < protectedRoute)
  })
})
