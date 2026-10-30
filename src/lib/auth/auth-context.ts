import { createContext } from 'react'
import type { AuthResponse, LoginRequest, RegisterRequest, UserProfile, UserRole, VerifyEmailRequest } from '../api/types'
import type { Session } from './session'

export type AuthContextValue = {
  session: Session | null
  user: UserProfile | null
  role: UserRole | null
  isAuthenticated: boolean
  /** True while a shared cookie is being exchanged for a session on first load. */
  isRestoring: boolean
  signIn: (input: LoginRequest) => Promise<AuthResponse>
  signUp: (input: RegisterRequest) => Promise<string>
  completeVerification: (input: VerifyEmailRequest) => Promise<AuthResponse>
  /**
   * Re-read the identity and re-mint tokens after a server-side role change
   * (a customer becoming a business owner) or a tenant switch.
   */
  syncSession: (options?: { tenantSlug?: string | null }) => Promise<Session | null>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  hasRole: (...roles: UserRole[]) => boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)
