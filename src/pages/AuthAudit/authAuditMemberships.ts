/** auth_audit_logs.metadata.memberships のスナップショット */

export type AuthAuditMembershipSnap = {
  clinic_id: string
  clinic_name: string
  role?: string
}

export function parseAuthAuditMemberships(metadata: unknown): AuthAuditMembershipSnap[] {
  if (!metadata || typeof metadata !== 'object') return []
  const raw = (metadata as { memberships?: unknown }).memberships
  if (!Array.isArray(raw)) return []

  const rows: AuthAuditMembershipSnap[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const clinicId = String((item as { clinic_id?: unknown }).clinic_id ?? '').trim()
    const clinicName = String((item as { clinic_name?: unknown }).clinic_name ?? '').trim()
    if (!clinicId && !clinicName) continue
    rows.push({
      clinic_id: clinicId,
      clinic_name: clinicName || clinicId.slice(0, 8),
      role: String((item as { role?: unknown }).role ?? '').trim() || undefined,
    })
  }
  return rows
}

export function formatAuthAuditMembershipsLabel(memberships: AuthAuditMembershipSnap[]): string {
  if (memberships.length === 0) return '所属なし'
  return memberships.map((item) => item.clinic_name).join('、')
}
