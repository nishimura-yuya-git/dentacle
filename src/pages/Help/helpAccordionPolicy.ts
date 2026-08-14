/** ヘルプFAQの開閉。複数同時オープン可。ハッシュは既知の id だけ採用する。 */

export function toggleHelpFaqItem(openIds: readonly string[], id: string): string[] {
  if (openIds.includes(id)) {
    return openIds.filter((item) => item !== id)
  }
  return [...openIds, id]
}

export function resolveHelpFaqHash(hash: string, knownIds: readonly string[]): string | null {
  const id = hash.startsWith('#') ? hash.slice(1) : hash
  if (!id || !knownIds.includes(id)) return null
  return id
}

export function initialOpenHelpFaqIds(hash: string, knownIds: readonly string[]): string[] {
  const id = resolveHelpFaqHash(hash, knownIds)
  return id ? [id] : []
}

export function nextHelpFaqHash(
  nextOpenIds: readonly string[],
  toggledId: string,
  currentHash: string,
): string {
  if (nextOpenIds.includes(toggledId)) return `#${toggledId}`
  const currentId = resolveHelpFaqHash(currentHash, [toggledId])
  return currentId === toggledId ? '' : currentHash
}
