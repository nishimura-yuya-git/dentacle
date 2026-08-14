/** お知らせの公開ゲート（画面・テストの正）。DB の status と一致させる。 */

export const PRODUCT_UPDATE_STATUSES = ['proposed', 'published', 'rejected'] as const
export type ProductUpdateStatus = (typeof PRODUCT_UPDATE_STATUSES)[number]

export const PRODUCT_UPDATE_KINDS = ['feature', 'improve', 'fix'] as const
export type ProductUpdateKind = (typeof PRODUCT_UPDATE_KINDS)[number]

export const PRODUCT_UPDATE_SURFACES = [
  'all',
  'calendar',
  'patients',
  'contacts',
  'users',
  'settings',
  'import',
] as const
export type ProductUpdateSurface = (typeof PRODUCT_UPDATE_SURFACES)[number]

/** 対象環境。画面対象 surfaces とは別。一覧の絞り込みはしない。 */
export const PRODUCT_UPDATE_PLATFORMS = ['web', 'mac', 'windows'] as const
export type ProductUpdatePlatform = (typeof PRODUCT_UPDATE_PLATFORMS)[number]

/** 院ユーザーのお知らせ一覧に出してよいか。デプロイや提案だけでは true にしない。 */
export function isProductUpdateVisibleToClinic(status: ProductUpdateStatus): boolean {
  return status === 'published'
}

/** 入れる／入れないの判定対象か。公開済み・非採用は再判定しない。 */
export function canReviewProductUpdate(status: ProductUpdateStatus): boolean {
  return status === 'proposed'
}

/** 開発中バッジのON/OFF対象か。公開済み・非採用は変えない。 */
export function canSetInProgressBadge(status: ProductUpdateStatus): boolean {
  return status === 'proposed'
}

/** タイムラインアイコンを変えられるか。入れないにした件は変えない。 */
export function canSetTimelineMark(status: ProductUpdateStatus): boolean {
  return status === 'proposed' || status === 'published'
}

/** 見出し・本文を直せるか。 */
export function canEditProductUpdateCopy(status: ProductUpdateStatus): boolean {
  return status === 'proposed' || status === 'published'
}

/** 削除できるか。進捗連動の有無は RPC 側で見る。 */
export function canDeleteProductUpdate(status: ProductUpdateStatus): boolean {
  return status === 'proposed' || status === 'published' || status === 'rejected'
}

export type ProductUpdateInsertIntent = {
  status: ProductUpdateStatus
}

/**
 * 新規作成は必ず提案。公開ステータスでの作成は禁止（入れる操作は別）。
 * DB の propose_product_update と同じ契約。
 */
export function assertProductUpdateCreatedAsProposal(intent: ProductUpdateInsertIntent): void {
  if (intent.status !== 'proposed') {
    throw new Error('お知らせは提案として作成してください。入れる操作は別に行います。')
  }
}
