import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LoyaltyProgramsPage } from '../components/loyalty'

export const Route = createFileRoute('/dashboard/programs/')({
  component: ProgramsIndexPage,
})

/**
 * `/dashboard/programs` — the loyalty programs list.
 *
 * Navigation is the route's job: the page component stays presentational and
 * receives a callback, so it can be exercised without a router.
 */
function ProgramsIndexPage() {
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
