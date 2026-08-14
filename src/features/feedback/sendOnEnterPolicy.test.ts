import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  parseSendOnEnterPreference,
  resolveEnterKeyAction,
  SEND_ON_ENTER_LABEL,
  sendOnEnterDescription,
  serializeSendOnEnterPreference,
} from './sendOnEnterPolicy.ts'

const base = {
  sendOnEnter: true,
  key: 'Enter',
  shiftKey: false,
  isComposing: false,
  hasDraft: true,
  busy: false,
}

describe('sendOnEnterPolicy', () => {
  it('既定はオフとして読む', () => {
    assert.equal(parseSendOnEnterPreference(null), false)
    assert.equal(parseSendOnEnterPreference(''), false)
    assert.equal(parseSendOnEnterPreference('0'), false)
    assert.equal(parseSendOnEnterPreference('false'), false)
    assert.equal(parseSendOnEnterPreference('yes'), false)
  })

  it('保存値 1 と true だけをオンにする', () => {
    assert.equal(parseSendOnEnterPreference('1'), true)
    assert.equal(parseSendOnEnterPreference('true'), true)
    assert.equal(serializeSendOnEnterPreference(true), '1')
    assert.equal(serializeSendOnEnterPreference(false), '0')
  })

  it('オフの Enter は改行のままにする', () => {
    assert.equal(resolveEnterKeyAction({ ...base, sendOnEnter: false }), 'newline')
  })

  it('オンの Enter は下書きがあるときだけ送信する', () => {
    assert.equal(resolveEnterKeyAction(base), 'send')
    assert.equal(resolveEnterKeyAction({ ...base, hasDraft: false }), 'ignore')
    assert.equal(resolveEnterKeyAction({ ...base, busy: true }), 'ignore')
  })

  it('Shift+Enter と IME 確定の Enter は改行にする', () => {
    assert.equal(resolveEnterKeyAction({ ...base, shiftKey: true }), 'newline')
    assert.equal(resolveEnterKeyAction({ ...base, isComposing: true }), 'newline')
    assert.equal(resolveEnterKeyAction({ ...base, keyCode: 229 }), 'newline')
  })

  it('Enter 以外は無視する', () => {
    assert.equal(resolveEnterKeyAction({ ...base, key: 'a' }), 'ignore')
  })

  it('設定行の文言は日本語で、オンオフで補足が変わる', () => {
    assert.equal(SEND_ON_ENTER_LABEL, 'Enterで送信')
    assert.equal(sendOnEnterDescription(false), '送信は右下のボタン。Enterで改行')
    assert.equal(sendOnEnterDescription(true), '改行は Shift + Enter')
  })
})
