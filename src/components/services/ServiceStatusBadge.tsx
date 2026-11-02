import { StatusPill } from '../ui/badge'
import { serviceStatusLabel, serviceStatusTone } from '../../lib/services'

export type ServiceStatusBadgeProps = {
  /** `active | paused | archived`, as the API derives it. */
  status: string
  className?: string
}

/**
 * The service's lifecycle pill.
 *
 * The tone comes from the module's own mapping rather than from a colour here,
 * so the same status reads identically on a card, a detail page and an action
 * sheet — and a new status needs one edit, not three.
 */
export function ServiceStatusBadge({ status, className }: ServiceStatusBadgeProps) {
  return (
    <StatusPill status={status} tone={serviceStatusTone(status)} className={className}>
      {serviceStatusLabel(status)}
    </StatusPill>
  )
}
