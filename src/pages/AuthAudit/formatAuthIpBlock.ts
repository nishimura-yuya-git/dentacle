/** IPブロック確認文。回線共有IPである旨を必ず含める */
export function formatAuthIpBlockConfirmMessage(ip: string): string {
  const trimmed = ip.trim()
  return [
    `IP ${trimmed} は回線の出口（グローバルIP）です。Macなど端末単体の番号ではありません。`,
    '同じWi‑Fi／回線の別端末でログインし、IPが同じか確認してからブロックしてください。',
    '',
    'このIPからの一般ユーザーログインをブロックしますか？',
    '・同じ回線の他端末もログインできなくなります',
    '・運営アカウントはこのIPでもログインできます',
  ].join('\n')
}
