/** 更新情報タイムラインの並び。通し番号の大きい件を上にする。 */
export function sortPublishedProductUpdates<
  T extends { updateNumber: number | null; publishedAt: string | null },
>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const leftNumber = left.updateNumber ?? 0
    const rightNumber = right.updateNumber ?? 0
    if (leftNumber !== rightNumber) return rightNumber - leftNumber
    return (right.publishedAt ?? '').localeCompare(left.publishedAt ?? '')
  })
}
