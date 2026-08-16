import { APP_DISPLAY_NAME } from '../../config/appName.ts'

/** 安全性ページの文言 SSoT。Nani の骨格に合わせ、事実は Dentacle の実装に合わせる。 */

export const SECURITY_HEADING = `${APP_DISPLAY_NAME}の安全性`
export const SECURITY_NETWORK_TITLE = 'ネットワーク許可設定'

export const SECURITY_INTRO =
  `${APP_DISPLAY_NAME}は訪問歯科のスケジュール業務を扱うシステムです。患者情報と予約情報を守ることを最優先に、設計・開発から運用までの対策を継続的に見直しています。`

export type SecurityLink = {
  href: string
  label: string
  external?: boolean
}

export type SecurityCallout = {
  title: string
  body: string
  link: SecurityLink
}

export type SecuritySection = {
  id: string
  title: string
  paragraphs: string[]
  callout?: SecurityCallout
  linkGroupLabel?: string
  links?: SecurityLink[]
}

export const SECURITY_NETWORK_CALLOUT_TITLE = '企業ネットワークで利用する場合'

export const SECURITY_SECTIONS: SecuritySection[] = [
  {
    id: 'data',
    title: 'データの取り扱い',
    paragraphs: [
      '患者・予約・所属などの業務データは、クリニックごとに分けてデータベースへ保存します。入力内容を残さない翻訳ツールとは異なり、業務に必要な記録はサーバー上に残ります。',
      '画面から見える範囲は、所属クリニック単位の行レベルセキュリティで制限します。他院の患者や予約は、一般スタッフには見えません。',
      `${APP_DISPLAY_NAME}運営は障害対応や導入支援のため、全クリニックを横断して閲覧できます。運営と院の管理者は別の権限です。`,
      '自動提案では、氏名・電話番号・生住所を AI へ送りません。患者 ID と、割付に必要な制約・距離情報を送ります。',
      'ご意見・不具合の内容は開発チームが確認します。患者氏名やカルテ番号は載せないでください。',
    ],
  },
  {
    id: 'rececon',
    title: 'レセコンとの連携',
    paragraphs: [
      'いまの取込は、院内で書き出した個人別全集計のCSVを正規化し、訪問スケジュールの種まきに使う経路です。医院LANへ常時入る接続は、まだ開いていません。',
      'レセコン接続は導入に備えて、今から条件を固定しています。医院LANに入らないことが前提ではありません。VPN（IPsecなど）や専用の閉域網、TLS 1.3以上の暗号化通信のうち、許可した通り道だけを使います。',
      '接続を許可する相手は、固定できる場合はグローバルIPで制限し、それ以外は遮断します。クラウド側の出口IPが固定でない区間は、ドメイン許可とVPN／閉域で補います。',
      '開けるポートはHTTPSの443など、連携に必要なものだけです。データベースの接続ポートは開きません。',
      '初期のアクセスは参照（取込）です。レセコン側への書き込みは、別契約があるときだけです。',
      '取り込むのはカルテ番号、氏名（漢字・カナ）、担当医、最終来院日、診療回数です。生年月日、保険証、カルテ本文、レセプト、会計、点数は取り込みません。',
      'レセコン接続用のID・パスワード・APIキーは、画面や自動提案のAIには渡しません。サーバー側で暗号化して扱い、医院管理者または運営が管理します。',
      '通信中は暗号化します。サーバーに残す患者種まきは、データベースの保存時暗号化の対象です。アップロードしたCSVそのものは取込後に残しません。',
      '取り込んだ患者種まきは業務データとして残ります。保持期間の短縮や削除は運営へ連絡してください。',
      '医院内のレセコン本体・院内PC・CSV書き出しは医院（およびレセコン事業者）の範囲です。取込後の保存・画面・権限・訪問スケジュールはデンタクルの範囲です。VPN／閉域では、医院側終端は医院、クラウド側終端はデンタクルです。',
      '取込の記録は操作ログに、実行者・時刻・件数・成否だけ残します。氏名やカルテ番号はログに出しません。ログイン監査とは別の記録です。接続開始前に、ログの保存年数を契約で決めます。',
      '設計は厚生労働省『医療情報システムの安全管理に関するガイドライン』と、経済産業省・総務省の事業者向け安全管理ガイドラインを参照し、該当する管理策を取り入れます。監査が終わる前に準拠済みとは書きません。',
      '外部の監視サービスへ患者データを送りません。利用目的は訪問スケジュールの種まきです。取込完了は導入完了ではありません。',
    ],
    callout: {
      title: '取込画面',
      body: 'いまは患者CSV取込から、院内ファイルを選択して種まきできます。レセコン接続は導入に備え、この画面とは別に、許可した通り道だけを開きます。',
      link: { href: '/import', label: '患者CSV取込を開く' },
    },
  },
  {
    id: 'infra',
    title: '通信とインフラのセキュリティ',
    paragraphs: [
      '画面とサーバーの通信は HTTPS で暗号化します。レセコン接続は TLS 1.3 以上を条件にします。',
      'データベースは Supabase を使い、保存時の暗号化と外部接続の SSL 強制を有効にしています。レセコン本体のデータベースポートは開きません。',
    ],
    callout: {
      title: SECURITY_NETWORK_CALLOUT_TITLE,
      body: `VPN、プロキシ、EDR、URL フィルタリング環境で${APP_DISPLAY_NAME}を利用する場合は、IT 担当者向けのネットワーク許可設定をご確認ください。`,
      link: { href: '/security/network', label: 'ネットワーク許可設定を見る' },
    },
  },
  {
    id: 'ops',
    title: '運用上のセキュリティ',
    paragraphs: [
      '利用するライブラリは、公開から3日以上経過した版だけを採用します。',
      '権限は最小限にします。運営アカウントと院の管理者を混同しません。サーバー専用の秘密情報は画面側に出しません。',
      '画面にはデータベースや内部処理の生エラーを出しません。ログインの接続元 IP はサーバー側で記録し、必要に応じて遮断できます。監査画面は運営のみです。',
    ],
  },
  {
    id: 'ai',
    title: 'AI とデータ送信',
    paragraphs: [
      '自動提案の裏処理には Cursor SDK（Cloud）を使います。実行モデルは運営が切り替えます。',
      '送信内容は割付に必要な識別子と制約に限定します。氏名・電話・生住所は含めません。',
      '処理の過程で、利用先のプラットフォームに一時的な記録が残ることがあります。',
    ],
    linkGroupLabel: '利用先の方針',
    links: [
      {
        href: 'https://cursor.com/privacy',
        label: 'Cursor のプライバシー',
        external: true,
      },
    ],
  },
  {
    id: 'auth',
    title: '認証とアクセス制御',
    paragraphs: [
      'ログインはメールアドレスとパスワードです。パスワードを業務テーブルへ平文保存しません。',
      '運営アカウントは Authenticator アプリによる確認コードが必須です。一般スタッフはパスワードのみです。',
      'Google アカウント連携（OAuth）は使っていません。',
    ],
  },
  {
    id: 'billing',
    title: '決済セキュリティ',
    paragraphs: [
      'お支払いは銀行振替を想定しています。カード番号は取り扱わず、サーバーにも保存しません。',
      'オンラインのカード決済は使っていません。',
    ],
  },
  {
    id: 'deletion',
    title: 'アカウントとデータの削除',
    paragraphs: [
      '画面からのアカウント自己削除は、現時点では用意していません。削除が必要な場合は運営へ連絡してください。',
      'オーナー権限の所属は、画面からもデータベースの権限でも安易に外せないようにしています。',
    ],
  },
]

export type NetworkAllowRow = {
  endpoint: string
  purpose: string
  when: string
}

export const SECURITY_NETWORK_INTRO =
  `${APP_DISPLAY_NAME}はブラウザから HTTPS（必要な場合は WebSocket）で通信します。企業ネットワークで遮断される場合は、セキュリティ機能を無効化せず、次の接続先だけを許可してください。接続先の IP アドレスは固定ではないため、IP ではなくドメイン単位で許可してください。`

export const SECURITY_NETWORK_ROWS: NetworkAllowRow[] = [
  {
    endpoint: `この${APP_DISPLAY_NAME}の画面（表示中のドメイン）`,
    purpose: 'Webアプリ、ログイン後の操作、自動提案・ご意見の API',
    when: '通常利用',
  },
  {
    endpoint: '*.supabase.co（HTTPS / WSS）',
    purpose: '認証、データベース、ファイル保存',
    when: 'ログイン、患者・予約の保存と表示',
  },
  {
    endpoint: 'fonts.googleapis.com / fonts.gstatic.com',
    purpose: '画面フォント',
    when: '画面表示',
  },
]

export const SECURITY_NETWORK_NOTE =
  '自動提案とご意見の外部連携はサーバー側で行います。院内ブラウザの許可リストへ追加する必要はありません。いまのレセコンCSV取込は院内ファイルを画面から送ります。レセコン接続（VPN・閉域・TLS）は、このブラウザ許可リストとは別に、許可した通り道だけを開きます。'

/** 左レール（業務ナビと同じ w-56。文言はデンタクル） */
export const SECURITY_RAIL_CTA: SecurityLink = {
  href: '/calendar',
  label: 'カレンダーへ戻る',
}

export const SECURITY_RAIL_BLURBS = [
  '患者情報と予約情報は、クリニック単位で保存します。',
  '画面から見える範囲は、所属クリニックの権限で制限します。',
  'いまのレセコン取込はCSVの種まきです。接続は導入に備え、許可した通り道だけを使います。',
] as const

export const SECURITY_RAIL_NAV: SecurityLink[] = [
  { href: '/security', label: '安全性' },
  { href: '/help', label: 'ヘルプ' },
  { href: '/security/network', label: 'ネットワーク許可設定' },
]

export const SECURITY_TAGLINE = '訪問歯科のスケジュールを、安全に扱うためのシステムです。'

export type SecurityFooterColumn = {
  title: string
  links: SecurityLink[]
}

export const SECURITY_FOOTER_COLUMNS: SecurityFooterColumn[] = [
  {
    title: APP_DISPLAY_NAME,
    links: [
      { href: '/calendar', label: 'カレンダー' },
      { href: '/mypage', label: 'マイページ' },
    ],
  },
  {
    title: 'サポート',
    links: [
      { href: '/announcements', label: 'お知らせ' },
      { href: '/help', label: 'ヘルプ' },
      { href: '/feedback', label: 'ご意見・不具合' },
      { href: '/security', label: '安全性' },
    ],
  },
  {
    title: '関連',
    links: [{ href: '/security/network', label: 'ネットワーク許可設定' }],
  },
]
