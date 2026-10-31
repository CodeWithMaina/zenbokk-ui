import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { MailPlus, RefreshCw, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Alert } from '../components/ui/alert'
import { Badge, StatusPill } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { SectionCard } from '../components/ui/card'
import { Drawer } from '../components/ui/drawer'
import { EmptyState } from '../components/ui/empty-state'
import { Field, Input } from '../components/ui/field'
import { MetricGrid } from '../components/ui/metric-tile'
import { PageHeader } from '../components/ui/page-header'
import { PaginationBar } from '../components/ui/pagination-bar'
import { SearchField } from '../components/ui/search-field'
import { Skeleton } from '../components/ui/skeleton'
import { Toolbar } from '../components/ui/toolbar'
import { errorMessage } from '../lib/api/client'
import { ownerApi } from '../lib/dashboard/api'
import { useDashboardContext } from '../lib/dashboard/dashboard-context'
import {
  useOwnerStaff,
  useStaffInvitations,
  useStaffOverview,
} from '../lib/dashboard/use-owner-dashboard'
import { MODULE } from '../lib/entitlements'
import { formatDate, formatNumber, getInitials, pluralize } from '../lib/format'

export const Route = createFileRoute('/dashboard/staff')({
  component: StaffPage,
})

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function StaffPage() {
  const { hasModule } = useDashboardContext()
  const enabled = hasModule(MODULE.staff)

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)

  const staff = useOwnerStaff({ search: search || null, page, pageSize }, enabled)
  const overview = useStaffOverview(enabled)
  const invitations = useStaffInvitations(enabled)
  const queryClient = useQueryClient()

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['staff'] })
  }

  const invite = useMutation({
    mutationFn: (email: string) => ownerApi.inviteStaff(email),
    onSuccess: () => {
      toast.success('Invitation sent.')
      setInviteOpen(false)
      setInviteEmail('')
      invalidate()
    },
    onError: (error) => setInviteError(errorMessage(error)),
  })

  const resend = useMutation({
    mutationFn: (id: string) => ownerApi.resendInvitation(id),
    onSuccess: () => {
      toast.success('Invitation resent.')
      invalidate()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const submitInvite = () => {
    const email = inviteEmail.trim()
    if (!emailPattern.test(email)) {
      setInviteError('Enter a valid email address.')
      return
    }
    setInviteError(null)
    invite.mutate(email)
  }

  const rows = staff.data?.items ?? []
  const summary = overview.data
  const openInvitations = (invitations.data ?? []).filter(
    (invitation) => !invitation.acceptedAt && !invitation.revokedAt && !invitation.isExpired,
  )

  return (
    <div>
      <PageHeader
        title="Team"
        description="Everyone who can stamp cards and take appointments."
        actions={
          enabled ? (
            <Button variant="primary" size="sm" onClick={() => setInviteOpen(true)}>
              <MailPlus className="size-4" aria-hidden="true" />
              Invite staff
            </Button>
          ) : null
        }
      />

      {!enabled ? (
        <Alert tone="info" title="Staff tools aren’t in this plan">
          The staff module lets teammates sign in, stamp cards and take bookings. Add it from
          settings to invite your team.
        </Alert>
      ) : (
        <>
          {summary ? (
            <MetricGrid
              items={[
                { value: formatNumber(summary.totalStaff), label: 'Team members' },
                { value: formatNumber(summary.activeStaff7d), label: 'Active this week' },
                { value: formatNumber(summary.stampsToday), label: 'Stamps today' },
                { value: formatNumber(summary.pendingInvitations), label: 'Invites pending' },
              ]}
            />
          ) : null}

          <SectionCard className="mt-4" contentClassName="space-y-3">
            <Toolbar>
              <SearchField
                placeholder="Search by name or email"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                className="min-w-[15rem] flex-1"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void staff.refetch()}
                disabled={staff.isFetching}
              >
                <RefreshCw className="size-3.5" aria-hidden="true" />
                Refresh
              </Button>
            </Toolbar>

            {staff.isError ? (
              <Alert tone="danger" title="Couldn’t load your team">
                {errorMessage(staff.error)}
              </Alert>
            ) : staff.isPending ? (
              <div className="space-y-2" aria-busy="true">
                <Skeleton className="h-14 rounded-md" />
                <Skeleton className="h-14 rounded-md" />
              </div>
            ) : rows.length === 0 ? (
              <EmptyState
                icon={<UsersRound className="size-5" />}
                title={search ? 'No teammate matches that search' : 'No staff linked yet'}
                description={
                  search
                    ? 'Try a different name or email.'
                    : 'Invite a teammate — they accept by email and appear here with their stamp activity.'
                }
                action={
                  search ? null : (
                    <Button variant="primary" onClick={() => setInviteOpen(true)}>
                      Invite staff
                    </Button>
                  )
                }
              />
            ) : (
              <ul className="m-0 list-none divide-y divide-line p-0">
                {rows.map((member) => (
                  <li
                    key={member.userId}
                    className="flex flex-wrap items-center justify-between gap-3 py-[0.7rem] first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="grid size-9 shrink-0 place-items-center rounded-round bg-sunken text-caption font-semibold text-muted"
                        aria-hidden="true"
                      >
                        {getInitials(member.fullName)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-label font-semibold">{member.fullName}</p>
                        <p className="truncate text-caption text-muted">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="neutral">
                        {member.stampsToday ?? 0}/{member.dailyGoal ?? '—'} stamps today
                      </Badge>
                      <Badge tone="info">{pluralize(member.appointmentsToday, 'booking')}</Badge>
                      <StatusPill status={member.status === 'inactive' ? 'paused' : 'active'}>
                        {member.status === 'inactive' ? 'Inactive' : 'Active'}
                      </StatusPill>
                      {member.lastActiveAt ? (
                        <span className="text-caption text-muted">
                          Seen {formatDate(member.lastActiveAt)}
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {staff.data && staff.data.totalPages > 1 ? (
              <PaginationBar
                page={staff.data.page}
                pageCount={staff.data.totalPages}
                onPageChange={setPage}
                pageSize={pageSize}
                onPageSizeChange={(size) => {
                  setPageSize(size)
                  setPage(1)
                }}
              />
            ) : null}
          </SectionCard>

          {openInvitations.length > 0 ? (
            <SectionCard
              className="mt-4"
              title="Pending invitations"
              description="Resend if it got buried; revoke if plans changed."
            >
              <ul className="m-0 list-none divide-y divide-line p-0">
                {openInvitations.map((invitation) => (
                  <li
                    key={invitation.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-[0.6rem] first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-label font-semibold">{invitation.email}</p>
                      <p className="text-caption text-muted">
                        Sent {formatDate(invitation.createdAt)} · expires{' '}
                        {formatDate(invitation.expiresAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={resend.isPending}
                        onClick={() => resend.mutate(invitation.id)}
                      >
                        <RefreshCw className="size-3.5" aria-hidden="true" />
                        Resend
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          void ownerApi.revokeInvitation(invitation.id).then(
                            () => {
                              toast.success('Invitation revoked.')
                              invalidate()
                            },
                            (error) => toast.error(errorMessage(error)),
                          )
                        }}
                      >
                        Revoke
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}
        </>
      )}

      <Drawer
        open={inviteOpen}
        onClose={() => {
          setInviteOpen(false)
          setInviteError(null)
        }}
        title="Invite a teammate"
        description="They get an email link, create their own password and join as staff."
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setInviteOpen(false)
                setInviteError(null)
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" disabled={invite.isPending} onClick={submitInvite}>
              {invite.isPending ? 'Sending…' : 'Send invitation'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {inviteError ? <Alert tone="danger">{inviteError}</Alert> : null}
          <Field label="Work email" htmlFor="invite-email">
            <Input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="teammate@example.com"
            />
          </Field>
          <p className="text-caption text-muted">
            Use the address they can access — invitations can only be accepted by their exact
            email.
          </p>
        </div>
      </Drawer>
    </div>
  )
}
