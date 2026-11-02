import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { MODULE } from '../../lib/entitlements'
import { pluralize } from '../../lib/format'
import { normalizeProgramStatus } from '../../lib/loyalty/mappers'
import { usePrograms } from '../../lib/loyalty'
import type { LoyaltyProgram, ProgramStatusFilter } from '../../lib/loyalty/types'
import { useDashboardContext } from '../../lib/dashboard/dashboard-context'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { PageHeader } from '../ui/page-header'
import { CreateLoyaltyProgramDrawer } from './CreateLoyaltyProgramDrawer'
import { LoyaltyProgramFilters } from './LoyaltyProgramFilters'
import { LoyaltyProgramList } from './LoyaltyProgramList'

export type LoyaltyProgramsPageProps = {
  /** Navigate to a program's details page. */
  onOpenProgram: (programId: string) => void
}

/**
 * The Loyalty Programs listing.
 *
 * The programs are the business's own, fetched from `GET /v1/programs/me`; the
 * search box and status tabs narrow that set in the browser (the endpoint
 * returns the whole business catalogue rather than a page, so there is nothing
 * to page through). Archived programs are hidden, matching the lifecycle.
 */
export function LoyaltyProgramsPage({ onOpenProgram }: LoyaltyProgramsPageProps) {
  const { hasModule, business } = useDashboardContext()
  const enabled = hasModule(MODULE.loyalty)

  const programs = usePrograms(enabled)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ProgramStatusFilter>('all')
  const [createOpen, setCreateOpen] = useState(false)

  // Archived programs are terminal and hidden from the list, as in the design.
  const visible = useMemo(
    () => (programs.data ?? []).filter((program) => normalizeProgramStatus(program.status) !== 'archived'),
    [programs.data],
  )

  const counts = useMemo(
    () => ({
      all: visible.length,
      active: visible.filter((p) => normalizeProgramStatus(p.status) === 'active').length,
      paused: visible.filter((p) => normalizeProgramStatus(p.status) === 'paused').length,
      draft: visible.filter((p) => normalizeProgramStatus(p.status) === 'draft').length,
    }),
    [visible],
  )

  const query = search.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      visible.filter((program) => {
        const matchesStatus = status === 'all' || normalizeProgramStatus(program.status) === status
        const matchesSearch =
          !query ||
          `${program.name} ${program.rewardDescription}`.toLowerCase().includes(query)
        return matchesStatus && matchesSearch
      }),
    [visible, status, query],
  )

  const filtersActive = status !== 'all' || query.length > 0

  if (!enabled) {
    return (
      <div>
        <PageHeader title="Loyalty programs" />
        <Alert tone="info" title="Loyalty isn’t part of your current plan">
          Your workspace is not entitled to the “loyalty” module, so programs stay hidden.{' '}
          <Link to="/dashboard/settings" className="link font-semibold">
            Review your plan and modules
          </Link>
        </Alert>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Loyalty programs"
        description={
          programs.isSuccess
            ? filtered.length === visible.length
              ? pluralize(visible.length, 'program')
              : `${filtered.length} of ${visible.length} programs`
            : undefined
        }
        actions={
          <Button variant="primary" onClick={() => setCreateOpen(true)} aria-label="New program">
            <Plus className="size-3.5" aria-hidden="true" />
            <span className="max-sm:sr-only">New program</span>
          </Button>
        }
      />

      <LoyaltyProgramFilters
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        counts={programs.isSuccess ? counts : undefined}
      />

      <LoyaltyProgramList
        programs={filtered}
        onOpen={(program: LoyaltyProgram) => onOpenProgram(program.id)}
        loading={programs.isPending}
        error={programs.error}
        onRetry={() => void programs.refetch()}
        filtered={filtersActive}
        onClearFilters={() => {
          setSearch('')
          setStatus('all')
        }}
        onCreate={() => setCreateOpen(true)}
      />

      <CreateLoyaltyProgramDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        businessName={business.name}
        existingNames={visible.map((program) => program.name)}
        onCreated={() => {
          // Make sure the new program is visible regardless of the active tab.
          setSearch('')
          setStatus('all')
        }}
      />
    </div>
  )
}
