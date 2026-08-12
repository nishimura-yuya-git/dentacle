import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  AUTH_AUDIT_PIN_OVERSEAS,
  AUTH_AUDIT_PIN_UNKNOWN,
  clusterAuthAuditMapPins,
  resolveAuthAuditMapPin,
} from './resolveAuthAuditMapPin.ts'

describe('resolveAuthAuditMapPin', () => {
  it('大阪府は都道府県ピンになる', () => {
    const pin = resolveAuthAuditMapPin({
      label: '日本・大阪府（推定）',
      country: '日本',
      region: '大阪府',
      city: '大阪市',
    })
    assert.equal(pin.key, 'osaka')
    assert.equal(pin.kind, 'prefecture')
    assert.equal(pin.isAnomaly, false)
  })

  it('海外は異常ピンになる', () => {
    const pin = resolveAuthAuditMapPin({
      label: 'United States・California（推定）',
      country: 'United States',
      region: 'California',
      city: 'Mountain View',
    })
    assert.equal(pin.key, AUTH_AUDIT_PIN_OVERSEAS)
    assert.equal(pin.isAnomaly, true)
  })

  it('空 Geo は推定不可', () => {
    const pin = resolveAuthAuditMapPin({
      label: '—',
      country: null,
      region: null,
      city: null,
    })
    assert.equal(pin.key, AUTH_AUDIT_PIN_UNKNOWN)
    assert.equal(pin.isAnomaly, false)
  })
})

describe('clusterAuthAuditMapPins', () => {
  it('同一都道府県を件数集約する', () => {
    const clusters = clusterAuthAuditMapPins([
      { pin_key: 'osaka', region_label: '日本・大阪府（推定）', is_anomaly: false },
      { pin_key: 'osaka', region_label: '日本・大阪府（推定）', is_anomaly: false },
      { pin_key: AUTH_AUDIT_PIN_OVERSEAS, region_label: 'US', is_anomaly: true },
    ])
    const osaka = clusters.find((c) => c.key === 'osaka')
    const overseas = clusters.find((c) => c.key === AUTH_AUDIT_PIN_OVERSEAS)
    assert.equal(osaka?.count, 2)
    assert.equal(overseas?.count, 1)
    assert.equal(overseas?.isAnomaly, true)
  })
})
