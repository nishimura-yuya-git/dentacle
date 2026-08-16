import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  COMPLIANCE_CONSENT_MODEL,
  COMPLIANCE_CONTROLLER,
  COMPLIANCE_DATA_REGION,
  COMPLIANCE_PENDING_DECISIONS,
  COMPLIANCE_PROCESSOR,
  COMPLIANCE_SUBPROCESSORS,
  formatSubprocessorLine,
  listUnresolvedComplianceDecisions,
} from './complianceAssets.contract.ts'
import { PRIVACY_SECTIONS } from '../pages/Security/privacyCopy.ts'
import { SECURITY_SECTIONS } from '../pages/Security/securityCopy.ts'

describe('complianceAssets.contract', () => {
  it('医院が利用目的を決め、Dentacleは受託。同意は院契約でありログイン画面ではない', () => {
    assert.equal(COMPLIANCE_CONTROLLER, 'clinic')
    assert.equal(COMPLIANCE_PROCESSOR, 'dentacle')
    assert.equal(COMPLIANCE_CONSENT_MODEL, 'clinic_contract')
  })

  it('保存場所はシンガポールで、本番URLは未確定のままにする', () => {
    assert.equal(COMPLIANCE_DATA_REGION.region, 'ap-southeast-1')
    assert.match(COMPLIANCE_DATA_REGION.regionLabelJa, /シンガポール/)
    assert.equal(COMPLIANCE_DATA_REGION.productionUrl, null)
  })

  it('委託先に監視SaaSを足さず、未決の年数は承認済みにしない', () => {
    const names = COMPLIANCE_SUBPROCESSORS.map((item) => item.name)
    assert.deepEqual(names, ['Supabase', 'Vercel', 'Cursor', 'GitHub', 'Google Fonts'])
    assert.equal(names.some((name) => /Datadog|Sentry/i.test(name)), false)
    assert.equal(listUnresolvedComplianceDecisions().length, COMPLIANCE_PENDING_DECISIONS.length)
    assert.ok(COMPLIANCE_PENDING_DECISIONS.every((item) => item.approvedValue === null))
  })

  it('院向け個人情報・安全性は所在地と委託先を書き、準拠済みとは書かない', () => {
    const joined = [...PRIVACY_SECTIONS, ...SECURITY_SECTIONS]
      .flatMap((section) => section.paragraphs)
      .join('\n')
    assert.match(joined, /シンガポール/)
    assert.match(joined, /Supabase/)
    assert.match(joined, /Vercel/)
    assert.match(formatSubprocessorLine(COMPLIANCE_SUBPROCESSORS[0]), /Supabase/)
    assert.equal(/準拠しています/.test(joined), false)
    assert.equal(/準拠したデータ運用/.test(joined), false)
  })
})
