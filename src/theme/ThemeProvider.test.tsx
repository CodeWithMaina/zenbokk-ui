import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ThemeControl } from './ThemeControl'
import { useTheme } from './useTheme'
import { THEME_STORAGE_KEY } from './theme'
import { renderStorefront } from '../test/render'

/**
 * Theme switching.
 *
 * The three-way control must actually repaint the document (`data-theme` drives
 * every token) and remember the choice, and a stored preference must win on the
 * next mount.
 */
function ThemeProbe() {
  const { resolvedTheme, preference } = useTheme()
  return (
    <p>
      preference {preference} · resolved {resolvedTheme}
    </p>
  )
}

describe('ThemeControl', () => {
  it('repaints the document and persists the choice', async () => {
    const user = userEvent.setup()
    renderStorefront(
      <>
        <ThemeControl />
        <ThemeProbe />
      </>,
    )

    // Dark is the product default — a new visitor starts in it, not on "system".
    expect(screen.getByText(/preference dark · resolved dark/i)).toBeInTheDocument()

    // The sun/moon switch is a single toggle: it moves from dark to light…
    await user.click(screen.getByRole('switch', { name: /switch to light mode/i }))

    expect(await screen.findByText(/preference light · resolved light/i)).toBeInTheDocument()
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')

    // …and back again.
    await user.click(screen.getByRole('switch', { name: /switch to dark mode/i }))

    expect(await screen.findByText(/preference dark · resolved dark/i)).toBeInTheDocument()
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('honours a stored preference on mount', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark')

    renderStorefront(<ThemeProbe />)

    expect(screen.getByText(/preference dark · resolved dark/i)).toBeInTheDocument()
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
