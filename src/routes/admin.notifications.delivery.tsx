import { createFileRoute } from '@tanstack/react-router'
import { Activity } from 'lucide-react'
import { HealthBadge, channelLabel, formatCount, formatTimestamp, relativeAge, WorkerBadge } from '../components/admin/notifications/shared'
import { Alert } from '../components/ui/alert'
import { Card, SectionCard } from '../components/ui/card'
import { DescriptionList, DescriptionRow } from '../components/ui/description-list'
import { Skeleton } from '../components/ui/skeleton'
import { StatStrip } from '../components/ui/stat-tile'
import { useAdminNotificationDelivery } from '../lib/admin/use-admin-notifications'
import { errorMessage } from '../lib/api/client'

export const Route = createFileRoute('/admin/notifications/delivery')({
  component: AdminNotificationDelivery,
})

/**
 * Real-time delivery monitoring.
 *
 * Health is reported from delivery evidence, not from configuration: a channel
 * with settings but no recent attempts is shown as "unknown" so an operator is
 * never told a provider is healthy when nothing has been proved.
 */
function AdminNotificationDelivery() {
  const query = useAdminNotificationDelivery()
  const monitoring = query.data

  if (query.isError) {
    return (
      <Alert tone="danger" title="We could not load delivery monitoring">
        {errorMessage(query.error, 'Try again in a moment.')}
      </Alert>
    )
  }

  if (query.isPending || !monitoring) {
    return <Skeleton className="h-64 rounded-card" />
  }

  return (
    <div className="flex flex-col gap-[1rem]">
      <Card className="p-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-heading font-bold tracking-snug">Queue status</h2>
            <p className="mt-[0.15rem] text-meta text-muted">{monitoring.workerEvidence}</p>
          </div>
          <WorkerBadge state={monitoring.workerState} />
        </div>
      </Card>

      <SectionCard title="Backlog" description={`Updated ${formatTimestamp(monitoring.updatedAtUtc)}`}>
        <StatStrip
          items={[
            { value: formatCount(monitoring.queueDepth), label: 'Queue depth' },
            { value: formatCount(monitoring.pending), label: 'Pending' },
            { value: formatCount(monitoring.processing), label: 'Processing' },
            { value: formatCount(monitoring.failed), label: 'Failed' },
            { value: formatCount(monitoring.deadLettered), label: 'Dead-lettered' },
            { value: formatCount(monitoring.retryScheduled), label: 'Retry scheduled' },
            { value: formatCount(monitoring.retryActivity24h), label: 'Retries (24h)' },
            { value: relativeAge(monitoring.oldestPendingAgeSeconds), label: 'Oldest pending' },
          ]}
        />
      </SectionCard>

      <div className="grid grid-cols-2 gap-[1rem] max-lg:grid-cols-1">
        <SectionCard title="Worker health">
          <DescriptionList>
            <DescriptionRow
              label="State"
              value={<WorkerBadge state={monitoring.workerState} />}
            />
            <DescriptionRow
              label="Last worker activity"
              value={formatTimestamp(monitoring.lastWorkerActivityAtUtc)}
            />
            <DescriptionRow
              label="Last successful delivery"
              value={formatTimestamp(monitoring.lastSuccessfulDeliveryAtUtc)}
            />
          </DescriptionList>
        </SectionCard>

        <SectionCard title="Pending backlog by age">
          {monitoring.backlog.length === 0 ? (
            <p className="text-meta text-muted">Nothing is queued.</p>
          ) : (
            <DescriptionList>
              {monitoring.backlog.map((bucket) => (
                <DescriptionRow key={bucket.bucket} label={bucket.bucket} value={formatCount(bucket.count)} />
              ))}
            </DescriptionList>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Channel health"
        description="Derived from recent delivery evidence over the last 24 hours"
      >
        {monitoring.channels.length === 0 ? (
          <p className="text-meta text-muted">No channels are registered on this deployment.</p>
        ) : (
          <DescriptionList>
            {monitoring.channels.map((channel) => (
              <DescriptionRow
                key={channel.channel}
                label={channelLabel(channel.channel)}
                description={channel.health.evidence}
                value={
                  <span className="flex items-center gap-3">
                    <span className="text-caption text-muted tabular">
                      {formatCount(channel.health.recentAttempts)} attempts ·{' '}
                      {formatCount(channel.health.recentFailures)} failed
                    </span>
                    <HealthBadge state={channel.health.state} />
                  </span>
                }
              />
            ))}
          </DescriptionList>
        )}
      </SectionCard>

      <Alert tone="info" title="How health is determined">
        A channel is only reported healthy when recent delivery evidence supports it. Configured but
        unused channels stay &ldquo;unknown&rdquo;, and channels with no delivery implementation are
        reported as &ldquo;not shipped&rdquo;.
      </Alert>

      <p className="flex items-center gap-2 text-caption text-muted">
        <Activity className="size-[0.9rem]" aria-hidden="true" />
        This page refreshes on demand — reload to take a fresh reading.
      </p>
    </div>
  )
}
