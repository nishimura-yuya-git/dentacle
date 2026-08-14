import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  EMPTY_VISIT_MENU_FORM,
  applyMenu1EndTime,
  buildVisitMenuSnapshots,
  endTimeFromStartAndMenu,
  isVisitMenuEnabled,
  readVisitMenus,
  resolveManualVisitEndTime,
  visitMenuSelectOptions,
  visitMenusToForm,
  withVisitMenus,
} from './visitMenuState.ts'

describe('visitMenuState', () => {
  it('無いキーは ON。false だけ OFF', () => {
    assert.equal(isVisitMenuEnabled({}, 'first-visit'), true)
    assert.equal(isVisitMenuEnabled({ 'first-visit': false }, 'first-visit'), false)
    assert.equal(isVisitMenuEnabled({ 'first-visit': true }, 'first-visit'), true)
  })

  it('OFF の項目は選択肢から消える。選択中だけ残す', () => {
    const hidden = visitMenuSelectOptions({ extraction: false })
    assert.equal(hidden.some((option) => option.value === 'extraction'), false)
    const kept = visitMenuSelectOptions({ extraction: false }, 'extraction')
    assert.equal(kept.some((option) => option.value === 'extraction'), true)
    assert.equal(kept[0]?.label, '指定なし')
  })

  it('メニュー1の所要だけで終了時刻を決める', () => {
    assert.equal(endTimeFromStartAndMenu('10:30', 'first-visit'), '11:10')
    assert.equal(endTimeFromStartAndMenu('09:00', 'unknown'), null)
    const next = applyMenu1EndTime(
      { start_time: '10:00', end_time: '10:30', menu_1: '' },
      'oral-care',
    )
    assert.equal(next.end_time, '10:15')
    assert.equal(next.menu_1, 'oral-care')
  })

  it('メニュー1が無いときは患者標準など呼び出し側の終了を使う', () => {
    assert.equal(
      resolveManualVisitEndTime(
        { ...EMPTY_VISIT_MENU_FORM, start_time: '09:00', end_time: '09:30' },
        '09:45',
      ),
      '09:45',
    )
  })

  it('スナップショットは名称と分数を残し、マスタOFFでも読める', () => {
    const snapshots = buildVisitMenuSnapshots({
      menu_1: 'first-visit',
      menu_2: 'oral-care',
      menu_3: '',
      menu_sub: 'handover',
    })
    assert.deepEqual(snapshots, [
      {
        slot: '1',
        code: 'first-visit',
        name_snapshot: '初診',
        duration_minutes_snapshot: 40,
      },
      {
        slot: '2',
        code: 'oral-care',
        name_snapshot: '口腔ケア',
        duration_minutes_snapshot: 15,
      },
      {
        slot: 'sub',
        code: 'handover',
        name_snapshot: '引継ぎ有り',
        duration_minutes_snapshot: 15,
      },
    ])
    const metadata = withVisitMenus({ other: 1 }, snapshots)
    assert.equal(metadata.other, 1)
    const form = visitMenusToForm(readVisitMenus(metadata as never))
    assert.equal(form.menu_1, 'first-visit')
    assert.equal(form.menu_2, 'oral-care')
    assert.equal(form.menu_sub, 'handover')
  })
})
