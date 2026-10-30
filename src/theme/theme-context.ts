import { createContext } from 'react'
import type { ResolvedTheme, ThemePreference } from './theme'

export type ThemeContextValue = {
  /** What the user picked: system, light or dark. */
  preference: ThemePreference
  /** What is actually painted right now. */
  resolvedTheme: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)
