import { useState } from 'react'
import { Clock, MailPlus, Pencil, Power, RefreshCw } from 'lucide-react'
import type { StaffDetail } from '../../lib/api/types'
import {
  staffMembershipDataStatus,
  staffMembershipLabel,
  staffMembershipTone,
} from '../../lib/staff'
import { Avatar } from '../ui/avatar'
import { StatusPill } from '../ui/badge'
import { Button } from '../ui/button'
import { EntityHeader } from '../ui/page-header'

export type StaffDetailsHeaderProps = {
  detail: StaffDetail
  /** Today's clock state, when the attendance module is entitled. */
  attendanceState?: string | null
  onEdit?: () => void
  onToggleActive?: () => void
  onClock?: () => void
  onResendInvite?: () => void
  canManage?: boolean
  attendanceEnabled?: boolean
  clocking?: boolean
  className?: string
}

/**
 * The profile hero: who this is, what they do, and the actions that apply to
 * them.
 *
 * Actions appear only when they can succeed: deactivate is hidden for the
 * business owner (the API refuses it), clocking is hidden without the
 * attendance module, and everything that writes is hidden without
 * `staff.manage`.
 */
export function StaffDetailsHeader({
  detail,
  attendanceState,
  onEdit,
  onToggleActive,
  onClock,
  onResendInvite,
  canManage = true,
  attendanceEnabled = false,
  clocking = false,
  className,
}: StaffDetailsHeaderProps) {
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false)
  const invited = detail.membershipStatus === 'Invited'
  const clockedIn = attendanceState === 'clocked_in'

  return (
    <div className={className}>
      <EntityHeader
        avatar={
          <Avatar
            name={detail.fullName}
            src={detail.avatarUrl ?? undefined}
            size="xl"
            decorative={false}
          />
        }
        title={detail.fullName}
        subtitle={
          <>
            <span>{detail.positionName ?? 'No job title yet'}</span>
            <span className="text-subtle">·</span>
            <span className="min-w-0 break-all">{detail.email}</span>
          </>
        }
        meta={
          <>
            <StatusPill
              status={staffMembershipDataStatus(detail.membershipStatus)}
              tone={staffMembershipTone(detail.membershipStatus)}
            >
              {staffMembershipLabel(detail.membershipStatus)}
            </StatusPill>
            {detail.isBookable ? (
              <StatusPill status="active">Bookable online</StatusPill>
            ) : (
              <StatusPill status="inactive">Not bookable</StatusPill>
            )}
            {!detail.isPublic ? <StatusPill status="hidden">Hidden from storefront</StatusPill> : null}
          </>
        }
        actions={
          <>
            {attendanceEnabled && canManage && !invited && detail.isActive ? (
              <Button variant="primary" onClick={onClock} disabled={clocking}>
                <Clock className="size-4" aria-hidden="true" />
                {clockedIn ? 'Clock out' : 'Clock in'}
              </Button>
            ) : null}

            {canManage && invited && onResendInvite ? (
              <Button onClick={onResendInvite}>
                <RefreshCw className="size-4" aria-hidden="true" />
                Resend invite
              </Button>
            ) : null}

            {canManage ? (
              <Button onClick={onEdit}>
                <Pencil className="size-4" aria-hidden="true" />
                Edit
              </Button>
            ) : null}

            {canManage && !invited && onToggleActive ? (
              confirmingDeactivate ? (
                <Button
                  variant="dangerSolid"
                  onClick={() => {
                    setConfirmingDeactivate(false)
                    onToggleActive()
                  }}
                >
                  <Power className="size-4" aria-hidden="true" />
                  Confirm deactivate
                </Button>
              ) : (
                <Button
                  variant={detail.isActive ? 'danger' : 'default'}
                  onClick={() =>
                    detail.isActive ? setConfirmingDeactivate(true) : onToggleActive()
                  }
                >
                  <Power className="size-4" aria-hidden="true" />
                  {detail.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              )
            ) : null}
          </>
        }
      />

      {detail.membershipStatus === 'Invited' ? (
        <p className="mb-[0.8rem] flex items-center gap-[0.4rem] text-meta text-muted">
          <MailPlus className="size-4" aria-hidden="true" />
          Invited — they complete their own profile when they accept.
        </p>
      ) : null}
    </div>
  )
}
