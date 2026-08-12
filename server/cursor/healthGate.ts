/**
 * Cursor ヘルス API の認可と公開レスポンス（情報開示を最小化する）。
 * CLI 用の describeCursorEnv とは分離する。
 */
import { timingSafeEqual } from 'node:crypto'

export const CURSOR_HEALTH_GENERIC_ERROR = 'ヘルスチェックに失敗しました'

export type PublicCursorHealthOk = {
  ok: true
  service: 'cursor-sdk'
  ready: true
}

export type PublicCursorHealthFail = {
  ok: false
  service: 'cursor-sdk'
  error: string
}

/** ヘルス用シークレット。未設定ならエンドポイントは無効（常に 401） */
export function readCursorHealthSecret(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const secret = env.CURSOR_HEALTH_SECRET?.trim()
  return secret || null
}

function safeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

function readBearerToken(
  authorizationHeader: string | string[] | undefined,
): string | null {
  const header = Array.isArray(authorizationHeader)
    ? authorizationHeader[0]
    : authorizationHeader
  if (!header || typeof header !== 'string') return null
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match?.[1]?.trim() || null
}

/**
 * Authorization: Bearer <CURSOR_HEALTH_SECRET> を検証する。
 * シークレット未設定・不一致はすべて false（失敗時に詳細を返さない）。
 */
export function isCursorHealthAuthorized(
  authorizationHeader: string | string[] | undefined,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const secret = readCursorHealthSecret(env)
  if (!secret) return false
  const token = readBearerToken(authorizationHeader)
  if (!token) return false
  return safeEqualString(token, secret)
}

/** HTTP 公開用。cwd / キー有無 / model / 環境変数名は載せない */
export function buildPublicCursorHealthOk(): PublicCursorHealthOk {
  return {
    ok: true,
    service: 'cursor-sdk',
    ready: true,
  }
}

export function buildPublicCursorHealthFail(
  error: string = CURSOR_HEALTH_GENERIC_ERROR,
): PublicCursorHealthFail {
  return {
    ok: false,
    service: 'cursor-sdk',
    error,
  }
}
