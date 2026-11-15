import { createFileRoute } from '@tanstack/react-router'
import { LegalPage } from '../components/marketing'
import { LEGAL_INFORMATION } from '../lib/marketing/legal'
import { requireMarketingSurface } from '../lib/auth/guards'

/**
 * General legal information for the platform: who operates it, how to reach us
 * and how to serve a notice. Marketing-surface only, like the other legal pages.
 */
export const Route = createFileRoute('/legal')({
  beforeLoad: () => {
    requireMarketingSurface('/legal')
  },
  component: () => <LegalPage document={LEGAL_INFORMATION} />,
})
