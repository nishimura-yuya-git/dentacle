/** カレンダー自動提案の実行エンジン */

export type ProposeEngine = 'local' | 'cursor' | 'auto'

/**
 * - cursor: Cursor SDK が正（既定）。方針は proposePolicy（MEMORY 由来）
 * - auto: SDK 優先、失敗・0件時のみローカル決定論へフォールバック
 * - local: 決定論ローカル割付のみ（速度検証用）
 */
export function loadProposeEngine(
  env: NodeJS.ProcessEnv = process.env,
): ProposeEngine {
  const raw = (env.PROPOSE_ENGINE ?? 'cursor').trim().toLowerCase()
  if (raw === 'cursor' || raw === 'auto' || raw === 'local') return raw
  return 'cursor'
}
