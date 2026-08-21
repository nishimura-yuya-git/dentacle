import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  formatMyPageClinicLabel,
  profileToDraft,
  toMyProfilePublicError,
  validateDisplayName,
} from './myProfilePolicy.ts'

const here = dirname(fileURLToPath(import.meta.url))

describe('validateDisplayName', () => {
  it('空は止める', () => {
    const result = validateDisplayName('')
    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.equal(result.message, '表示名を入力してください。')
    }
  })

  it('空白のみは止める', () => {
    const result = validateDisplayName('   ')
    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.equal(result.message, '表示名を入力してください。')
    }
  })

  it('前後空白は削って通す', () => {
    const result = validateDisplayName('  山田太郎  ')
    assert.deepEqual(result, { ok: true, displayName: '山田太郎' })
  })
})

describe('profileToDraft', () => {
  it('未設定は空文字にする', () => {
    assert.deepEqual(profileToDraft(null), { displayName: '' })
    assert.deepEqual(profileToDraft(undefined), { displayName: '' })
  })
})

describe('formatMyPageClinicLabel', () => {
  it('未準備はダッシュ、名前がなければ未所属', () => {
    assert.equal(formatMyPageClinicLabel(false, 'ひまわり歯科'), '—')
    assert.equal(formatMyPageClinicLabel(true, null), '未所属')
    assert.equal(formatMyPageClinicLabel(true, 'ひまわり歯科'), 'ひまわり歯科')
  })
})

describe('toMyProfilePublicError', () => {
  it('権限エラーを公開文言にする', () => {
    assert.equal(
      toMyProfilePublicError('new row violates row-level security policy'),
      'アカウント情報を保存する権限がありません。',
    )
    assert.match(toMyProfilePublicError('unexpected'), /失敗/)
  })
})

describe('マイページ編集境界', () => {
  it('フォームにメール入力と所属セレクトを置かない', () => {
    const source = readFileSync(join(here, '../components/MyPageForm.tsx'), 'utf8')
    assert.equal(source.includes('type="email"'), false)
    assert.equal(source.includes('<Select'), false)
    assert.equal(source.includes('updateUser'), false)
  })

  it('保存は表示名だけ送る', () => {
    const source = readFileSync(join(here, 'useMyProfile.ts'), 'utf8')
    assert.match(source, /display_name: validated\.displayName/)
    assert.equal(source.includes('email:'), false)
    assert.equal(source.includes('clinic_id'), false)
    assert.equal(source.includes('updateUser'), false)
  })
})
