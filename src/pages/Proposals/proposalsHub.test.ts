import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import * as proposalsHub from './proposalsHub.ts'
import {
  PROPOSALS_HUB_NAV,
  isProposalsHubItemActive,
  viewFromSearch,
} from './proposalsHub.ts'

describe('PROPOSALS_HUB_NAV', () => {
  it('条件・ジョブ・利用状況の3つで、提案内容一覧は置かない', () => {
    assert.deepEqual(
      PROPOSALS_HUB_NAV.map((item) => item.label),
      ['条件設定', '最近のジョブ', 'AI利用状況'],
    )
    assert.equal(
      PROPOSALS_HUB_NAV.some((item) => item.label === '提案内容'),
      false,
    )
    assert.equal(
      PROPOSALS_HUB_NAV.some((item) => item.label === '提案生成'),
      false,
    )
    assert.equal(
      PROPOSALS_HUB_NAV.some((item) => item.label === '採用'),
      false,
    )
    assert.equal('PROPOSALS_HUB_INTRO' in proposalsHub, false)
  })
})

describe('viewFromSearch', () => {
  it('view=usage だけ利用状況にする', () => {
    assert.equal(viewFromSearch(new URLSearchParams('view=usage')), 'usage')
    assert.equal(viewFromSearch(new URLSearchParams()), 'proposals')
    assert.equal(viewFromSearch(new URLSearchParams('view=proposals')), 'proposals')
  })
})

describe('isProposalsHubItemActive', () => {
  const conditions = PROPOSALS_HUB_NAV[0]
  const usage = PROPOSALS_HUB_NAV[2]

  it('提案画面では選択中セクションだけactive', () => {
    assert.equal(isProposalsHubItemActive(conditions, 'proposals', 'conditions'), true)
    assert.equal(isProposalsHubItemActive(conditions, 'proposals', 'jobs'), false)
    assert.equal(isProposalsHubItemActive(usage, 'proposals', 'conditions'), false)
  })

  it('利用状況では利用状況だけactive', () => {
    assert.equal(isProposalsHubItemActive(usage, 'usage', 'conditions'), true)
    assert.equal(isProposalsHubItemActive(conditions, 'usage', 'conditions'), false)
  })
})
