import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

/**
 * File-based router. The generated tree lives in `src/routeTree.gen.ts` and is
 * rebuilt by `@tanstack/router-plugin` whenever `src/routes` changes.
 */
export const router = createRouter({
  routeTree,
  // Preloading on intent keeps storefront → booking hops instant without
  // eagerly fetching data for every link on the page.
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
