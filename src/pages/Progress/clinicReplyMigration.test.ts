import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  IMPROVEMENT_ANNOUNCEMENT_FALLBACK_BODY,
  IMPROVEMENT_ANNOUNCEMENT_FALLBACK_TITLE,
  shouldNotifyClinicReplyOnStatus,
} from './improvementAnnouncement.ts'

const here = dirname(fileURLToPath(import.meta.url))
const sql = readFileSync(
  join(here, '../../../supabase/migrations/20260816003000_feedback_clinic_reply_on_done.sql'),
  'utf8',
)

describe('反映済みの本人チャット返信マイグレーション', () => {
  it('既存関数のシグネチャを変えず、done のときだけ返信する', () => {
    assert.match(sql, /create or replace function public\.set_improvement_item_status\(\s*p_id uuid,\s*p_status text\s*\)/s)
    assert.match(sql, /if p_status = 'done' and v_reply_id is null then/)
    assert.equal(sql.includes("p_status = 'wont_fix' and v_reply_id"), false)
    assert.equal(shouldNotifyClinicReplyOnStatus('wont_fix'), false)
  })

  it('院向け定型文を使い、運営名義ではなくスレッド本人の user_id で書く', () => {
    assert.match(sql, new RegExp(IMPROVEMENT_ANNOUNCEMENT_FALLBACK_TITLE))
    assert.match(sql, new RegExp(IMPROVEMENT_ANNOUNCEMENT_FALLBACK_BODY))
    assert.match(sql, /v_thread\.user_id/)
    assert.match(sql, /author_role,\s*body\s*\)\s*values \(\s*v_thread\.id,\s*v_thread\.user_id,\s*'system'/s)
    assert.match(sql, /github\|issue/)
  })

  it('1改善1通で、既読は本人専用 RPC だけが落とす', () => {
    assert.match(sql, /clinic_reply_message_id uuid unique/)
    assert.match(sql, /has_unread_reply boolean not null default false/)
    assert.match(sql, /create or replace function public\.mark_feedback_thread_read\(p_thread_id uuid\)/)
    assert.match(sql, /and user_id = auth\.uid\(\)/)
    assert.equal(sql.includes('drop policy'), false)
    assert.equal(sql.includes('for update to authenticated'), false)
  })
})
