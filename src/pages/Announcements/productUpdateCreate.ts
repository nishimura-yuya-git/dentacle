/** お知らせの作成先。公開は提案のあとに入れる。いきなり published insert はしない。 */

export const PRODUCT_UPDATE_CREATE_DESTINATIONS = ['upcoming', 'published'] as const
export type ProductUpdateCreateDestination = (typeof PRODUCT_UPDATE_CREATE_DESTINATIONS)[number]

/** 更新情報へ載せるときだけ、提案の直後に入れる。 */
export function shouldPublishAfterPropose(destination: ProductUpdateCreateDestination): boolean {
  return destination === 'published'
}

/** リリース予定は項目名だけ。種類・本文・URL・対象は出さない。 */
export function isTitleOnlyProductUpdateCreate(destination: ProductUpdateCreateDestination): boolean {
  return destination === 'upcoming'
}

export function formatProductUpdateTitleFieldCopy(destination: ProductUpdateCreateDestination): {
  label: string
  error: string
  placeholder?: string
} {
  if (isTitleOnlyProductUpdateCreate(destination)) {
    return {
      label: '項目',
      error: '項目を入力してください。',
    }
  }

  return {
    label: '見出し',
    error: '見出しを入力してください。',
    placeholder: '現場で何ができるようになったか',
  }
}

export function formatProductUpdateCreateCopy(destination: ProductUpdateCreateDestination): {
  title: string
  submitLabel: string
  successMessage: string
} {
  if (destination === 'upcoming') {
    return {
      title: 'リリース予定を登録',
      submitLabel: '登録する',
      successMessage: 'リリース予定に登録しました。',
    }
  }

  return {
    title: '更新情報の登録',
    submitLabel: '登録する',
    successMessage: '更新情報に登録しました。',
  }
}
