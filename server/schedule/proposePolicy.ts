import { loadProposeMemorySections } from './loadProposeMemorySections.ts'

/**
 * 自動提案エージェントへ渡す割付方針。
 *
 * 精度重視の正本:
 * - 実行時に PROJECT_MEMORY.md の割付関連節を自動抽出して埋め込む
 * - 読めない環境だけ下記フォールバックを使う
 *
 * `.cursor/rules` 全文は渡さない（UI/workflow 等が混ざり精度を落とす）。
 * 割付の記憶は PROJECT_MEMORY に集約する（§6.13 と両立）。
 */

export const PROPOSE_POLICY_SOURCE = [
  'PROJECT_MEMORY.md（割付関連節を実行時抽出）',
  'フォールバック: proposePolicy 内蔵要約',
] as const

/** MEMORY が読めないときの最小必守（§6.8 / §6.48） */
export const PROPOSE_POLICY_FALLBACK_TEXT = [
  '【割付方針フォールバック（PROJECT_MEMORY 由来・必守）】',
  '1. 期限・優先度で対象を選ぶ（dueStatus: overdue / due_soon を優先）',
  '2. 近接クラスタを号車に割り当て、必要台数だけ朝から並行ルートを立てる',
  '3. 各号車内は移動最小で密に連続配置する（薄い格子にしない）',
  '4. 号車間を平準化し、余った号車は空でよい',
  '5. 1号車シリアル詰め・同時刻横並び絶対禁止はしない',
  '6. スナップショット外の patientId を使わない。生住所・氏名・電話は渡していない',
].join('\n')

export function buildProposePolicyBlock(input?: { cwd?: string }): string {
  const loaded = loadProposeMemorySections({ cwd: input?.cwd })
  if (loaded) {
    return [
      '【PROJECT_MEMORY.md 割付関連節（実行時自動抽出・必守）】',
      `抽出元: ${loaded.path}`,
      `節: ${loaded.sectionIds.join(', ')}`,
      '',
      loaded.text,
      '',
      '【運用】上記と矛盾する割付をしない。スナップショット外の事実を捏造しない。',
    ].join('\n')
  }

  return [
    PROPOSE_POLICY_FALLBACK_TEXT,
    '',
    '（PROJECT_MEMORY.md を読めなかったためフォールバック要約を使用）',
  ].join('\n')
}
