import type { ProductUpdateKind, ProductUpdatePlatform, ProductUpdateSurface } from '@/pages/Announcements/productUpdatePolicy'
import type { ImprovementStatus } from '@/pages/Progress/improvementItemPolicy'

/** 院向けお知らせの定型見出し。GitHub / Issue を出さない。 */
export const IMPROVEMENT_ANNOUNCEMENT_FALLBACK_TITLE = 'ご意見の反映'

/** 院向けお知らせの定型本文。 */
export const IMPROVEMENT_ANNOUNCEMENT_FALLBACK_BODY = 'ご意見いただいた内容を反映しました。'

const CLINIC_FORBIDDEN_ANNOUNCEMENT_TERMS = /github|issue/i

const PAGE_SURFACE_PREFIXES: Array<{ prefix: string; surface: ProductUpdateSurface }> = [
  { prefix: '/calendar', surface: 'calendar' },
  { prefix: '/patients', surface: 'patients' },
  { prefix: '/contacts', surface: 'contacts' },
  { prefix: '/users', surface: 'users' },
  { prefix: '/settings', surface: 'settings' },
  { prefix: '/import', surface: 'import' },
]

/** 運営が反映済みにしたときだけお知らせに入れる。送信時・見送りでは入れない。 */
export function shouldPublishAnnouncementOnStatus(status: ImprovementStatus): boolean {
  return status === 'done'
}

function normalizePagePath(pagePath: string | null | undefined): string {
  return pagePath?.split('?')[0]?.split('#')[0]?.trim() ?? ''
}

/**
 * 進捗の画面パスを、お知らせの対象画面にする。
 * SQL の improvement_page_to_surfaces と揃える。
 */
export function surfaceFromImprovementPagePath(
  pagePath: string | null | undefined,
): ProductUpdateSurface {
  const path = normalizePagePath(pagePath)
  for (const { prefix, surface } of PAGE_SURFACE_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return surface
    }
  }
  return 'all'
}

export function surfacesFromImprovementPagePath(
  pagePath: string | null | undefined,
): ProductUpdateSurface[] {
  return [surfaceFromImprovementPagePath(pagePath)]
}

function sanitizeAnnouncementText(
  value: string | null | undefined,
  fallback: string,
  maxLength: number,
): string {
  const text = value?.trim() ?? ''
  if (text === '' || CLINIC_FORBIDDEN_ANNOUNCEMENT_TERMS.test(text)) {
    return fallback
  }
  return text.slice(0, maxLength)
}

export function buildImprovementAnnouncementCopy(input: {
  title: string
  summary: string | null
}): {
  title: string
  body: string
  kind: ProductUpdateKind
  platform: ProductUpdatePlatform
  detailUrl: null
} {
  const title = sanitizeAnnouncementText(input.title, IMPROVEMENT_ANNOUNCEMENT_FALLBACK_TITLE, 200)
  const summary = sanitizeAnnouncementText(input.summary, IMPROVEMENT_ANNOUNCEMENT_FALLBACK_BODY, 2000)
  const body = summary === title ? IMPROVEMENT_ANNOUNCEMENT_FALLBACK_BODY : summary

  return {
    title,
    body,
    kind: 'fix',
    platform: 'web',
    detailUrl: null,
  }
}

/** 運営が反映済みにしたときだけ、打った人のチャットに返す。見送りでは返さない。 */
export function shouldNotifyClinicReplyOnStatus(status: ImprovementStatus): boolean {
  return shouldPublishAnnouncementOnStatus(status)
}

/**
 * 本人チャット用の返信本文。お知らせと同じ見出し＋定型文。
 * 院向けに GitHub / Issue は出さない。
 */
export function buildClinicReplyBody(title: string): string {
  const copy = buildImprovementAnnouncementCopy({
    title,
    summary: IMPROVEMENT_ANNOUNCEMENT_FALLBACK_BODY,
  })
  return `${copy.title}\n\n${IMPROVEMENT_ANNOUNCEMENT_FALLBACK_BODY}`
}

export function formatImprovementStatusSavedMessage(status: ImprovementStatus): string {
  if (shouldPublishAnnouncementOnStatus(status)) {
    return '反映済みにしました。お知らせにも載ります。ご意見チャットにも返します。'
  }
  return '状態を更新しました。'
}
