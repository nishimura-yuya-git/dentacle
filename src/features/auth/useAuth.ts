import { useContext } from 'react'
import { AuthContext } from '@/features/auth/authContext'

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth は AuthProvider 内で使ってください。')
  }
  return ctx
}
