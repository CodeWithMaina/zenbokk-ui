import { createFileRoute } from '@tanstack/react-router'
import { LegalPage } from '../components/marketing'
import { TERMS_OF_SERVICE } from '../lib/marketing/legal'
import { requireMarketingSurface } from '../lib/auth/guards'

/**
 * The platform's terms of service. Marketing-surface only, for the same reason
 * as the privacy policy: they are the platform's terms, not a business's.
 */
export const Route = createFileRoute('/terms')({
  beforeLoad: () => {
    requireMarketingSurface('/terms')
  },
  component: () => <LegalPage document={TERMS_OF_SERVICE} />,
})
