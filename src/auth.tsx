import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { authApi } from './api'
import type { CognitoProfile } from './cognito'
import * as cognito from './cognito'

/** Role comes from Cognito groups: 'admin' or 'team'. */
export type UserRole = 'admin' | 'team'

/**
 * Access level decides what a user can do:
 *  - 'admin'  → full access + admin-only actions (delete, add members)
 *  - 'team'   → full access (member of the crew table)
 *  - 'viewer' → read-only (self-registered, not yet added to a team)
 */
export type AccessLevel = 'admin' | 'team' | 'viewer'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  accessLevel: AccessLevel
  initials: string
}

type LoginResult =
  | { ok: true }
  | { ok: false; error: string }
  | {
      ok: false
      newPasswordRequired: true
      completeNewPassword: (newPassword: string, attrs?: { name?: string; phoneNumber?: string }) => Promise<void>
    }

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (identifier: string, password: string) => Promise<LoginResult>
  logout: () => void
  /** Re-fetch access level (e.g. after an admin adds the user to a team). */
  refreshAccess: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function initials(name: string, email: string) {
  return (name || email)
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('')
}

function toAuthUser(p: CognitoProfile, accessLevel: AccessLevel): AuthUser {
  return {
    id: p.id,
    name: p.name,
    email: p.email,
    role: p.role,
    accessLevel,
    initials: initials(p.name, p.email),
  }
}

/**
 * Ask the backend for the authoritative access level. The backend checks the
 * Cognito group (admin) and the crew table (team) and returns 'viewer' for
 * self-registered users who aren't on a team yet.
 */
async function resolveAccessLevel(profile: CognitoProfile): Promise<AccessLevel> {
  if (profile.role === 'admin') return 'admin'
  try {
    const res = await authApi.me()
    return res.user.accessLevel ?? 'viewer'
  } catch {
    // If the profile check fails, default to read-only rather than granting write.
    return 'viewer'
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Restore an existing Cognito session on load
  useEffect(() => {
    cognito
      .getCurrentProfile()
      .then(async (p) => {
        if (!p) return setUser(null)
        const level = await resolveAccessLevel(p)
        setUser(toAuthUser(p, level))
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (identifier: string, password: string): Promise<LoginResult> => {
    try {
      const res = await cognito.login(identifier, password)
      if ('newPasswordRequired' in res && res.newPasswordRequired) {
        return {
          ok: false,
          newPasswordRequired: true,
          completeNewPassword: async (newPassword: string, attrs?: { name?: string; phoneNumber?: string }) => {
            const profile = await res.completeNewPassword(newPassword, attrs)
            const level = await resolveAccessLevel(profile)
            setUser(toAuthUser(profile, level))
          },
        }
      }
      if ('profile' in res) {
        const level = await resolveAccessLevel(res.profile)
        setUser(toAuthUser(res.profile, level))
        return { ok: true }
      }
      return { ok: false, error: 'Login failed' }
    } catch (err: any) {
      return { ok: false, error: err?.message ?? 'Invalid email or password' }
    }
  }

  const logout = () => {
    cognito.logout()
    setUser(null)
  }

  const refreshAccess = async () => {
    const p = await cognito.getCurrentProfile()
    if (!p) return setUser(null)
    const level = await resolveAccessLevel(p)
    setUser(toAuthUser(p, level))
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshAccess }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}

/**
 * Whether the current user can perform write actions (create/edit/assign/delete).
 * Viewers (self-registered, not on a team) are read-only.
 */
export function useCanWrite(): boolean {
  const { user } = useAuth()
  return user?.accessLevel === 'admin' || user?.accessLevel === 'team'
}

/**
 * A "viewer" is a self-registered user not yet added to a team. They get
 * Dashboard-only access — no Shoots, Calendar, Team, Equipment, etc.
 */
export function useIsViewer(): boolean {
  const { user } = useAuth()
  return user?.accessLevel === 'viewer'
}

/**
 * Permission helper. 'admin' can do everything; 'team' can write but not
 * admin-only actions; 'viewer' is read-only.
 */
export function useCanDo(action: 'add_member' | 'any') {
  const { user } = useAuth()
  if (!user) return false
  if (user.accessLevel === 'admin') return true
  if (action === 'add_member') return false // admin-only
  return user.accessLevel === 'team' // viewers can't write
}
