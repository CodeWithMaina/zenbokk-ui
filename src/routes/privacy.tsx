import { createFileRoute } from '@tanstack/react-router'
import { LegalPage } from '../components/marketing'
import { PRIVACY_POLICY } from '../lib/marketing/legal'
import { requireMarketingSurface } from '../lib/auth/guards'

/**
 * The platform's privacy policy.
 *
 * It belongs to the platform, not to a business, so a business host that
 * receives `/privacy` is sent to the canonical platform address rather than
 * rendering platform legalese inside a tenant. The storefront footer links here
 * on the marketing host for the same reason.
 */
export const Route = createFileRoute('/privacy')({
  beforeLoad: () => {
    requireMarketingSurface('/privacy')
  },
  component: () => <LegalPage document={PRIVACY_POLICY} />,
})
