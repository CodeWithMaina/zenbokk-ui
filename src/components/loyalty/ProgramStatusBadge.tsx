import { StatusPill } from '../ui/badge'
import { programStatusDataStatus, programStatusLabel } from '../../lib/loyalty/mappers'

export type ProgramStatusBadgeProps = {
  status: string | null | undefined
  className?: string
}

/**
 * Lifecycle pill for a program. The label and the colour both come from
 * `mappers.ts`, and the colour is a `[data-status]` token the theme already
 * defines — so a status can never be styled inconsistently across screens.
 */
export function ProgramStatusBadge({ status, className }: ProgramStatusBadgeProps) {
  return (
    <StatusPill status={programStatusDataStatus(status)} className={className}>
      {programStatusLabel(status)}
    </StatusPill>
  )
}
