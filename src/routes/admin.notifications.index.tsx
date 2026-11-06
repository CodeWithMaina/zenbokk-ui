import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Activity } from 'lucide-react'
import { NotificationTrendChart } from '../components/admin/notifications/NotificationTrendChart'
import {
  ClassificationBadge,
  channelLabel,
  formatCount,
  formatPercent,
  formatTimestamp,
  humanize,
  relativeAge,
  WorkerBadge,
} from '../components/admin/notifications/shared'
import { Alert } from '../components/ui/alert'
import { Card, SectionCard } from '../components/ui/card'
import { DescriptionList, DescriptionRow } from '../components/ui/description-list'
import { EmptyState } from '../components/ui/empty-state'
import { SegmentedControl } from '../components/ui/segmented-control'
import { Skeleton } from '../components/ui/skeleton'
import { StatStrip } from '../components/ui/stat-tile'
import {
  useAdminNotificationAnalytics,
  useAdminNotificationDelivery,
  useAdminNotificationLogs,
} from '../lib/admin/use-admin-notifications'
import { errorMessage } from '../lib/api/client'
import { pluralize } from '../lib/format'

export const Route = createFileRoute('/admin/notifications/')({
  component: AdminNotificationDashboard,
})

type Range = '7d' | '30d' | '90d'

const RANGE_DAYS: Record<Range, number> = { '7d': 7, '30d': 30, '90d': 90 }

/**
 * Global notification monitoring dashboard.
 *
 * Every figure comes from the delivery ledger; the alert panel only reports
 * conditions the ledger actually evidences (backlog, failures, stalled worker),
 * so an administrator is never told a channel is healthy on configuration alone.
 */
function AdminNotificationDashboard() {
  const [range, setRange] = useState<Range>('30d')
  const analytics = useAdminNotificationAnalytics({ days: RANGE_DAYS[range] })
  const delivery = useAdminNotificationDelivery()
  const recent = useAdminNotificationLogs({ page: 1, pageSize: 10 })

  const summary = analytics.data
  const monitoring = delivery.data

  const alerts: { tone: 'warning' | 'danger'; title: string; body: string }[] = []
  if (monitoring) {
    if (monitoring.workerState === 'stalled') {
      alerts.push({
        tone: 'danger',
        title: 'Delivery worker appears stalled',
        body: monitoring.workerEvidence,
      })
    }
    if (monitoring.pending > 25) {
      alerts.push({
        tone: 'warning',
        title: 'Notification backlog building up',
        body: `${monitoring.pending} notifications are queued; the oldest has waited ${relativeAge(monitoring.oldestPendingAgeSeconds)}.`,
      })
    }
    for (const channel of monitoring.channels) {
      if (channel.health.state === 'unhealthy') {
        alerts.push({
          tone: 'danger',
          title: `${channelLabel(channel.channel)} provider unhealthy`,
          body: channel.health.evidence,
        })
      }
      if (channel.registered && !channel.configured) {
        alerts.push({
          tone: 'warning',
          title: `${channelLabel(channel.channel)} channel is not configured`,
          body: channel.health.evidence,
        })
      }
    }
  }
  if (summary && summary.failureRatePercent !== null && summary.failureRatePercent >= 20) {
    alerts.push({
      tone: 'warning',
      title: 'High failure rate',
      body: `${formatPercent(summary.failureRatePercent)} of attempts failed in the selected period.`,
    })
  }

  return (
    <div className="flex flex-col gap-[1rem]">
      <Card className="p-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-heading font-bold tracking-snug">Delivery overview</h2>
            <p className="mt-[0.15rem] text-meta text-muted">
              Aggregated from real delivery records only.
            </p>
          </div>
          <SegmentedControl<Range>
            label="Reporting period"
            value={range}
            onValueChange={setRange}
            options={[
              { value: '7d', label: '7 days' },
              { value: '30d', label: '30 days' },
              { value: '90d', label: '90 days' },
            ]}
          />
        </div>
      </Card>

      {alerts.length > 0 ? (
        <div className="flex flex-col gap-[0.6rem]">
          {alerts.map((alert, index) => (
            <Alert key={index} tone={alert.tone} title={alert.title}>
              {alert.body}
            </Alert>
          ))}
        </div>
      ) : null}

      {analytics.isError ? (
        <Alert tone="danger" title="We could not load notification analytics">
          {errorMessage(analytics.error, 'Try again in a moment.')}
        </Alert>
      ) : null}

      <SectionCard title="Totals" description={`Last ${RANGE_DAYS[range]} days`}>
        {analytics.isPending ? (
          <Skeleton className="h-20 rounded-card" />
        ) : (
          <StatStrip
            items={[
              { value: formatCount(summary?.totalNotifications), label: 'Total notifications' },
              { value: formatCount(summary?.sent), label: 'Delivered' },
              { value: formatCount(summary?.failed), label: 'Failed' },
              { value: formatCount(summary?.pending), label: 'Pending' },
              { value: formatCount(summary?.processing), label: 'Processing' },
              {
                value: formatPercent(summary?.deliverySuccessRatePercent ?? null),
                label: 'Success rate',
              },
            ]}
          />
        )}
      </SectionCard>

      <SectionCard title="Delivery trend" description="Delivered, failed and pending per day">
        {analytics.isPending ? (
          <Skeleton className="h-60 rounded-card" />
        ) : (summary?.dailyTrend.length ?? 0) === 0 ? (
          <EmptyState
            icon={<Activity className="size-5" />}
            title="No delivery activity in this period"
            description="The trend appears once notifications are processed."
          />
        ) : (
          <NotificationTrendChart
            points={summary?.dailyTrend ?? []}
            ariaLabel="Daily notification delivery trend"
          />
        )}
      </SectionCard>

      <div className="grid grid-cols-2 gap-[1rem] max-lg:grid-cols-1">
        <SectionCard title="By channel">
          {analytics.isPending ? (
            <Skeleton className="h-32 rounded-card" />
          ) : (summary?.byChannel.length ?? 0) === 0 ? (
            <p className="text-meta text-muted">No channel activity in this period.</p>
          ) : (
            <DescriptionList>
              {(summary?.byChannel ?? []).map((entry) => (
                <DescriptionRow
                  key={entry.key}
                  label={channelLabel(entry.key)}
                  description={`${formatCount(entry.sent)} delivered · ${formatCount(entry.failed)} failed`}
                  value={
                    <span className="text-right">
                      <b className="tabular">{formatCount(entry.total)}</b>
                      <span className="ml-2 text-caption text-muted">
                        {formatPercent(entry.successRatePercent)}
                      </span>
                    </span>
                  }
                />
              ))}
            </DescriptionList>
          )}
        </SectionCard>

        <SectionCard title="Provider performance">
          {analytics.isPending ? (
            <Skeleton className="h-32 rounded-card" />
          ) : (summary?.providerPerformance.length ?? 0) === 0 ? (
            <p className="text-meta text-muted">No provider activity in this period.</p>
          ) : (
            <DescriptionList>
              {(summary?.providerPerformance ?? []).map((entry) => (
                <DescriptionRow
                  key={entry.channel}
                  label={channelLabel(entry.channel)}
                  description={
                    entry.averageDeliverySeconds === null
                      ? 'No completed deliveries yet'
                      : `Average delivery ${entry.averageDeliverySeconds}s`
                  }
                  value={formatPercent(entry.successRatePercent)}
                />
              ))}
            </DescriptionList>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-2 gap-[1rem] max-lg:grid-cols-1">
        <SectionCard title="By notification type">
          {analytics.isPending ? (
            <Skeleton className="h-32 rounded-card" />
          ) : (summary?.byType.length ?? 0) === 0 ? (
            <p className="text-meta text-muted">No notifications in this period.</p>
          ) : (
            <DescriptionList>
              {(summary?.byType ?? []).slice(0, 10).map((entry) => (
                <DescriptionRow key={entry.key} label={humanize(entry.key)} value={formatCount(entry.total)} />
              ))}
            </DescriptionList>
          )}
        </SectionCard>

        <SectionCard
          title="By business"
          description="Busiest senders in this period"
          action={
            <Link to="/admin/notifications/businesses" className="text-meta font-semibold text-accent">
              Manage
            </Link>
          }
        >
          {analytics.isPending ? (
            <Skeleton className="h-32 rounded-card" />
          ) : (summary?.byBusiness.length ?? 0) === 0 ? (
            <p className="text-meta text-muted">No business activity in this period.</p>
          ) : (
            <DescriptionList>
              {(summary?.byBusiness ?? []).slice(0, 10).map((entry) => (
                <DescriptionRow
                  key={entry.key}
                  label={entry.label}
                  description={`${formatCount(entry.failed)} failed`}
                  value={formatCount(entry.total)}
                />
              ))}
            </DescriptionList>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Queue and worker health"
        description={monitoring ? monitoring.workerEvidence : undefined}
        action={monitoring ? <WorkerBadge state={monitoring.workerState} /> : null}
      >
        {delivery.isPending ? (
          <Skeleton className="h-24 rounded-card" />
        ) : monitoring ? (
          <StatStrip
            items={[
              { value: formatCount(monitoring.queueDepth), label: 'Queue depth' },
              { value: formatCount(monitoring.processing), label: 'Processing' },
              { value: formatCount(monitoring.failed), label: 'Failed' },
              { value: formatCount(monitoring.deadLettered), label: 'Dead-lettered' },
              { value: formatCount(monitoring.retryScheduled), label: 'Retry scheduled' },
              { value: relativeAge(monitoring.oldestPendingAgeSeconds), label: 'Oldest pending' },
            ]}
          />
        ) : null}
      </SectionCard>

      <SectionCard
        title="Recent activity"
        description="Newest notification records across the platform"
        action={
          <Link to="/admin/notifications/logs" className="text-meta font-semibold text-accent">
            Open log explorer
          </Link>
        }
      >
        {recent.isPending ? (
          <Skeleton className="h-40 rounded-card" />
        ) : (recent.data?.items.length ?? 0) === 0 ? (
          <EmptyState
            icon={<Activity className="size-5" />}
            title="No notifications yet"
            description="Records appear here as the platform sends notifications."
          />
        ) : (
          <DescriptionList>
            {(recent.data?.items ?? []).map((item) => (
              <DescriptionRow
                key={item.id}
                label={humanize(item.notificationType)}
                description={`${channelLabel(item.channel)} → ${item.recipientMasked} · ${formatTimestamp(item.createdAtUtc)}`}
                value={<ClassificationBadge classification={item.classification} />}
              />
            ))}
          </DescriptionList>
        )}
        {recent.data ? (
          <p className="mt-[0.8rem] text-caption text-muted">
            {pluralize(recent.data.totalCount, 'notification record')} in total.
          </p>
        ) : null}
      </SectionCard>
    </div>
  )
}
