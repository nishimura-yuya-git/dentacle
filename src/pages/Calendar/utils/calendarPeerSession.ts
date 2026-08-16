const PEER_ID_STORAGE_KEY = 'dentacle.calendar.peerId'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isCalendarPeerId(value: string): boolean {
  return UUID_RE.test(value)
}

type IdStorage = Pick<Storage, 'getItem' | 'setItem'>

/** 同一タブ内の二重発行を防ぐ。sessionStorage より先に見る */
let tabPeerId: string | null = null

export function resetCalendarPeerIdMemory(): void {
  tabPeerId = null
}

/** タブごとの端末ID。同一アカウントの複数PCを区別する */
export function readOrCreateCalendarPeerId(
  storage: IdStorage,
  createId: () => string = () => crypto.randomUUID(),
): string {
  const existing = storage.getItem(PEER_ID_STORAGE_KEY)?.trim() ?? ''
  if (isCalendarPeerId(existing)) {
    tabPeerId = existing.toLowerCase()
    return tabPeerId
  }
  if (tabPeerId && isCalendarPeerId(tabPeerId)) {
    storage.setItem(PEER_ID_STORAGE_KEY, tabPeerId)
    return tabPeerId
  }
  const created = createId().toLowerCase()
  tabPeerId = created
  storage.setItem(PEER_ID_STORAGE_KEY, created)
  return created
}
