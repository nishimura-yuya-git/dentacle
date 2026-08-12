import assert from 'node:assert/strict'
import { toCostSnapshot, toTokenUsageSnapshot } from './usageTypes.ts'

{
  const usage = toTokenUsageSnapshot({
    inputTokens: 10,
    outputTokens: 20,
    cacheReadTokens: 1,
    cacheWriteTokens: 2,
    totalTokens: 33,
    reasoningTokens: 5,
  })
  assert.ok(usage)
  assert.equal(usage.totalTokens, 33)
  assert.equal(usage.reasoningTokens, 5)
  assert.equal(toTokenUsageSnapshot({ inputTokens: 1 }), null)
}

{
  const cost = toCostSnapshot({ rawCostCents: 12.5, chargedCents: 10 })
  assert.ok(cost)
  assert.equal(cost.chargedCents, 10)
  assert.equal(toCostSnapshot({ rawCostCents: 'x' }), null)
}

console.log('usageTypes.test.ts: ok')
