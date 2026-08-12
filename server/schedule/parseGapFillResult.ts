import { parseProposeResult } from './parseProposeResult.ts'
import type { GapFillCandidate, GapFillJobSnapshot } from './types.ts'

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

function readWarnings(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    .map((item) => item.trim().slice(0, 120))
    .slice(0, 4)
}

/**
 * 空き枠埋め応答をパースし、warnings を候補ごとに付与する。
 */
export function parseGapFillResult(
  resultText: string | null,
  snapshot: GapFillJobSnapshot,
): { candidates: GapFillCandidate[] } {
  const parsed = parseProposeResult(resultText, snapshot)
  const raw = resultText ? extractJsonObject(resultText) : null
  const slotsRaw =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as { slots?: unknown }).slots
      : null

  const warningsByPatient = new Map<string, string[]>()
  if (Array.isArray(slotsRaw)) {
    for (const item of slotsRaw) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue
      const row = item as Record<string, unknown>
      const patientId = typeof row.patientId === 'string' ? row.patientId : ''
      if (!patientId) continue
      warningsByPatient.set(patientId, readWarnings(row.warnings))
    }
  }

  return {
    candidates: parsed.slots.map((slot) => ({
      ...slot,
      warnings: warningsByPatient.get(slot.patientId) ?? [],
    })),
  }
}
