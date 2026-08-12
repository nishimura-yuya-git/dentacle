import assert from 'node:assert/strict'
import { describeCursorEnv, loadCursorServerEnv } from './env.ts'
import { buildCursorRuntimeOptions } from './runtime.ts'

const base = {
  CURSOR_API_KEY: 'cursor_test_key',
  CURSOR_RUNTIME: 'local',
  CURSOR_MODEL_ID: 'grok-4.5',
  CURSOR_LOCAL_CWD: '/tmp/dentacle',
}

{
  const config = loadCursorServerEnv(base)
  assert.equal(config.runtime, 'local')
  assert.equal(config.modelId, 'grok-4.5')
  const defaultModel = loadCursorServerEnv({
    CURSOR_API_KEY: 'cursor_test_key',
    CURSOR_RUNTIME: 'local',
  })
  assert.equal(defaultModel.modelId, 'grok-4.5')

  const runtime = buildCursorRuntimeOptions(config)
  assert.ok('local' in runtime)
  if ('local' in runtime) {
    assert.equal(runtime.local.cwd, '/tmp/dentacle')
  }
  const described = describeCursorEnv(config)
  assert.equal(described.hasApiKey, true)
  assert.equal(described.cloudRepoConfigured, false)
}

{
  let threw = false
  try {
    loadCursorServerEnv({
      ...base,
      CURSOR_RUNTIME: 'cloud',
      CURSOR_CLOUD_REPO_URL: '',
    })
  } catch {
    threw = true
  }
  assert.equal(threw, true)
}

{
  const config = loadCursorServerEnv({
    ...base,
    CURSOR_RUNTIME: 'cloud',
    CURSOR_CLOUD_REPO_URL: 'https://github.com/example/dentacle',
    CURSOR_CLOUD_STARTING_REF: 'main',
  })
  const runtime = buildCursorRuntimeOptions(config)
  assert.ok('cloud' in runtime)
  if ('cloud' in runtime) {
    assert.equal(runtime.cloud.repos[0]?.url, 'https://github.com/example/dentacle')
    assert.equal(runtime.cloud.autoCreatePR, false)
  }
}

console.log('server/cursor/env.test.ts: ok')
