/**
 * 監査に出すための処理実態。準拠済みの判定は持たない。
 * 院向け文言は privacyCopy / securityCopy。未決の年数は人間が決める。
 */

export const COMPLIANCE_CONTROLLER = 'clinic' as const
export const COMPLIANCE_PROCESSOR = 'dentacle' as const

export const COMPLIANCE_CONSENT_MODEL = 'clinic_contract' as const

export const COMPLIANCE_DATA_REGION = {
  provider: 'Supabase',
  region: 'ap-southeast-1',
  regionLabelJa: 'アジア太平洋（シンガポール）',
  productionUrl: null,
} as const

export type ComplianceSubprocessor = {
  name: string
  purposeJa: string
  dataJa: string
  regionJa: string
  policyUrl: string
}

export const COMPLIANCE_SUBPROCESSORS: readonly ComplianceSubprocessor[] = [
  {
    name: 'Supabase',
    purposeJa: '認証、データベース、保存時暗号化',
    dataJa: '患者種まき、予約、所属、監査ログ',
    regionJa: 'アジア太平洋（シンガポール）',
    policyUrl: 'https://supabase.com/privacy',
  },
  {
    name: 'Vercel',
    purposeJa: '画面とサーバーレスAPIの配信',
    dataJa: '接続ログ、リクエスト',
    regionJa: '配信拠点は利用状況による',
    policyUrl: 'https://vercel.com/legal/privacy-policy',
  },
  {
    name: 'Cursor',
    purposeJa: '自動提案の裏処理',
    dataJa: '患者IDと割付制約。氏名・電話・生住所は送らない',
    regionJa: '利用先の方針による',
    policyUrl: 'https://cursor.com/privacy',
  },
  {
    name: 'GitHub',
    purposeJa: 'ご意見・不具合の記録',
    dataJa: 'スタッフが書いた本文。患者氏名やカルテ番号は載せない',
    regionJa: '利用先の方針による',
    policyUrl: 'https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement',
  },
  {
    name: 'Google Fonts',
    purposeJa: '画面フォント',
    dataJa: 'ブラウザが直接取得する接続元情報',
    regionJa: 'Google の配信拠点',
    policyUrl: 'https://policies.google.com/privacy',
  },
] as const

export type ComplianceDecisionStatus = 'pending' | 'approved'

export type CompliancePendingDecision = {
  id: string
  titleJa: string
  status: ComplianceDecisionStatus
  whyAuditNeedsIt: string
  recommendedJa: string
  approvedValue: string | null
}

/** 監査を通すために人間が決める項目。推奨は案であり承認ではない。 */
export const COMPLIANCE_PENDING_DECISIONS: readonly CompliancePendingDecision[] = [
  {
    id: 'access_log_retention_years',
    titleJa: 'ログイン監査・操作ログの保存年数',
    status: 'pending',
    whyAuditNeedsIt:
      '厚労省ガイドラインは年数を機関が運用管理規程で定めることを求める。法令で何年と決まってはいない。',
    recommendedJa: '5年（インシデント調査と定期監査に耐える案）',
    approvedValue: null,
  },
  {
    id: 'patient_seed_retention',
    titleJa: '患者種まきの保持と契約終了後の削除期限',
    status: 'pending',
    whyAuditNeedsIt:
      '種まきは診療録の法定保存（医師法の5年など）とは別。医院との契約で決める。',
    recommendedJa: '利用中は保持。契約終了または削除指示から90日以内に削除',
    approvedValue: null,
  },
  {
    id: 'overseas_processing_consent',
    titleJa: '国外保存（シンガポール）の書面同意',
    status: 'pending',
    whyAuditNeedsIt:
      'データベース所在地は ap-southeast-1。国外保存を隠さず、医院の書面同意と契約条項が要る。',
    recommendedJa: 'データ処理契約に所在地を明記し、医院管理者の同意を残す',
    approvedValue: null,
  },
  {
    id: 'dpa_signature',
    titleJa: 'データ処理契約の署名',
    status: 'pending',
    whyAuditNeedsIt: '案文書だけでは受託契約にならない。医院と Dentacle の署名が要る。',
    recommendedJa: 'docs/compliance/データ処理契約案.md を法務確認のうえ締結',
    approvedValue: null,
  },
  {
    id: 'guideline_review_signoff',
    titleJa: 'ガイドライン突合の合格判定',
    status: 'pending',
    whyAuditNeedsIt: '項目ごとの実装は示せる。合格／対象外の判定と承認者は人間が書く。',
    recommendedJa: '突合表を突合し、承認者と日付を残してから準拠済みを検討する',
    approvedValue: null,
  },
  {
    id: 'incident_report_deadline',
    titleJa: '事故の医院への報告期限',
    status: 'pending',
    whyAuditNeedsIt: '手順は書ける。何時間以内に連絡するかは契約で決める。',
    recommendedJa: '覚知後すみやかに連絡。期限は契約で固定（例: 24時間以内）',
    approvedValue: null,
  },
] as const

export const COMPLIANCE_DELETION_STEPS = [
  '医院管理者または運営が、対象クリニックと削除範囲を確認する',
  '患者種まき・予約・所属など、依頼された業務データを消す',
  '取込CSVそのものは取込後に残していないので、追加削除はない',
  '操作ログとログイン監査は件数中心。保存年数が決まるまで自動では消さない',
  '完了を依頼者へ報告する',
] as const

export const COMPLIANCE_INCIDENT_STEPS = [
  '覚知した運営は、影響範囲（クリニック、データ種別、件数の見積もり）を切り分ける',
  '対象医院の管理者へ、事実・見積もり・次の行動を連絡する',
  '必要なら委託先（Supabase / Vercel / Cursor / GitHub）の記録を保全する',
  '再発防止を実施し、医院へ結果を報告する',
] as const

export function isComplianceDecisionApproved(
  decision: CompliancePendingDecision,
): boolean {
  return decision.status === 'approved' && decision.approvedValue !== null
}

export function listUnresolvedComplianceDecisions(): CompliancePendingDecision[] {
  return COMPLIANCE_PENDING_DECISIONS.filter((item) => !isComplianceDecisionApproved(item))
}

export function formatSubprocessorLine(item: ComplianceSubprocessor): string {
  return `${item.name}（${item.purposeJa}）。取り扱うもの: ${item.dataJa}。所在: ${item.regionJa}`
}
