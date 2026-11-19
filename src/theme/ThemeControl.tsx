import { Moon, Sun } from 'lucide-react'
import { cn } from '../lib/cn'
import { useTheme } from './useTheme'

export type ThemeControlProps = {
  className?: string
}

/**
 * Sun/moon switch. Dark is the product default; the control flips between the two
 * explicit themes (never "system") and the thumb slides with the active icon.
 */
export function ThemeControl({ className }: ThemeControlProps) {
  const { resolvedTheme, setPreference } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setPreference(isDark ? 'light' : 'dark')}
      className={cn('theme-toggle focus-visible:outline-none focus-visible:shadow-ring', className)}
    >
      <span className="theme-toggle-track" aria-hidden="true">
        <Sun className="theme-toggle-hint theme-toggle-hint-sun" />
        <Moon className="theme-toggle-hint theme-toggle-hint-moon" />
        <span className={cn('theme-toggle-thumb', isDark && 'is-dark')}>
          {isDark ? <Moon className="size-[0.8rem]" /> : <Sun className="size-[0.8rem]" />}
        </span>
      </span>
    </button>
  )
}
