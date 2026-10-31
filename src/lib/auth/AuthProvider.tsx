import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import type { AuthResponse, UserRole } from '../api/types'
import { getActiveTenantSlug } from '../tenant/tenant-store'
import { authApi } from './api'
import type { AuthContextValue } from './auth-context'
import { AuthContext } from './auth-context'
import { ensureSessionRestored, resetSessionRestore } from './restore'
import {
  clearSession,
  getRefreshToken,
  getSession,
  patchSessionUser,
  setPendingTokens,
  setSession,
  subscribeSession,
} from './session'
import type { Session } from './session'

function toSession(response: AuthResponse): Session {
  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    expiresAt: Date.now() + response.expiresIn * 1000,
    user: response.user,
    tenantSlug: getActiveTenantSlug() ?? getSession()?.tenantSlug ?? null,
  }
}

/**
 * Owns the session for the whole app.
 *
 * Tokens are persisted by `session.ts`; this provider adds the behaviour that
 * needs React Query (cache invalidation on identity change) and the first-load
 * hydration from the shared refresh cookie, so a visitor who signed in on
 * another subdomain never sees a signed-out shell.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(subscribeSession, getSession, () => null)
  const [isRestoring, setIsRestoring] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (getSession()) return

    let alive = true
    setIsRestoring(true)

    // Memoised with the guard-facing helper: one refresh request per page load.
    void ensureSessionRestored().finally(() => {
      if (alive) setIsRestoring(false)
    })

    return () => {
      alive = false
    }
  }, [])

  const signIn = useCallback(
    async (input: Parameters<typeof authApi.login>[0]) => {
      const response = await authApi.login(input)
      setSession(toSession(response))
      await queryClient.invalidateQueries()
      return response
    },
    [queryClient],
  )

  const completeVerification = useCallback(
    async (input: Parameters<typeof authApi.verifyEmail>[0]) => {
      const response = await authApi.verifyEmail(input)
      setSession(toSession(response))
      await queryClient.invalidateQueries()
      return response
    },
    [queryClient],
  )

  /**
   * Adopt a token pair issued somewhere other than the sign-in screens. Staff
   * invitation acceptance is the caller: the server returns a full
   * `AuthResponse` for the identity it just created, and the session shape
   * belongs here rather than in that page.
   */
  const establishSession = useCallback(
    async (response: AuthResponse) => {
      setSession(toSession(response))
      await queryClient.invalidateQueries()
    },
    [queryClient],
  )

  /**
   * Re-mint tokens and re-read the identity. The backend resolves the tenant
   * and the caller's membership again, so this is also the correct way to
   * refresh after creating a business (persona change) and to bind a session
   * to a specific business.
   */
  const syncSession = useCallback(
    async (options?: { tenantSlug?: string | null }): Promise<Session | null> => {
      const tenantSlug = options?.tenantSlug ?? getActiveTenantSlug()
      const tokens = await authApi.refresh(getRefreshToken(), tenantSlug)

      // Authenticate exactly one request: the profile read that completes the
      // session. `setPendingTokens` is replaced by `setSession` below.
      setPendingTokens(tokens)
      const user = await authApi.profile()
      const session: Session = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: Date.now() + tokens.expiresIn * 1000,
        user,
        tenantSlug,
      }
      setSession(session)
      await queryClient.invalidateQueries()
      return session
    },
    [queryClient],
  )

  const signUp = useCallback(async (input: Parameters<typeof authApi.register>[0]) => {
    const response = await authApi.register(input)
    return response.message
  }, [])

  const signOut = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // A revoked or expired token still has to clear the client session.
    }
    clearSession()
    resetSessionRestore()
    queryClient.clear()
  }, [queryClient])

  const refreshProfile = useCallback(async () => {
    if (!getSession()) return
    patchSessionUser(await authApi.profile())
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      role: session?.user.role ?? null,
      isAuthenticated: session !== null,
      isRestoring,
      signIn,
      signUp,
      completeVerification,
      establishSession,
      syncSession,
      signOut,
      refreshProfile,
      hasRole: (...roles: UserRole[]) => !!session && roles.includes(session.user.role),
    }),
    [
      session,
      isRestoring,
      signIn,
      signUp,
      completeVerification,
      establishSession,
      syncSession,
      signOut,
      refreshProfile,
    ],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
