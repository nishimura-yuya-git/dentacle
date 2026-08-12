import type { ProposeAgentResult, ProposeJobSnapshot, ProposeSlotResult } from './types.ts'

function normalizeTime(value: string): string | null {
  const trimmed = value.trim()
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed)
  if (!match) return null
  const hh = Number(match[1])
  const mm = Number(match[2])
  const ss = Number(match[3] ?? '0')
  if (
    !Number.isInteger(hh) ||
    !Number.isInteger(mm) ||
    !Number.isInteger(ss) ||
    hh < 0 ||
    hh > 23 ||
    mm < 0 ||
    mm > 59 ||
    ss < 0 ||
    ss > 59
  ) {
    return null
  }
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    // continue
  }

  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed)
  if (fenced?.[1]) {
    return JSON.parse(fenced[1].trim())
  }

  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1))
  }

  throw new Error('エージェント応答から JSON を抽出できませんでした')
}

/**
 * エージェント応答テキストを構造化スロットへ変換し、スナップショットで検証する。
 */
export function parseProposeResult(
  resultText: string | null,
  snapshot: ProposeJobSnapshot,
): ProposeAgentResult {
  if (!resultText || !resultText.trim()) {
    throw new Error('エージェント応答が空です')
  }

  const raw = extractJsonObject(resultText)
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('エージェント応答のルートがオブジェクトではありません')
  }

  const slotsRaw = (raw as { slots?: unknown }).slots
  if (!Array.isArray(slotsRaw)) {
    throw new Error('slots 配列がありません')
  }

  const patientIds = new Set(snapshot.patients.map((p) => p.patientId))
  const teamCount = snapshot.teams.length
  const seen = new Set<string>()
  const slots: ProposeSlotResult[] = []

  for (const item of slotsRaw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const row = item as Record<string, unknown>
    const patientId = typeof row.patientId === 'string' ? row.patientId : ''
    if (!patientId || !patientIds.has(patientId) || seen.has(patientId)) continue

    const proposedStart =
      typeof row.proposedStart === 'string' ? normalizeTime(row.proposedStart) : null
    const proposedEnd =
      typeof row.proposedEnd === 'string' ? normalizeTime(row.proposedEnd) : null
    if (!proposedStart || !proposedEnd) continue
    if (proposedStart >= proposedEnd) continue

    let teamIndex: number | undefined
    if (typeof row.teamIndex === 'number' && Number.isInteger(row.teamIndex)) {
      if (teamCount === 0 || (row.teamIndex >= 0 && row.teamIndex < teamCount)) {
        teamIndex = row.teamIndex
      }
    }

    const reason =
      typeof row.reason === 'string' && row.reason.trim()
        ? row.reason.trim().slice(0, 200)
        : '自動提案'

    seen.add(patientId)
    slots.push({
      patientId,
      proposedStart,
      proposedEnd,
      teamIndex,
      reason,
    })

    if (slots.length >= snapshot.maxSlots) break
  }

  return { slots }
}
