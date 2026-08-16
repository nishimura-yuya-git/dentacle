import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  RECECON_ACCESS_LOG_POLICY,
  RECECON_ALLOWED_APP_PORTS,
  RECECON_CREDENTIAL_POLICY,
  RECECON_CURRENT_CONNECTION_MODE,
  RECECON_DEFAULT_ACCESS,
  RECECON_GUIDELINE_STANCE,
  RECECON_MIN_TLS_VERSION,
  RECECON_RESPONSIBILITY,
  RECECON_WRITE_REQUIRES_SEPARATE_CONTRACT,
  isClinicLanEntryForeverForbidden,
  isRececonFieldAllowed,
  isRececonFieldForbidden,
  isRececonNetworkPlanCompliant,
} from './receconIntegration.contract.ts'

const here = dirname(fileURLToPath(import.meta.url))

function readRepo(relativeFromContracts: string): string {
  return readFileSync(join(here, relativeFromContracts), 'utf8')
}

describe('receconIntegration.contract', () => {
  it('医院LANに入らないことは永久禁止ではなく、導入に備えた接続はTLS1.3と443に限る', () => {
    assert.equal(isClinicLanEntryForeverForbidden(), false)
    assert.equal(RECECON_CURRENT_CONNECTION_MODE, 'clinic_csv_export')
    assert.equal(RECECON_MIN_TLS_VERSION, '1.3')
    assert.deepEqual(RECECON_ALLOWED_APP_PORTS, [443])

    assert.equal(
      isRececonNetworkPlanCompliant({
        mode: 'clinic_csv_export',
        tlsVersion: null,
        ports: [],
        allowlist: 'none',
        opensDatabasePort: false,
        agentDirect: false,
      }).ok,
      true,
    )

    const securedOk = isRececonNetworkPlanCompliant({
      mode: 'vpn_or_closed_network',
      tlsVersion: '1.3',
      ports: [443],
      allowlist: 'vpn_closed',
      opensDatabasePort: false,
      agentDirect: false,
    })
    assert.equal(securedOk.ok, true)

    const dbPort = isRececonNetworkPlanCompliant({
      mode: 'tls_https_api',
      tlsVersion: '1.3',
      ports: [443, 5432],
      allowlist: 'ip',
      opensDatabasePort: true,
      agentDirect: false,
    })
    assert.equal(dbPort.ok, false)
    assert.ok(dbPort.reasons.some((reason) => reason.includes('データベース')))

    const noTls = isRececonNetworkPlanCompliant({
      mode: 'clinic_side_connector',
      tlsVersion: '1.2',
      ports: [443],
      allowlist: 'ip',
      opensDatabasePort: false,
      agentDirect: false,
    })
    assert.equal(noTls.ok, false)
  })

  it('取込範囲は種まき列だけ。保険証・カルテ本文・レセプトは禁止。既定は参照のみ', () => {
    assert.equal(isRececonFieldAllowed('chartNumber'), true)
    assert.equal(isRececonFieldAllowed('lastVisitDate'), true)
    assert.equal(isRececonFieldForbidden('insuranceNumber'), true)
    assert.equal(isRececonFieldForbidden('birthDate'), true)
    assert.equal(isRececonFieldForbidden('chartBody'), true)
    assert.equal(isRececonFieldForbidden('receiptId'), true)
    assert.equal(RECECON_DEFAULT_ACCESS, 'read')
    assert.equal(RECECON_WRITE_REQUIRES_SEPARATE_CONTRACT, true)
    assert.equal(RECECON_CREDENTIAL_POLICY.storeInBrowser, false)
    assert.equal(RECECON_CREDENTIAL_POLICY.giveToAgent, false)
    assert.equal(RECECON_ACCESS_LOG_POLICY.includeChartNumber, false)
    assert.equal(RECECON_ACCESS_LOG_POLICY.retentionYears, 5)
    assert.equal(RECECON_GUIDELINE_STANCE, 'design_to_comply')
    assert.equal(RECECON_RESPONSIBILITY.clinicLanInterior, 'clinic')
    assert.equal(RECECON_RESPONSIBILITY.securedLinkCloudEndpoint, 'dentacle')
  })

  it('院向け安全性・ヘルプは5項目を書き、準拠済みや医院LAN永久禁止にしない', () => {
    const security = readRepo('../pages/Security/securityCopy.ts')
    const help = readRepo('../pages/Help/helpCopy.ts')
    const joined = `${security}\n${help}`

    assert.match(joined, /TLS 1\.3/)
    assert.match(joined, /443/)
    assert.match(joined, /VPN/)
    assert.match(joined, /閉域/)
    assert.match(joined, /データベースの接続ポートは開きません/)
    assert.match(joined, /参照/)
    assert.match(joined, /書き込みは、別契約/)
    assert.match(joined, /保険証/)
    assert.match(joined, /暗号化/)
    assert.match(joined, /CSVそのものは取込後に残しません/)
    assert.match(joined, /医院側終端/)
    assert.match(joined, /医療情報システムの安全管理に関するガイドライン/)
    assert.equal(/準拠しています/.test(joined), false)
    assert.equal(/準拠したデータ運用/.test(joined), false)
    assert.equal(/医院LANへ常時入る接続は行いません。/.test(joined), false)
    assert.match(joined, /医院LANに入らないことが前提ではありません/)
    assert.match(joined, /導入に備え/)
    assert.equal(/将来レセコンと接続する場合/.test(joined), false)
  })
})
