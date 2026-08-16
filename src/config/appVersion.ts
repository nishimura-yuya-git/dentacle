/**
 * 製品版。package.json の version および Git タグ vX.Y.Z と一致させる。
 * 院向けお知らせの通し番号（update #N）や、DB の楽観ロック version 列とは別。
 */
export const APP_VERSION = '0.1.0'

/** 開発者向け表示。院向けお知らせには使わない。 */
export function formatAppVersionLabel(version = APP_VERSION): string {
  return `v${version}`
}
