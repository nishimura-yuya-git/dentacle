/**
 * ガイドライン項目と実装の突合。合格判定は持たない。
 * 参照版は第6.0版と事業者向けGL。3省2だけを正にしない。
 */

export const GUIDELINE_STANCE = 'design_to_comply' as const

export const GUIDELINE_EDITIONS = [
  {
    id: 'mhlw-6.0',
    titleJa: '厚生労働省『医療情報システムの安全管理に関するガイドライン』第6.0版',
  },
  {
    id: 'meti-mic-provider',
    titleJa:
      '経済産業省・総務省『医療情報を取り扱う情報システム・サービスの提供事業者における安全管理ガイドライン』',
  },
] as const

export const GUIDELINE_ROW_STATUSES = [
  'implemented_design',
  'pending_decision',
  'pending_review',
  'out_of_scope',
] as const
export type GuidelineRowStatus = (typeof GUIDELINE_ROW_STATUSES)[number]

export type GuidelineMappingRow = {
  id: string
  source: (typeof GUIDELINE_EDITIONS)[number]['id']
  topicJa: string
  ourControlJa: string
  evidence: string
  status: GuidelineRowStatus
}

export const GUIDELINE_MAPPING_ROWS: readonly GuidelineMappingRow[] = [
  {
    id: 'mhlw-min-collection',
    source: 'mhlw-6.0',
    topicJa: '取得する情報の最小化',
    ourControlJa: '種まき列だけ取る。生年月日・保険証・カルテ本文・レセプトは取らない',
    evidence: 'src/contracts/receconIntegration.contract.ts',
    status: 'implemented_design',
  },
  {
    id: 'mhlw-access-control',
    source: 'mhlw-6.0',
    topicJa: 'アクセス制御',
    ourControlJa: 'クリニック単位のRLS。運営と院管理者を混同しない',
    evidence: 'src/pages/Security/securityCopy.ts#data',
    status: 'implemented_design',
  },
  {
    id: 'mhlw-transport-encrypt',
    source: 'mhlw-6.0',
    topicJa: '通信の暗号化',
    ourControlJa: '画面はHTTPS。レセコン接続はTLS 1.3、443、DBポート禁止',
    evidence: 'src/contracts/receconIntegration.contract.ts',
    status: 'implemented_design',
  },
  {
    id: 'mhlw-at-rest-encrypt',
    source: 'mhlw-6.0',
    topicJa: '保存時の暗号化',
    ourControlJa: 'Supabase の保存時暗号化とSSL強制',
    evidence: 'src/pages/Security/securityCopy.ts#infra',
    status: 'implemented_design',
  },
  {
    id: 'mhlw-access-log',
    source: 'mhlw-6.0',
    topicJa: 'アクセスログの記録',
    ourControlJa: 'ログイン監査と操作ログを分ける。取込は件数・成否だけ',
    evidence: 'src/features/patientImport/receconImportPolicy.ts',
    status: 'implemented_design',
  },
  {
    id: 'mhlw-log-retention',
    source: 'mhlw-6.0',
    topicJa: 'ログ保存期間を運用管理規程で定める',
    ourControlJa: 'ログイン監査と操作ログは5年。改ざん防止。運営のみ',
    evidence: 'src/contracts/complianceAssets.contract.ts',
    status: 'implemented_design',
  },
  {
    id: 'mhlw-overseas',
    source: 'mhlw-6.0',
    topicJa: '外部保存・国外保存の説明',
    ourControlJa: '所在地はシンガポール（ap-southeast-1）。書面同意は今取る（先送りしない）',
    evidence: 'src/contracts/complianceAssets.contract.ts',
    status: 'pending_decision',
  },
  {
    id: 'mhlw-incident',
    source: 'mhlw-6.0',
    topicJa: '事故時の連絡と記録',
    ourControlJa: '覚知から24時間以内に対象医院の管理者へ連絡する',
    evidence: 'docs/compliance/インシデント対応.md',
    status: 'implemented_design',
  },
  {
    id: 'mhlw-explain',
    source: 'mhlw-6.0',
    topicJa: '利用者への説明',
    ourControlJa: '安全性・個人情報の取り扱い・ヘルプに事実を書く',
    evidence: 'src/pages/Security/privacyCopy.ts',
    status: 'implemented_design',
  },
  {
    id: 'mhlw-third-party-ai',
    source: 'mhlw-6.0',
    topicJa: '第三者処理の範囲',
    ourControlJa: '自動提案はIDと制約だけ。氏名・電話・生住所は送らない',
    evidence: 'src/pages/Security/securityCopy.ts#ai',
    status: 'implemented_design',
  },
  {
    id: 'mhlw-rececon-path',
    source: 'mhlw-6.0',
    topicJa: '外部システム接続の経路制限',
    ourControlJa: '許可相手・443・エージェント直結禁止。ライブ接続は未開通',
    evidence: 'src/contracts/receconIntegration.contract.ts',
    status: 'implemented_design',
  },
  {
    id: 'mhlw-medical-record-years',
    source: 'mhlw-6.0',
    topicJa: '診療録の法定保存',
    ourControlJa: 'Dentacleは診療録を持たない。種まきと予約だけ',
    evidence: 'src/contracts/receconIntegration.contract.ts',
    status: 'out_of_scope',
  },
  {
    id: 'provider-subprocessors',
    source: 'meti-mic-provider',
    topicJa: '再委託先の明示',
    ourControlJa: '委託先一覧を個人情報の取り扱いに出す',
    evidence: 'src/contracts/complianceAssets.contract.ts',
    status: 'implemented_design',
  },
  {
    id: 'provider-dpa',
    source: 'meti-mic-provider',
    topicJa: '委託契約（処理の取り決め）',
    ourControlJa: '案は用意。署名は今取る（先送りしない）',
    evidence: 'docs/compliance/データ処理契約案.md',
    status: 'pending_decision',
  },
  {
    id: 'provider-location',
    source: 'meti-mic-provider',
    topicJa: 'データ所在地の明示',
    ourControlJa: 'Supabase ap-southeast-1 を院向けに書く',
    evidence: 'src/pages/Security/privacyCopy.ts',
    status: 'implemented_design',
  },
  {
    id: 'provider-claim',
    source: 'meti-mic-provider',
    topicJa: '準拠済みの対外表示',
    ourControlJa: '監査前は書かない',
    evidence: 'src/contracts/receconIntegration.contract.ts',
    status: 'out_of_scope',
  },
] as const

export function listGuidelineRowsByStatus(
  status: GuidelineRowStatus,
): GuidelineMappingRow[] {
  return GUIDELINE_MAPPING_ROWS.filter((row) => row.status === status)
}

export function hasGuidelineCompliantClaim(): false {
  return false
}
