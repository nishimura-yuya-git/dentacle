import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * 自動提案向けに PROJECT_MEMORY.md から抜き出す節 ID。
 * 改善・仕様がここに入ったら、リストへ節番号を足す。
 */
export const PROPOSE_MEMORY_SECTION_IDS = [
  '6.5',
  '6.6',
  '6.7',
  '6.8',
  '6.10',
  '6.11',
  '6.12',
  '6.13',
  '6.16',
  '6.34',
  '6.37',
  '6.39',
  '6.48',
  '10.19',
] as const

const MAX_CHARS = 48_000

type Cache = {
  mtimeMs: number
  path: string
  text: string
}

let cache: Cache | null = null

function resolveMemoryPath(cwd: string): string {
  return join(cwd, 'PROJECT_MEMORY.md')
}

/** `### 6.8 ...` / `### 10.19 ...` 形式の節を抽出 */
export function extractProposeMemorySections(
  markdown: string,
  sectionIds: readonly string[] = PROPOSE_MEMORY_SECTION_IDS,
): string {
  const idSet = new Set(sectionIds)
  const lines = markdown.split(/\r?\n/)
  const blocks: string[] = []
  let currentId: string | null = null
  let buf: string[] = []

  const flush = () => {
    if (currentId && idSet.has(currentId) && buf.length > 0) {
      blocks.push(buf.join('\n').trim())
    }
    buf = []
    currentId = null
  }

  for (const line of lines) {
    const heading = line.match(/^###\s+(\d+\.\d+)\b/)
    if (heading) {
      flush()
      currentId = heading[1]
      buf = [line]
      continue
    }
    // 次の ## 大見出しで節終了
    if (currentId && /^##\s+/.test(line)) {
      flush()
      continue
    }
    if (currentId) buf.push(line)
  }
  flush()

  let text = blocks.join('\n\n')
  if (text.length > MAX_CHARS) {
    text =
      text.slice(0, MAX_CHARS) +
      '\n\n…（PROJECT_MEMORY 割付関連節が長いため省略）'
  }
  return text
}

/**
 * リポジトリ根の PROJECT_MEMORY.md から割付関連節を読む。
 * 無い・読めない場合は null（呼び出し側でフォールバック）。
 */
export function loadProposeMemorySections(input?: {
  cwd?: string
}): { path: string; text: string; sectionIds: string[] } | null {
  const cwd = input?.cwd ?? process.cwd()
  const path = resolveMemoryPath(cwd)
  try {
    const st = statSync(path)
    if (cache && cache.path === path && cache.mtimeMs === st.mtimeMs) {
      return {
        path,
        text: cache.text,
        sectionIds: [...PROPOSE_MEMORY_SECTION_IDS],
      }
    }
    const raw = readFileSync(path, 'utf8')
    const text = extractProposeMemorySections(raw)
    if (!text.trim()) return null
    cache = { path, mtimeMs: st.mtimeMs, text }
    return {
      path,
      text,
      sectionIds: [...PROPOSE_MEMORY_SECTION_IDS],
    }
  } catch {
    return null
  }
}
