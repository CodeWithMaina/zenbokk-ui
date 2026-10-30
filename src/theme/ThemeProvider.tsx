import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  applyTheme,
  getSystemTheme,
  isThemePreference,
  readStoredPreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  writeStoredPreference,
} from './theme'
import type { ResolvedTheme, ThemePreference } from './theme'
import { ThemeContext } from './theme-context'

export type ThemeProviderProps = {
  children: ReactNode
  /** Used only when nothing valid is stored yet. Defaults to `system`. */
  defaultPreference?: ThemePreference
}

/**
 * Owns the app's theme preference and keeps `data-theme` in sync.
 *
 * The markup should also include the tiny boot script documented in
 * `docs/THEME-SYSTEM.md`; it applies the resolved theme before first paint so
 * there is no light/dark flash while React hydrates.
 */
export function ThemeProvider({
  children,
  defaultPreference = 'system',
}: ThemeProviderProps) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    return readStoredPreference() ?? defaultPreference
  })
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme)

  const resolvedTheme = resolveTheme(preference, systemTheme)

  useEffect(() => {
    applyTheme(resolvedTheme)
  }, [resolvedTheme])

  // Follow the OS while the user has chosen "system".
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return

    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemTheme(query.matches ? 'dark' : 'light')

    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  // Keep other tabs in sync with the same preference.
  useEffect(() => {
    if (typeof window === 'undefined') return

    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return
      if (event.newValue === null) {
        setPreferenceState(defaultPreference)
        return
      }
      setPreferenceState(
        isThemePreference(event.newValue) ? event.newValue : 'system',
      )
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [defaultPreference])

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next)
    writeStoredPreference(next)
  }, [])

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference],
  )

  return <ThemeContext value={value}>{children}</ThemeContext>
}
