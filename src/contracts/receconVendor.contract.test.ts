import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  RECECON_ASSUMED_VENDOR,
  RECECON_ASSUMED_VENDOR_ID,
  RECECON_NHOSA_BLOCKED_UNTIL_CREDENTIALS,
  RECECON_NHOSA_NOW_READY,
  RECECON_VENDOR_NAMES_FORBIDDEN_ON_CLINIC_UI,
  clinicFacingRececonLabel,
  isRececonVendorId,
} from './receconVendor.contract.ts'

const here = dirname(fileURLToPath(import.meta.url))

function readRepo(relativeFromContracts: string): string {
  return readFileSync(join(here, relativeFromContracts), 'utf8')
}

describe('receconVendor.contract', () => {
  it('想定ベンダーはノーザで、院向けラベルはレセコンだけにする', () => {
    assert.equal(RECECON_ASSUMED_VENDOR_ID, 'nhosa')
    assert.equal(RECECON_ASSUMED_VENDOR.legalNameJa, '株式会社ノーザ')
    assert.equal(RECECON_ASSUMED_VENDOR.colloquialJa, 'ノーズ')
    assert.equal(clinicFacingRececonLabel(), 'レセコン')
    assert.equal(isRececonVendorId('nhosa'), true)
    assert.equal(isRececonVendorId('other'), false)
    assert.equal(RECECON_NHOSA_NOW_READY.identityColumns, true)
    assert.equal(RECECON_NHOSA_NOW_READY.securityContract, true)
    assert.equal(RECECON_NHOSA_BLOCKED_UNTIL_CREDENTIALS.liveApiClient, true)
  })

  it('院向け安全性・ヘルプ・取込にベンダー製品名を出さない', () => {
    const clinicFacing = [
      readRepo('../pages/Security/securityCopy.ts'),
      readRepo('../pages/Help/helpCopy.ts'),
      readRepo('../pages/Import/PatientImportPage.tsx'),
    ].join('\n')

    for (const name of RECECON_VENDOR_NAMES_FORBIDDEN_ON_CLINIC_UI) {
      assert.equal(
        clinicFacing.includes(name),
        false,
        `院向けに ${name} を出してはならない`,
      )
    }
  })

  it('取込画面はAPIの代わりという先送り文を書かない', () => {
    const importPage = readRepo('../pages/Import/PatientImportPage.tsx')
    assert.equal(importPage.includes('当面はレセコンAPI連携の代わり'), false)
    assert.match(importPage, /導入に備え/)
  })
})
