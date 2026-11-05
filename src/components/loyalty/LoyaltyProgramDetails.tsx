import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Award, RefreshCw } from 'lucide-react'
import { ApiError, errorMessage } from '../../lib/api/client'
import { formatDate } from '../../lib/format'
import { programScheduleNote, programTypeLabel } from '../../lib/loyalty/mappers'
import { useProgram, useProgramDetail } from '../../lib/loyalty'
import type { LoyaltyProgram } from '../../lib/loyalty/types'
import { Alert } from '../ui/alert'
import { BackLink, Button } from '../ui/button'
import { EmptyState } from '../ui/empty-state'
import { Skeleton } from '../ui/skeleton'
import { Tabs } from '../ui/tabs'
import { ChangeLoyaltyDesignDrawer } from './ChangeLoyaltyDesignDrawer'
import { LoyaltyCardRenderer } from './LoyaltyCardRenderer'
import { LoyaltyProgramCustomers } from './LoyaltyProgramCustomers'
import { LoyaltyProgramOverview } from './LoyaltyProgramOverview'
import { LoyaltyProgramSettings } from './LoyaltyProgramSettings'
import { ProgramStatusBadge } from './ProgramStatusBadge'

export const PROGRAM_TABS = ['overview', 'customers', 'settings'] as const
export type ProgramTab = (typeof PROGRAM_TABS)[number]

export type LoyaltyProgramDetailsProps = {
  programId: string
  tab: ProgramTab
  onTabChange: (tab: ProgramTab) => void
  /** Navigate to another program (used after duplicating). */
  onOpenProgram: (programId: string) => void
  /** Return to the programs list. */
  onBack: () => void
  /** Open a customer's details page from the Customers tab. */
  onOpenCustomer?: (customerId: string) => void
  /** The roster needs the `customers` module. */
  customersEnabled: boolean
}

function scheduleLabel(program: LoyaltyProgram): string {
  if (!program.startsAt && !program.endsAt) return 'Always on'
  const start = program.startsAt ? formatDate(program.startsAt) : 'Now'
  const end = program.endsAt ? formatDate(program.endsAt) : 'open-ended'
  return `${start} – ${end}`
}

/**
 * The program details page.
 *
 * A two-column shell — the card and its status beside the tabbed body — that
 * collapses to a single column on tablets and phones. The tab lives in the URL
 * (the route owns it), so a program's customers or settings view is a link
 * someone can share.
 */
export function LoyaltyProgramDetails({
  programId,
  tab,
  onTabChange,
  onOpenProgram,
  onBack,
  onOpenCustomer,
  customersEnabled,
}: LoyaltyProgramDetailsProps) {
  const detail = useProgramDetail(programId)
  const fallback = useProgram(programId)
  const [designOpen, setDesignOpen] = useState(false)

  const program = detail.data?.program ?? fallback.data ?? null
  const loading = detail.isPending && fallback.isPending

  const back = (
    <BackLink
      href="#"
      onClick={(event) => {
        event.preventDefault()
        onBack()
      }}
    >
      All programs
    </BackLink>
  )

  if (loading) {
    return (
      <div>
        {back}
        <div
          className="grid grid-cols-[380px_minmax(0,1fr)] items-start gap-x-[2rem] max-[900px]:grid-cols-1"
          aria-busy="true"
          aria-label="Loading program"
        >
          <Skeleton className="h-[13rem] rounded-card max-[900px]:order-2" />
          <div className="space-y-[1rem] max-[900px]:order-1">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-[3rem] rounded-card" />
            <Skeleton className="h-[16rem] rounded-card" />
          </div>
        </div>
      </div>
    )
  }

  if (detail.isError && fallback.isError) {
    const notFound = detail.error instanceof ApiError && detail.error.isNotFound
    return (
      <div>
        {back}
        {notFound ? (
          <div className="card">
            <EmptyState
              icon={<Award className="size-5" />}
              title="Program not found"
              description="It may have been deleted, or it belongs to another workspace."
              action={
                <Link to="/dashboard/programs" className="btn no-underline">
                  Back to programs
                </Link>
              }
            />
          </div>
        ) : (
          <Alert tone="danger" title="Program could not be loaded">
            <p>{errorMessage(detail.error)}</p>
            <Button
              size="sm"
              className="mt-[0.6rem]"
              onClick={() => {
                void detail.refetch()
                void fallback.refetch()
              }}
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Try again
            </Button>
          </Alert>
        )}
      </div>
    )
  }

  if (!program) return null

  const note = programScheduleNote(program)

  return (
    <div>
      {back}

      <div className="grid grid-cols-[380px_minmax(0,1fr)] items-start gap-x-[2rem] max-[900px]:grid-cols-1">
        <aside className="sticky top-[1rem] max-[900px]:static max-[900px]:order-2 max-[900px]:mb-[1.4rem]">
          <LoyaltyCardRenderer
            html={program.cardDesignHtml}
            designName={program.cardDesignName}
            label={`${program.name} card`}
            values={{
              programName: program.name,
              rewardName: program.rewardDescription,
              stampsRequired: program.stampsRequired,
              stampsCollected: program.defaultEnrollmentStamps,
            }}
          />
        </aside>

        <div className="min-w-0 max-[900px]:order-1">
          <header className="pb-[1.1rem] pt-[0.3rem]">
            <p className="eyebrow mb-[0.4rem]">{programTypeLabel(program.programType)}</p>
            <h1 className="text-title font-bold tracking-tight">{program.name}</h1>
            {program.description ? (
              <p className="mt-[0.4rem] max-w-[46ch] text-label leading-[1.55] text-muted">
                {program.description}
              </p>
            ) : null}
            <div className="mt-[0.7rem] flex flex-wrap items-center gap-x-[0.9rem] gap-y-[0.3rem] text-meta text-muted">
              <ProgramStatusBadge status={program.status} />
              <span>{scheduleLabel(program)}</span>
              {note ? <span>{note}</span> : null}
            </div>
          </header>

          <div className="mb-[1.1rem]">
            <Tabs<ProgramTab>
              label="Program sections"
              value={tab}
              onValueChange={onTabChange}
              sticky
              items={[
                { value: 'overview', label: 'Overview' },
                { value: 'customers', label: 'Customers' },
                { value: 'settings', label: 'Settings' },
              ]}
            />
          </div>

          {tab === 'overview' ? (
            <LoyaltyProgramOverview
              detail={detail.data}
              loading={detail.isPending}
              error={detail.error}
              onRetry={() => void detail.refetch()}
            />
          ) : null}

          {tab === 'customers' ? (
            customersEnabled ? (
              <LoyaltyProgramCustomers
                programId={program.id}
                enabled
                onOpenCustomer={onOpenCustomer}
              />
            ) : (
              <Alert tone="info" title="Customer management needs the Customers module">
                This workspace is not entitled to the Customers module, so the enrolled-customer
                list is unavailable.{' '}
                <Link to="/dashboard/settings" className="link font-semibold">
                  Review your plan
                </Link>
              </Alert>
            )
          ) : null}

          {tab === 'settings' ? (
            <LoyaltyProgramSettings
              program={program}
              onChangeDesign={() => setDesignOpen(true)}
              onDuplicated={(created) => onOpenProgram(created.id)}
              onRemoved={onBack}
            />
          ) : null}
        </div>
      </div>

      <ChangeLoyaltyDesignDrawer
        key={designOpen ? program.id : 'closed'}
        open={designOpen}
        onClose={() => setDesignOpen(false)}
        program={program}
      />
    </div>
  )
}
