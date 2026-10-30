import { createRootRoute, Outlet } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { RouteErrorState, RouteNotFoundState } from '../components/shell/RouteStates'

/**
 * Every page renders here. Shells (storefront, owner, staff, admin, auth) are
 * layout routes below this one, so the root stays free of chrome.
 */
export const Route = createRootRoute({
  component: RootLayout,
  errorComponent: RouteErrorState,
  notFoundComponent: RouteNotFoundState,
})

function RootLayout() {
  return (
    <>
      <Outlet />
      <Toaster position="bottom-right" closeButton />
    </>
  )
}

