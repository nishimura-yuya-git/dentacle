import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  SETTINGS_HUB_NAV,
  isSettingsHubItemActive,
} from './settingsHub.ts'

describe('SETTINGS_HUB_NAV', () => {
  it('導入タイプ・チーム・担当・稼働枠の4つで、長い説明見出しは置かない', () => {
    assert.deepEqual(
      SETTINGS_HUB_NAV.map((item) => item.label),
      ['導入タイプ', 'チーム', '担当', '稼働枠'],
    )
    assert.equal(
      SETTINGS_HUB_NAV.some((item) => item.label.includes('・')),
      false,
    )
  })
})

describe('isSettingsHubItemActive', () => {
  it('選択中セクションだけ active', () => {
    const lane = SETTINGS_HUB_NAV[0]
    const teams = SETTINGS_HUB_NAV[1]
    assert.equal(isSettingsHubItemActive(lane, 'lane'), true)
    assert.equal(isSettingsHubItemActive(lane, 'teams'), false)
    assert.equal(isSettingsHubItemActive(teams, 'teams'), true)
  })
})
