import { Link } from '@tanstack/react-router'
import { CalendarPlus, ChevronLeft, Phone } from 'lucide-react'
import { Avatar } from '../ui/avatar'
import { StatusPill } from '../ui/badge'
import type { Tone } from '../ui/badge'
import { Button } from '../ui/button'
import { EntityHeader } from '../ui/page-header'

export type ClientDetailsHeaderProps = {
  customerId: string
  name: string
  phoneNumber: string | null
  avatarUrl: string | null
  /** `active` | `left` | `blocked` — the persisted enrollment status. */
  status: string
  statusLabel: string
  tone?: Tone
  /** Opened by the Book appointment action; disabled when booking is unavailable. */
  onBookAppointment: () => void
  bookingDisabled?: boolean
  bookingHint?: string
}

/**
 * Client details hero: back link, avatar, name, status, phone and the two
 * actions from the design (call, book). Composed from `EntityHeader`, so it
 * shares the detail-page rhythm used across the console.
 */
export function ClientDetailsHeader({
  customerId,
  name,
  phoneNumber,
  avatarUrl,
  status,
  statusLabel,
  tone,
  onBookAppointment,
  bookingDisabled = false,
  bookingHint,
}: ClientDetailsHeaderProps) {
  const tel = phoneNumber ? `tel:${phoneNumber.replace(/\s/g, '')}` : null

  return (
    <div>
      {/* Same recipe as `BackLink`, as a router link so the client list is not
          re-fetched from scratch when returning. */}
      <Link
        to="/dashboard/customers"
        className="mb-[0.4rem] inline-flex min-h-[2.4rem] items-center gap-[0.3rem] font-medium text-muted transition-colors hover:text-fg"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Clients
      </Link>

      <EntityHeader
        avatar={
          <Avatar
            key={customerId}
            name={name}
            src={avatarUrl ?? undefined}
            size="lg"
            decorative
          />
        }
        title={name}
        meta={
          <>
            <StatusPill status={status} tone={tone}>
              {statusLabel}
            </StatusPill>
            {tel ? (
              <a href={tel} className="hover:text-fg">
                {phoneNumber}
              </a>
            ) : (
              <span>No phone number</span>
            )}
          </>
        }
        actions={
          <>
            {tel ? (
              <a href={tel} className="btn">
                <Phone className="size-4" aria-hidden="true" />
                Call
              </a>
            ) : null}
            <Button
              variant="primary"
              disabled={bookingDisabled}
              title={bookingHint}
              onClick={onBookAppointment}
            >
              <CalendarPlus className="size-4" aria-hidden="true" />
              Book appointment
            </Button>
          </>
        }
      />
    </div>
  )
}
