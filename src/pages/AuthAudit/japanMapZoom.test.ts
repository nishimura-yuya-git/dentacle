import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  JAPAN_MAP_FULL_VIEWBOX,
  JAPAN_MAP_REGION_OPTIONS,
  expandSvgViewBoxSouth,
  formatSvgViewBox,
  resolveJapanMapZoomSelector,
} from './japanMapZoom.ts'

describe('japanMapZoom', () => {
  it('地方オプションに全国・データ範囲・近畿がある', () => {
    const ids = JAPAN_MAP_REGION_OPTIONS.map((option) => option.id)
    assert.ok(ids.includes('all'))
    assert.ok(ids.includes('auto'))
    assert.ok(ids.includes('kinki'))
  })

  it('viewBox 文字列を整形する', () => {
    assert.equal(formatSvgViewBox({ x: 10, y: 20, width: 100, height: 200 }), '10 20 100 200')
    assert.equal(JAPAN_MAP_FULL_VIEWBOX, '0 0 1000 1000')
  })

  it('九州・沖縄のズームは沖縄・鹿児島を外接に含めない', () => {
    const kyushu = JAPAN_MAP_REGION_OPTIONS.find((option) => option.id === 'kyushu')
    assert.ok(kyushu)
    const zoom = resolveJapanMapZoomSelector(kyushu)
    assert.ok(zoom)
    assert.match(zoom, /fukuoka/)
    assert.match(zoom, /miyazaki/)
    assert.doesNotMatch(zoom, /okinawa/)
    assert.doesNotMatch(zoom, /kagoshima/)
    assert.doesNotMatch(zoom, /kyushu-okinawa/)
  })

  it('南方向に viewBox を広げられる', () => {
    const next = expandSvgViewBoxSouth({ x: 0, y: 10, width: 100, height: 100 }, 0.2)
    assert.equal(next.height, 120)
    assert.equal(next.y, 10)
  })
})
