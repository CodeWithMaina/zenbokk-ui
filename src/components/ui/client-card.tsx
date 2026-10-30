import { Crown } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Avatar } from './avatar'
import type { AvatarSize, AvatarTint } from './avatar'
import { StatusPill } from './badge'
import { Checkbox } from './checkbox'
import { StampDots } from './stamp-dots'

export type ClientSummary = {
  id: string
  name: string
  phone: string
  /** A status understood by `[data-status]`, e.g. active, pending, paused. */
  status: string
  statusLabel?: string
  stamps?: number
  stampGoal?: number
  vip?: boolean
  tint?: AvatarTint
  lastVisit?: string
}

export type ClientCardProps = {
  client: ClientSummary
  onOpen?: (client: ClientSummary) => void
  selected?: boolean
  onSelectedChange?: (selected: boolean) => void
  stampGoal?: number
  avatarSize?: AvatarSize
  className?: string
}

/** Client summary card from the Clients grid. */
export function ClientCard({
  client,
  onOpen,
  selected = false,
  onSelectedChange,
  stampGoal = client.stampGoal ?? 8,
  avatarSize = 'sm',
  className,
}: ClientCardProps) {
  const hasStamps = client.stamps !== undefined
  const goal = Math.max(1, stampGoal)
  const stamps = Math.min(Math.max(0, client.stamps ?? 0), goal)

  return (
    <article
      className={cn(
        'card min-w-0 p-[0.95rem]',
        onOpen && 'card-link',
        selected && 'border-accent bg-selected',
        className,
      )}
    >
      <div className="flex items-start gap-[0.7rem]">
        <Avatar
          name={client.name}
          tint={client.tint}
          size={avatarSize}
          decorative
          className="mt-[0.1rem]"
        />

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-[0.35rem]">
            {onOpen ? (
              <button
                type="button"
                onClick={() => onOpen(client)}
                className="min-w-0 truncate text-left font-semibold tracking-snug hover:underline focus-visible:shadow-ring focus-visible:outline-none"
              >
                {client.name}
              </button>
            ) : (
              <p className="min-w-0 truncate font-semibold tracking-snug">
                {client.name}
              </p>
            )}
            {client.vip ? (
              <Crown
                className="size-[0.85rem] shrink-0 text-warning-ink"
                aria-label="VIP client"
              />
            ) : null}
          </div>

          <a
            href={`tel:${client.phone.replace(/\s/g, '')}`}
            className="mt-[0.1rem] block truncate text-meta text-muted hover:text-fg"
          >
            {client.phone}
          </a>
        </div>

        {onSelectedChange ? (
          <Checkbox
            checked={selected}
            onCheckedChange={onSelectedChange}
            label={`Select ${client.name}`}
            className="mt-[0.05rem]"
          />
        ) : null}
      </div>

      <div className="mt-[0.7rem] flex flex-wrap items-center justify-between gap-x-[0.7rem] gap-y-[0.4rem]">
        <StatusPill status={client.status}>
          {client.statusLabel ?? client.status}
        </StatusPill>

        {hasStamps ? (
          <span className="flex items-center gap-[0.45rem] text-caption text-muted">
            <StampDots stamps={stamps} goal={goal} />
            <span className="tabular">
              {stamps}/{goal}
            </span>
          </span>
        ) : null}

        {client.lastVisit ? (
          <span className="text-caption text-muted">{client.lastVisit}</span>
        ) : null}
      </div>
    </article>
  )
}
