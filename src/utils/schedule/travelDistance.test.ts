import assert from 'node:assert/strict'
import {
  buildSparseTravelMinutesMatrix,
  buildTravelMinutesMatrix,
  haversineKm,
  hasUsableAddress,
  travelMinutesBetween,
  SAME_FACILITY_MINUTES,
  SAME_AREA_MINUTES,
  DEFAULT_CROSS_AREA_MINUTES,
} from './travelDistance.ts'

{
  assert.equal(hasUsableAddress(' 東京都 '), true)
  assert.equal(hasUsableAddress(''), false)
  assert.equal(hasUsableAddress(null), false)
}

{
  const km = haversineKm(35.6812, 139.7671, 35.6895, 139.6917)
  assert.ok(km > 4 && km < 10)
}

{
  const a = {
    patientId: 'p1',
    facilityId: 'f1',
    areaLabel: '北区',
    latitude: null,
    longitude: null,
  }
  const b = {
    patientId: 'p2',
    facilityId: 'f1',
    areaLabel: '北区',
    latitude: null,
    longitude: null,
  }
  const c = {
    patientId: 'p3',
    facilityId: null,
    areaLabel: '南区',
    latitude: null,
    longitude: null,
  }
  assert.equal(travelMinutesBetween(a, b), SAME_FACILITY_MINUTES)
  assert.equal(
    travelMinutesBetween(
      { ...a, facilityId: null },
      { ...b, facilityId: null },
    ),
    SAME_AREA_MINUTES,
  )
  assert.equal(travelMinutesBetween(a, c), DEFAULT_CROSS_AREA_MINUTES)
}

{
  const matrix = buildTravelMinutesMatrix([
    {
      patientId: 'p1',
      facilityId: null,
      areaLabel: 'A',
      latitude: 35.68,
      longitude: 139.76,
    },
    {
      patientId: 'p2',
      facilityId: null,
      areaLabel: 'A',
      latitude: 35.69,
      longitude: 139.75,
    },
  ])
  assert.equal(matrix.p1.p1, 0)
  assert.ok(matrix.p1.p2 >= 5)
  assert.equal(matrix.p1.p2, matrix.p2.p1)
}

{
  const locations = [
    {
      patientId: 'p1',
      facilityId: null,
      areaLabel: 'A',
      latitude: null,
      longitude: null,
    },
    {
      patientId: 'p2',
      facilityId: null,
      areaLabel: 'A',
      latitude: null,
      longitude: null,
    },
    {
      patientId: 'p3',
      facilityId: null,
      areaLabel: 'B',
      latitude: null,
      longitude: null,
    },
  ]
  const sparse = buildSparseTravelMinutesMatrix(locations, 1)
  assert.equal(Object.keys(sparse.p1).length, 1)
  assert.equal(sparse.p1.p2, SAME_AREA_MINUTES)
  assert.equal(sparse.p1.p3, undefined)
}

console.log('travelDistance.test.ts: ok')
