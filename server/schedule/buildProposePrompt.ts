import { compactProposePromptPayload } from './compactProposePromptPayload.ts'
import { buildProposePolicyBlock } from './proposePolicy.ts'
import type { ProposeJobSnapshot } from './types.ts'

/**
 * Cursor SDK へ渡すワンショットプロンプト。
 * - 方針: PROJECT_MEMORY.md の割付関連節を実行時抽出（読めないときだけ要約フォールバック）
 * - データ: 圧縮スナップショット（生住所なし・疎距離行列）
 * - .cursor/rules 全文は渡さない（業務外ルールが混ざり精度が落ちる）
 */
export function buildProposePrompt(
  snapshot: ProposeJobSnapshot,
  options?: { cwd?: string },
): string {
  const payload = JSON.stringify(compactProposePromptPayload(snapshot))

  return [
    'あなたは訪問歯科の1日割付アシスタントです。',
    'Supabase / DB / 外部 API / 地図 API には一切接続しないでください。',
    'リポジトリ探索や .cursor/rules の読込は不要です。',
    '下記の【PROJECT_MEMORY 割付関連節】と JSON スナップショットだけを根拠に割付してください。',
    '',
    buildProposePolicyBlock({ cwd: options?.cwd }),
    '',
    '【この実行の数値制約】',
    `- 対象日: ${snapshot.targetDate}`,
    `- 稼働帯: ${snapshot.dayStart} 〜 ${snapshot.dayEnd}`,
    `- 最大件数: ${snapshot.maxSlots}`,
    `- 最低移動ギャップ: ${snapshot.travelGapMinutes} 分（同一チームの連続枠）`,
    '- preferredWeekdays が空でなければ対象日の曜日を優先（0=日 … 6=土）',
    '- priority は数値が小さいほど優先（due の次）',
    '- patientId はスナップショットに存在する ID のみ',
    '- teamIndex は teams[].index の範囲内',
    '- occupiedVisits は当日の既存枠。同じ teamIndex で時間が重なる提案は禁止。既存枠は動かさない',
    '',
    '出力は次の JSON オブジェクトだけ（前後に説明文やコードフェンスを付けない）:',
    '{"slots":[{"patientId":"<uuid>","proposedStart":"HH:mm:ss","proposedEnd":"HH:mm:ss","teamIndex":0,"reason":"短い日本語（距離・期限・エリアに触れてよい）"}]}',
    '割付できない場合は {"slots":[]}',
    '',
    '===SNAP===',
    payload,
  ].join('\n')
}
