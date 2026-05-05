import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id: string
  email: string
  displayName: string | null
  role: 'SUPERADMIN' | 'TENANT_OWNER' | 'TENANT_MEMBER'
  avatarUrl?: string | null
}

export interface AuthTenant {
  id: string
  slug: string
  name: string
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
  tenant: AuthTenant | null
  setSession: (s: { accessToken: string; refreshToken: string; user: AuthUser; tenant: AuthTenant }) => void
  setProfile: (p: { user: AuthUser; tenant: AuthTenant }) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      tenant: null,
      setSession: (s) => set({ ...s }),
      setProfile: ({ user, tenant }) => set({ user, tenant }),
      clear: () => set({ accessToken: null, refreshToken: null, user: null, tenant: null }),
    }),
    { name: 'wallet:auth' },
  ),
)
