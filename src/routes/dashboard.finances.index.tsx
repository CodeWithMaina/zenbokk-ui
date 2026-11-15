import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/finances/')({
  /**
   * `/dashboard/finances` is a group, not a screen. Cashbook is the overview the owner
   * wants by default, so the bare Finance URL lands there rather than on an empty page.
   */
  beforeLoad: () => {
    throw redirect({ to: '/dashboard/finances/cashbook' })
  },
})
