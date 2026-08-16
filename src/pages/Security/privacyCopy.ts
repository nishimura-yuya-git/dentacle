import { APP_DISPLAY_NAME } from '../../config/appName.ts'
import {
  COMPLIANCE_DATA_REGION,
  COMPLIANCE_DELETION_STEPS,
  COMPLIANCE_INCIDENT_STEPS,
  COMPLIANCE_SUBPROCESSORS,
  formatSubprocessorLine,
} from '../../contracts/complianceAssets.contract.ts'
import type { SecuritySection } from './securityCopy.ts'

export const PRIVACY_HEADING = '個人情報の取り扱い'
export const PRIVACY_PATH = '/security/privacy'

export const PRIVACY_INTRO =
  `${APP_DISPLAY_NAME}は訪問歯科のスケジュール業務のために、医院から預かった患者情報と予約情報を扱います。利用目的を決めるのは医院です。${APP_DISPLAY_NAME}は受託して処理します。`

export const PRIVACY_SECTIONS: SecuritySection[] = [
  {
    id: 'purpose',
    title: '利用目的',
    paragraphs: [
      '訪問スケジュールの種まき、予約の表示と調整、自動提案、権限管理、障害対応です。',
      '広告のためのプロファイリングや、患者への直接販売には使いません。',
    ],
  },
  {
    id: 'items',
    title: '取り扱う情報',
    paragraphs: [
      '患者種まき（カルテ番号、氏名、担当医、最終来院日、診療回数、あとから育てる住所や訪問条件）、予約、所属、ログイン監査、操作ログです。',
      'レセコン取込では、生年月日、保険証、カルテ本文、レセプト、会計、点数は取りません。',
      '自動提案では、氏名・電話番号・生住所をAIへ送りません。',
    ],
  },
  {
    id: 'location',
    title: '保存場所',
    paragraphs: [
      `業務データの正は ${COMPLIANCE_DATA_REGION.provider} です。リージョンは ${COMPLIANCE_DATA_REGION.region}（${COMPLIANCE_DATA_REGION.regionLabelJa}）です。`,
      '国外に保存している事実を隠しません。医院との書面同意は、まだ締結前です。',
      '画面の公開URLは、この画面のドメインが正です。別の本番URLをここに固定していません。',
    ],
  },
  {
    id: 'processors',
    title: '委託先',
    paragraphs: [
      `${APP_DISPLAY_NAME}は、次の委託先に処理を再委託します。`,
      ...COMPLIANCE_SUBPROCESSORS.map((item) => formatSubprocessorLine(item)),
      '外部の監視サービスへ患者データを送りません。',
    ],
    linkGroupLabel: '委託先の方針',
    links: COMPLIANCE_SUBPROCESSORS.map((item) => ({
      href: item.policyUrl,
      label: `${item.name} のプライバシー`,
      external: true,
    })),
  },
  {
    id: 'consent',
    title: '同意の取り方',
    paragraphs: [
      'スタッフ個人向けの同意チェックをログイン画面には置きません。',
      '医院が患者情報の利用目的を決め、医院と Dentacle の契約で処理を委託します。スタッフは医院の指示で使います。',
    ],
  },
  {
    id: 'retention',
    title: '保管と削除',
    paragraphs: [
      '取り込んだ患者種まきと予約は、業務データとして残ります。アップロードしたCSVそのものは取込後に残しません。',
      'ログの保存年数と、契約終了後の削除期限は未決です。決まるまで、画面に年数を書きません。',
      ...COMPLIANCE_DELETION_STEPS,
      '画面からのアカウント自己削除は、現時点ではありません。削除は運営へ連絡してください。',
    ],
    callout: {
      title: '削除の依頼',
      body: '対象クリニックと消したい範囲を書いてください。患者氏名やカルテ番号を依頼文に載せないでください。',
      link: { href: '/feedback', label: 'ご意見・不具合から連絡する' },
    },
  },
  {
    id: 'incident',
    title: '事故が起きたとき',
    paragraphs: [
      '漏えい、紛失、不正アクセスを覚知した運営は、次の順で動かします。',
      ...COMPLIANCE_INCIDENT_STEPS,
      '医院への報告期限（何時間以内か）は未決です。公開の電話窓口は置いていません。',
    ],
    callout: {
      title: '連絡先',
      body: '院からはご意見画面、または契約している運営窓口へ連絡してください。',
      link: { href: '/feedback', label: 'ご意見・不具合を開く' },
    },
  },
  {
    id: 'rights',
    title: '開示・訂正・準拠の表示',
    paragraphs: [
      '患者本人からの開示請求は、まず医院が受けます。Dentacle は医院の指示で必要な範囲を出します。',
      '設計は厚生労働省と、経済産業省・総務省の事業者向けガイドラインを参照し、該当する管理策を取り入れます。監査が終わる前に準拠済みとは書きません。',
    ],
    links: [
      { href: '/security', label: '安全性を見る' },
      { href: '/security#rececon', label: 'レセコン連携の説明を見る' },
    ],
  },
]
