import assert from 'node:assert/strict'
import {
  DEFAULT_PLATFORM_CURSOR_MODEL_ID,
  GROK_VERSION_SELECT_OPTIONS,
  PLATFORM_CURSOR_MODEL_IDS,
  grokVersionFromStepIndex,
  grokVersionFromTrackRatio,
  grokVersionStepIndex,
  grokVersionValue,
  isGrokPlatformCursorModelId,
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

assert.equal(isGrokPlatformCursorModelId('grok-4.5'), true)
assert.equal(isGrokPlatformCursorModelId('grok-4.6'), true)
assert.equal(isGrokPlatformCursorModelId('composer-2.5'), false)
assert.deepEqual(
  GROK_VERSION_SELECT_OPTIONS.map((option) => option.value),
  ['grok-4.5', 'grok-4.6'],
)
assert.equal(GROK_VERSION_SELECT_OPTIONS[0]?.label, '4.5（おすすめ）')
assert.equal(GROK_VERSION_SELECT_OPTIONS[1]?.label, '4.6')
assert.equal(
  GROK_VERSION_SELECT_OPTIONS.every((option) => !option.label.includes('Grok')),
  true,
)
assert.equal(grokVersionValue('grok-4.6'), 'grok-4.6')
assert.equal(grokVersionValue('composer-2.5'), 'grok-4.5')
assert.equal(grokVersionStepIndex('grok-4.5'), 0)
assert.equal(grokVersionStepIndex('grok-4.6'), 1)
assert.equal(grokVersionStepIndex('composer-2.5'), 0)
assert.equal(grokVersionFromStepIndex(0), 'grok-4.5')
assert.equal(grokVersionFromStepIndex(1), 'grok-4.6')
assert.equal(grokVersionFromTrackRatio(0.2), 'grok-4.5')
assert.equal(grokVersionFromTrackRatio(0.8), 'grok-4.6')

console.log('src/config/aiModelOptions.test.ts: ok')
