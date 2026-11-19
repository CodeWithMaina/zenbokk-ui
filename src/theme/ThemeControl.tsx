import { Moon, Sun } from 'lucide-react'
import { cn } from '../lib/cn'
import { useTheme } from './useTheme'

export type ThemeControlProps = {
  className?: string
}

/**
 * Sun/moon theme switch: two explicit choices on one track, with a thumb that
 * slides to whichever theme is active.
 *
 * It is a two-button group rather than a single toggle so the current theme is
 * readable without hovering: the active option is filled, labelled and
 * `aria-pressed`, and each option states the theme it selects. Both are real
 * buttons, so Tab reaches them and Space/Enter activates them; the thumb only
 * moves (no cross-fade, no gradient) and stops entirely under
 * `prefers-reduced-motion`. Dark stays the product default - the control flips
 * between the two explicit themes and never introduces a third "system" state.
 */
export function ThemeControl({ className }: ThemeControlProps) {
  const { resolvedTheme, setPreference } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <div role="group" aria-label="Theme" className={cn('theme-switch', className)}>
      <span
        className="theme-switch-thumb"
        data-theme-state={isDark ? 'dark' : 'light'}
        aria-hidden="true"
      />
      <button
        type="button"
        aria-pressed={!isDark}
        aria-label="Light theme"
        onClick={() => setPreference('light')}
        className={cn('theme-switch-option', !isDark && 'is-active')}
      >
        <Sun className="size-[0.95rem] shrink-0" aria-hidden="true" />
        <span>Light</span>
      </button>
      <button
        type="button"
        aria-pressed={isDark}
        aria-label="Dark theme"
        onClick={() => setPreference('dark')}
        className={cn('theme-switch-option', isDark && 'is-active')}
      >
        <Moon className="size-[0.95rem] shrink-0" aria-hidden="true" />
        <span>Dark</span>
      </button>
    </div>
  )
}
