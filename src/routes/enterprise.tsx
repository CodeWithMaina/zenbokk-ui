import { createFileRoute } from '@tanstack/react-router'
import { EnterprisePage } from '../components/marketing'
import { requireMarketingSurface } from '../lib/auth/guards'

/**
 * The enterprise marketing page. It belongs to the marketing host only: a
 * business host that receives `/enterprise` is sent to the canonical platform
 * address rather than rendering platform marketing inside a tenant.
 */
export const Route = createFileRoute('/enterprise')({
  beforeLoad: () => {
    requireMarketingSurface('/enterprise')
  },
  component: EnterprisePage,
})
