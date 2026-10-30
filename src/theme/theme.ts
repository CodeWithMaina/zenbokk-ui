export const THEME_STORAGE_KEY = 'zb-theme'

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const

export type ThemePreference = (typeof THEME_PREFERENCES)[number]
export type ResolvedTheme = Exclude<ThemePreference, 'system'>

/** Narrow an unknown value (localStorage, URL, form input) to a preference. */
export function isThemePreference(value: unknown): value is ThemePreference {
  return (
    typeof value === 'string' &&
    (THEME_PREFERENCES as readonly string[]).includes(value)
  )
}

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

/** The theme that should actually be painted for a given preference. */
export function resolveTheme(
  preference: ThemePreference,
  systemTheme: ResolvedTheme = getSystemTheme(),
): ResolvedTheme {
  return preference === 'system' ? systemTheme : preference
}

/**
 * Read the stored preference. Missing, blocked or invalid values safely fall
 * back to `system` instead of leaving the document unstyled.
 */
export function readStoredPreference(): ThemePreference | null {
  if (typeof window === 'undefined') return null
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (value === null) return null
    return isThemePreference(value) ? value : 'system'
  } catch {
    return null
  }
}

export function writeStoredPreference(preference: ThemePreference): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Storage can be unavailable in private mode. The in-memory preference
    // still applies for this session.
  }
}

/**
 * Paint a resolved theme. `data-theme` drives every token in `index.css`;
 * `color-scheme` is set by the token definitions, but is mirrored here so
 * native controls match even before styles recalculate.
 */
export function applyTheme(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}
