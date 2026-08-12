import assert from 'node:assert/strict'
import {
  buildPublicCursorHealthFail,
  buildPublicCursorHealthOk,
  CURSOR_HEALTH_GENERIC_ERROR,
  isCursorHealthAuthorized,
  readCursorHealthSecret,
} from './healthGate.ts'

{
  assert.equal(readCursorHealthSecret({}), null)
  assert.equal(readCursorHealthSecret({ CURSOR_HEALTH_SECRET: '  ' }), null)
  assert.equal(
    readCursorHealthSecret({ CURSOR_HEALTH_SECRET: ' secret-value ' }),
    'secret-value',
  )
}

{
  const env = { CURSOR_HEALTH_SECRET: 'ops-secret' }
  assert.equal(isCursorHealthAuthorized(undefined, env), false)
  assert.equal(isCursorHealthAuthorized('Bearer wrong', env), false)
  assert.equal(isCursorHealthAuthorized('Bearer ops-secret', env), true)
  assert.equal(isCursorHealthAuthorized('bearer ops-secret', env), true)
  assert.equal(isCursorHealthAuthorized(['Bearer ops-secret'], env), true)
}

{
  // シークレット未設定なら常に拒否（本番で誤って公開しない）
  assert.equal(
    isCursorHealthAuthorized('Bearer anything', { CURSOR_HEALTH_SECRET: '' }),
    false,
  )
}

{
  const ok = buildPublicCursorHealthOk()
  assert.deepEqual(ok, {
    ok: true,
    service: 'cursor-sdk',
    ready: true,
  })
  assert.equal('localCwd' in ok, false)
  assert.equal('hasApiKey' in ok, false)
  assert.equal('modelId' in ok, false)
  assert.equal('note' in ok, false)

  const fail = buildPublicCursorHealthFail()
  assert.equal(fail.error, CURSOR_HEALTH_GENERIC_ERROR)
  assert.equal(fail.ok, false)
}

console.log('server/cursor/healthGate.test.ts: ok')
