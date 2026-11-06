import { Badge } from '../../ui/badge'
import { formatDate, formatNumber, formatTime } from '../../../lib/format'

/** Shared presentation helpers for the admin notification module. */

const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  sms: 'SMS',
  push: 'Push',
  in_app: 'In-app',
}

export function channelLabel(channel: string): string {
  return CHANNEL_LABELS[channel] ?? channel
}

export const NOTIFICATION_CHANNELS = ['email', 'sms', 'push', 'in_app'] as const

export function humanize(value: string): string {
  if (!value) return value
  const spaced = value.replace(/[._]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export function formatTimestamp(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return `${formatDate(date)} · ${formatTime(iso)}`
}

export function relativeAge(seconds: number | null): string {
  if (seconds === null) return '—'
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  if (seconds < 86_400) return `${Math.round(seconds / 3600)}h`
  return `${Math.round(seconds / 86_400)}d`
}

export function formatPercent(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)}%`
}

export function formatCount(value: number | null | undefined): string {
  return formatNumber(value ?? 0)
}

/** Delivery classification → semantic badge. */
export function ClassificationBadge({ classification }: { classification: string }) {
  switch (classification) {
    case 'delivered':
      return <Badge tone="success">Delivered</Badge>
    case 'pending':
      return <Badge tone="info">Pending</Badge>
    case 'processing':
      return <Badge tone="info">Processing</Badge>
    case 'cancelled':
      return <Badge tone="neutral">Cancelled</Badge>
    case 'permanent_failure':
      return <Badge tone="danger">Permanent failure</Badge>
    case 'retry_exhausted':
      return <Badge tone="danger">Retries exhausted</Badge>
    case 'transient_failure':
      return <Badge tone="warning">Transient failure</Badge>
    default:
      return <Badge tone="neutral">Unknown</Badge>
  }
}

/** Provider / channel health → semantic badge. */
export function HealthBadge({ state }: { state: string }) {
  switch (state) {
    case 'healthy':
      return <Badge tone="success">Healthy</Badge>
    case 'degraded':
      return <Badge tone="warning">Degraded</Badge>
    case 'unhealthy':
      return <Badge tone="danger">Unhealthy</Badge>
    case 'unconfigured':
      return <Badge tone="neutral">Not configured</Badge>
    case 'not_registered':
      return <Badge tone="neutral">Not shipped</Badge>
    case 'disabled':
      return <Badge tone="neutral">Disabled</Badge>
    case 'configured':
      return <Badge tone="info">Configured</Badge>
    case 'incomplete':
    case 'unauthenticated':
      return <Badge tone="warning">{humanize(state)}</Badge>
    default:
      return <Badge tone="neutral">Unknown</Badge>
  }
}

/** Worker state → semantic badge. */
export function WorkerBadge({ state }: { state: string }) {
  switch (state) {
    case 'running':
      return <Badge tone="success">Running</Badge>
    case 'stalled':
      return <Badge tone="danger">Stalled</Badge>
    case 'idle':
      return <Badge tone="neutral">Idle</Badge>
    default:
      return <Badge tone="neutral">Unknown</Badge>
  }
}
