import { Navigate } from 'react-router-dom'

/** 旧URL互換。本体は `/proposals?view=usage` に統合済み */
export function AiUsagePage() {
  return <Navigate to="/proposals?view=usage" replace />
}
