import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LoyaltyProgramsPage } from '../components/loyalty'

/**
 * Loyalty — the module's landing page.
 *
 * The loyalty parent entry opens the programs list, which is the module's
 * primary surface; the nested sidebar items (Rewards, Stamping, Card design)
 * carry their own module gates.
 */
export const Route = createFileRoute('/dashboard/loyalty')({
  component: LoyaltyPage,
})

function LoyaltyPage() {
  const navigate = useNavigate()

  return (
    <LoyaltyProgramsPage
      onOpenProgram={(programId) =>
        void navigate({
          to: '/dashboard/programs/$programId',
          params: { programId },
          search: { tab: 'overview' },
        })
      }
    />
  )
}

