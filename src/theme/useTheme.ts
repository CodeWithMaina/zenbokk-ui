import { useContext } from 'react'
import { ThemeContext } from './theme-context'
import type { ThemeContextValue } from './theme-context'

/** Access the current theme preference. Must sit under `<ThemeProvider>`. */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used inside <ThemeProvider>')
  }
  return context
}
