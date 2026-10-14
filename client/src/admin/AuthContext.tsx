import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, setUnauthorizedHandler } from './api.ts'

interface AuthValue {
  /** undefined while checking the session, null when logged out */
  admin: { email: string } | null | undefined
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AuthValue['admin']>(undefined)

  useEffect(() => {
    // Any 401 (expired session) drops back to the login screen
    setUnauthorizedHandler(() => setAdmin(null))
    api<{ admin: { email: string } }>('/auth/me')
      .then((r) => setAdmin(r.admin))
      .catch(() => setAdmin(null))
    return () => setUnauthorizedHandler(null)
  }, [])

  const value: AuthValue = {
    admin,
    login: async (email, password) => {
      const r = await api<{ admin: { email: string } }>('/auth/login', { json: { email, password } })
      setAdmin(r.admin)
    },
    logout: async () => {
      await api('/auth/logout', { json: {} }).catch(() => {})
      setAdmin(null)
    },
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAdminAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used inside <AdminAuthProvider>')
  return ctx
}
