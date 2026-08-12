/** UI・心拍の更新間隔（秒） */
export const AUTH_PRESENCE_POLL_SECONDS = 20

/** この秒数以内の last_seen を在席とみなす（心拍2〜3回分の猶予） */
export const AUTH_PRESENCE_ONLINE_WITHIN_SECONDS = 60

export function isAuthPresenceOnline(
  lastSeenAt: string,
  nowMs: number = Date.now(),
  withinSeconds: number = AUTH_PRESENCE_ONLINE_WITHIN_SECONDS,
): boolean {
  const seen = new Date(lastSeenAt).getTime()
  if (Number.isNaN(seen)) return false
  return nowMs - seen <= withinSeconds * 1000
}
