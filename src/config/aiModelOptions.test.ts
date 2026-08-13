import assert from 'node:assert/strict'
import {
  DEFAULT_PLATFORM_CURSOR_MODEL_ID,
  PLATFORM_CURSOR_MODEL_IDS,
  isPlatformCursorModelId,
  normalizePlatformCursorModelId,
} from './aiModelOptions.ts'

assert.equal(DEFAULT_PLATFORM_CURSOR_MODEL_ID, 'grok-4.5')
assert.ok(PLATFORM_CURSOR_MODEL_IDS.includes('grok-4.5'))
assert.ok(PLATFORM_CURSOR_MODEL_IDS.includes('grok-4.6'))
assert.ok(PLATFORM_CURSOR_MODEL_IDS.includes('composer-2.5'))

assert.equal(isPlatformCursorModelId('grok-4.6'), true)
assert.equal(isPlatformCursorModelId('grok-4.5'), true)
assert.equal(isPlatformCursorModelId('unknown'), false)

assert.equal(normalizePlatformCursorModelId('grok-4.6'), 'grok-4.6')
assert.equal(normalizePlatformCursorModelId('invalid'), 'grok-4.5')
assert.equal(normalizePlatformCursorModelId(null), 'grok-4.5')

console.log('src/config/aiModelOptions.test.ts: ok')
