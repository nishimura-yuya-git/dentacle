import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  invitePlatformAdmin,
  resetInviteRateLimitForTests,
  type InvitePlatformAdminDeps,
} from './invitePlatformAdmin.ts'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')

function deps(overrides: Partial<InvitePlatformAdminDeps> = {}): InvitePlatformAdminDeps {
  return {
    getUserId: async () => 'admin-1',
    isPlatformAdmin: async () => true,
    inviteUserByEmail: async () => ({ ok: true }),
    grantByEmail: async () => ({ ok: false, message: '該当するユーザーが見つかりません' }),
    ...overrides,
  }
}

describe('invitePlatformAdmin', () => {
  it('新規は招待してから運営に付ける', async () => {
    resetInviteRateLimitForTests()
    let grantCount = 0
    const result = await invitePlatformAdmin(
      { accessToken: 'token', email: 'new@example.com', origin: 'http://localhost:5173' },
      deps({
        grantByEmail: async () => {
          grantCount += 1
          if (grantCount === 1) {
            return { ok: false, message: '該当するユーザーが見つかりません' }
          }
          return { ok: true }
        },
      }),
    )
    assert.deepEqual(result, { ok: true, invited: true })
  })

  it('既存アカウントはメールを送らず付ける', async () => {
    resetInviteRateLimitForTests()
    let invited = false
    const result = await invitePlatformAdmin(
      { accessToken: 'token', email: 'old@example.com' },
      deps({
        grantByEmail: async () => ({ ok: true }),
        inviteUserByEmail: async () => {
          invited = true
          return { ok: true }
        },
      }),
    )
    assert.deepEqual(result, { ok: true, invited: false })
    assert.equal(invited, false)
  })

  it('本番経路は AAL2 判定と app_metadata 強制を使う', () => {
    const source = readFileSync(join(repoRoot, 'server/admins/invitePlatformAdmin.ts'), 'utf8')
    const aal2 = readFileSync(join(repoRoot, 'server/auth/platformAdminAal2.ts'), 'utf8')
    assert.match(source, /fetchIsPlatformAdminAal2/)
    assert.match(source, /markInvitedUserMustSetPassword/)
    assert.match(aal2, /is_platform_admin_aal2/)
  })

  it('運営以外は拒否する', async () => {
    resetInviteRateLimitForTests()
    const result = await invitePlatformAdmin(
      { accessToken: 'token', email: 'a@example.com' },
      deps({ isPlatformAdmin: async () => false }),
    )
    assert.equal(result.ok, false)
    if (result.ok) return
    assert.equal(result.code, 'forbidden')
  })
})
