import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatIpRegionLabel, isLookupablePublicIp } from './lookupIpRegion.ts'

describe('isLookupablePublicIp', () => {
  it('プライベートIPは対象外', () => {
    assert.equal(isLookupablePublicIp('10.0.0.1'), false)
    assert.equal(isLookupablePublicIp('192.168.1.1'), false)
    assert.equal(isLookupablePublicIp('172.16.0.1'), false)
  })

  it('公衆IPは対象', () => {
    assert.equal(isLookupablePublicIp('14.10.160.195'), true)
  })
})

describe('formatIpRegionLabel', () => {
  it('日本・大阪府の推定ラベルを作る', () => {
    assert.equal(
      formatIpRegionLabel({ country: '日本', region: '大阪府', city: '大阪市' }),
      '日本・大阪府（推定）',
    )
  })

  it('海外は都市まで含めてよい', () => {
    assert.equal(
      formatIpRegionLabel({ country: 'United States', region: 'California', city: 'Mountain View' }),
      'United States・California・Mountain View（推定）',
    )
  })
})
