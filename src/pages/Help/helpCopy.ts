import { APP_DISPLAY_NAME } from '../../config/appName.ts'

/** ヘルプFAQの文言 SSoT。項目を足すときはこの配列に追加する。事実は Dentacle。 */

export const HELP_HEADING = 'ヘルプ'

export type HelpLink = {
  href: string
  label: string
  external?: boolean
}

export type HelpFaqItem = {
  id: string
  question: string
  paragraphs: string[]
  bullets?: string[]
  links?: HelpLink[]
}

export type HelpSection = {
  id: string
  title: string
  items: HelpFaqItem[]
}

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'faq',
    title: 'よくある質問',
    items: [
      {
        id: 'what',
        question: `${APP_DISPLAY_NAME}って何？`,
        paragraphs: [
          `${APP_DISPLAY_NAME}は、訪問歯科のルート最適化をAIと掛け合わせ、ボタン操作で1日の訪問スケジュール案を生成するシステムです。`,
        ],
      },
      {
        id: 'who',
        question: '誰が使えますか？',
        paragraphs: [
          '管理者、訪問コーディネーター、受付・コール担当、医師、歯科衛生士が使う想定です。',
          '画面から見える範囲は、所属クリニックの権限で決まります。',
        ],
      },
      {
        id: 'env',
        question: 'どの環境で使えますか？',
        paragraphs: [
          'ブラウザがあれば利用できます。特別なデスクトップアプリは不要です。',
        ],
      },
      {
        id: 'visibility',
        question: '他院のデータは見えますか？',
        paragraphs: [
          '画面から見える範囲は、所属クリニック単位の行レベルセキュリティで制限します。他院の患者や予約は、一般スタッフには見えません。',
          `${APP_DISPLAY_NAME}運営は障害対応や導入支援のため、全クリニックを横断して閲覧できます。運営と院の管理者は別の権限です。`,
        ],
      },
      {
        id: 'propose',
        question: '自動提案は何をしますか？',
        paragraphs: [
          '対象日の訪問スケジュール案を作ります。',
          '自動提案では、氏名・電話番号・生住所をAIへ送りません。患者IDと、割付に必要な制約・距離情報を送ります。',
        ],
      },
      {
        id: 'rececon',
        question: 'レセコンと連携しますか？',
        paragraphs: [
          'レセコン本体への常時接続やAPI直結は行いません。院内で書き出した個人別全集計のCSVを、訪問スケジュールの種まきに使います。',
        ],
        links: [
          { href: '/import', label: '患者CSV取込を開く' },
          { href: '/security#rececon', label: 'レセコン連携の説明を見る' },
        ],
      },
    ],
  },
  {
    id: 'billing',
    title: 'お支払い・契約',
    items: [
      {
        id: 'payment',
        question: '支払い方法は？',
        paragraphs: [
          'お支払いは銀行振替を想定しています。カード番号は取り扱わず、サーバーにも保存しません。',
          'オンラインのカード決済は使っていません。',
        ],
      },
      {
        id: 'contract',
        question: '契約情報はどこで見ますか？',
        paragraphs: [
          'アカウントメニューの契約者情報、お支払い履歴、契約情報から開けます。現時点では準備中の画面があります。',
        ],
        links: [
          { href: '/account/contractor', label: '契約者情報' },
          { href: '/account/payments', label: 'お支払い履歴' },
          { href: '/account/contract', label: '契約情報' },
        ],
      },
    ],
  },
  {
    id: 'trouble',
    title: '困ったとき',
    items: [
      {
        id: 'network',
        question: '通信エラーになるときは？',
        paragraphs: [
          'VPN、プロキシ、EDR、URLフィルタリング環境では、通信が遮断されることがあります。',
          'セキュリティ機能を無効化せず、IT担当者向けのネットワーク許可設定を確認してください。',
        ],
        links: [{ href: '/security/network', label: 'ネットワーク許可設定を見る' }],
      },
      {
        id: 'safety',
        question: 'データの安全性は？',
        paragraphs: [
          '患者情報と予約情報を守ることを最優先にしています。保存範囲と権限の詳細は、安全性のページを見てください。',
        ],
        links: [{ href: '/security', label: '安全性を見る' }],
      },
      {
        id: 'feedback',
        question: 'ご意見や不具合はどう送りますか？',
        paragraphs: [
          '右下のご意見ボタン、またはご意見・不具合の画面から送れます。',
          '患者氏名やカルテ番号は載せないでください。',
        ],
        links: [{ href: '/feedback', label: 'ご意見・不具合を開く' }],
      },
    ],
  },
]

export function collectHelpFaqIds(sections: readonly HelpSection[]): string[] {
  return sections.flatMap((section) => section.items.map((item) => item.id))
}
