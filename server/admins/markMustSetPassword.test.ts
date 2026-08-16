import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  markInvitedUserMustSetPassword,
  mergeMustSetPasswordAppMetadata,
} from './markMustSetPassword.ts'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')

describe('mergeMustSetPasswordAppMetadata', () => {
  it('既存の app_metadata を残してフラグを立てる', () => {
    assert.deepEqual(mergeMustSetPasswordAppMetadata({ provider: 'email' }), {
      provider: 'email',
      must_set_password: true,
    })
  })
})

describe('markInvitedUserMustSetPassword', () => {
  it('admin update で app_metadata を書く', async () => {
    let saved: { app_metadata: Record<string, unknown> } | null = null
    const result = await markInvitedUserMustSetPassword({
      userId: 'user-1',
      existingAppMetadata: { role: 'staff' },
      updateUserById: async (_id, attributes) => {
        saved = attributes
        return { error: null }
      },
    })
    assert.deepEqual(result, { ok: true })
    assert.equal(saved?.app_metadata.must_set_password, true)
    assert.equal(saved?.app_metadata.role, 'staff')
  })
})

describe('AAL2 / パスワード強制マイグレーション', () => {
  it('身分判定に AAL2 を混ぜず、別関数とヘルパーだけ上げる', () => {
    const identity = readFileSync(
      join(repoRoot, 'supabase/migrations/20260809120000_clinic_contract_accounts.sql'),
      'utf8',
    )
    const aal2 = readFileSync(
      join(repoRoot, 'supabase/migrations/20260816040000_is_platform_admin_aal2.sql'),
      'utf8',
    )
    const ipBlock = readFileSync(
      join(repoRoot, 'supabase/migrations/20260812160000_auth_audit_clinic_and_ip_blocks.sql'),
      'utf8',
    )
    assert.match(identity, /create or replace function public\.is_platform_admin\(\)/)
    assert.doesNotMatch(identity, /auth\.jwt\(\) ->> 'aal'/)
    assert.match(aal2, /is_platform_admin_aal2/)
    assert.match(aal2, /is_clinic_member[\s\S]*is_platform_admin_aal2/)
    assert.match(ipBlock, /if public\.is_platform_admin\(\) then/)
    assert.doesNotMatch(ipBlock, /is_platform_admin_aal2/)
  })

  it('自動提案と空き埋めの運営枝は AAL2 を使う', () => {
    const propose = readFileSync(join(repoRoot, 'server/schedule/runProposeJob.ts'), 'utf8')
    const gapFill = readFileSync(join(repoRoot, 'server/schedule/runGapFillJob.ts'), 'utf8')
    assert.match(propose, /fetchIsPlatformAdminAal2/)
    assert.match(gapFill, /fetchIsPlatformAdminAal2/)
    assert.doesNotMatch(gapFill, /\.from\('platform_admins'\)/)
  })

  it('本番ヘッダにクリックジャッキングと CSP がある', () => {
    const vercel = readFileSync(join(repoRoot, 'vercel.json'), 'utf8')
    assert.match(vercel, /X-Frame-Options/)
    assert.match(vercel, /DENY/)
    assert.match(vercel, /Content-Security-Policy/)
    assert.match(vercel, /X-Content-Type-Options/)
    assert.match(vercel, /fonts\.googleapis\.com/)
    assert.match(vercel, /\*\.supabase\.co/)
    assert.match(vercel, /ipwho\.is/)
    assert.match(vercel, /api\/schedule\/propose/)
    assert.match(vercel, /api\/schedule\/gap-fill/)
  })

  it('パスワード変更トリガは app_metadata を下ろす', () => {
    const sql = readFileSync(
      join(repoRoot, 'supabase/migrations/20260816043000_must_set_password_app_metadata.sql'),
      'utf8',
    )
    assert.match(sql, /encrypted_password is distinct from/)
    assert.match(sql, /must_set_password": false/)
    assert.match(sql, /on auth\.users/)
  })
})
