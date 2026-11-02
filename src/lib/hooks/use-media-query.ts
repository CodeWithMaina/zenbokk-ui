import { useEffect, useState } from 'react'

/**
 * Subscribes to a CSS media query from React.
 *
 * Used where a component must change *behaviour* (not just styling) at a
 * breakpoint — the filter panel pushes the list on wide screens and overlays it
 * on phones and tablets — and where the breakpoint comes from the design rather
 * than from Tailwind's scale.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return

    const list = window.matchMedia(query)
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches)

    setMatches(list.matches)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])

  return matches
}
