import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './server'

/**
 * Global test setup.
 *
 * - `@testing-library/jest-dom/vitest` extends `expect` with the DOM matchers.
 * - MSW is started once per file with `onUnhandledRequest: 'error'`, so a
 *   request no test declared is a failure rather than a real network call.
 * - React Testing Library's `cleanup` plus storage resets run after every test,
 *   so no theme preference, tenant slug or booking draft leaks between tests.
 * - jsdom ships no `matchMedia` or `scrollIntoView`, both of which the app uses.
 */

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

beforeAll(() => {
  // MSW v3 names this `onUnhandledFrame`: a request no test declared is a bug
  // (a missing handler, or a duplicate call), so it fails loudly.
  server.listen({ onUnhandledFrame: 'error' })
})

afterEach(() => {
  server.resetHandlers()
  cleanup()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

afterAll(() => {
  server.close()
})
