/** 安全性ページの文言 SSoT。Nani の骨格に合わせ、事実はデンタクルの実装に合わせる。 */

export const SECURITY_HEADING = 'デンタクルの安全性'
export const SECURITY_NETWORK_TITLE = 'ネットワーク許可設定'

export const SECURITY_INTRO =
  'デンタクルは訪問歯科のスケジュール業務を扱うシステムです。患者情報と予約情報を守ることを最優先に、設計・開発から運用までの対策を継続的に見直しています。'

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
      'デンタクル運営は障害対応や導入支援のため、全クリニックを横断して閲覧できます。運営と院の管理者は別の権限です。',
      '自動提案では、氏名・電話番号・生住所を AI へ送りません。患者 ID と、割付に必要な制約・距離情報を送ります。',
      'ご意見・不具合の内容は開発用の GitHub Issue になります。患者氏名やカルテ番号は載せないでください。',
    ],
  },
  {
    id: 'infra',
    title: '通信とインフラのセキュリティ',
    paragraphs: [
      '画面とサーバーの通信は HTTPS で暗号化します。',
      'データベースは Supabase を使い、保存時の暗号化と外部接続の SSL 強制を有効にしています。',
    ],
    callout: {
      title: SECURITY_NETWORK_CALLOUT_TITLE,
      body: 'VPN、プロキシ、EDR、URL フィルタリング環境でデンタクルを利用する場合は、IT 担当者向けのネットワーク許可設定をご確認ください。',
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
  'デンタクルはブラウザから HTTPS（必要な場合は WebSocket）で通信します。企業ネットワークで遮断される場合は、セキュリティ機能を無効化せず、次の接続先だけを許可してください。接続先の IP アドレスは固定ではないため、IP ではなくドメイン単位で許可してください。'

export const SECURITY_NETWORK_ROWS: NetworkAllowRow[] = [
  {
    endpoint: 'このデンタクルの画面（表示中のドメイン）',
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
  '自動提案（Cursor）とご意見（GitHub Issue）の外部連携はサーバー側で行います。院内ブラウザの許可リストへ追加する必要はありません。'

/** 左レール（Nani の 298px サイドバー骨格。文言はデンタクル） */
export const SECURITY_RAIL_CTA: SecurityLink = {
  href: '/calendar',
  label: 'カレンダーへ戻る',
}

export const SECURITY_RAIL_BLURBS = [
  '患者情報と予約情報は、クリニック単位で保存します。',
  '画面から見える範囲は、所属クリニックの権限で制限します。',
] as const

export const SECURITY_RAIL_NAV: SecurityLink[] = [
  { href: '/security', label: '安全性' },
  { href: '/security/network', label: 'ネットワーク許可設定' },
]

export const SECURITY_TAGLINE = '訪問歯科のスケジュールを、安全に扱うためのシステムです。'

export type SecurityFooterColumn = {
  title: string
  links: SecurityLink[]
}

export const SECURITY_FOOTER_COLUMNS: SecurityFooterColumn[] = [
  {
    title: 'デンタクル',
    links: [
      { href: '/calendar', label: 'カレンダー' },
      { href: '/mypage', label: 'マイページ' },
    ],
  },
  {
    title: 'サポート',
    links: [
      { href: '/announcements', label: 'お知らせ' },
      { href: '/feedback', label: 'ご意見・不具合' },
      { href: '/security', label: '安全性' },
    ],
  },
  {
    title: '関連',
    links: [{ href: '/security/network', label: 'ネットワーク許可設定' }],
  },
]
