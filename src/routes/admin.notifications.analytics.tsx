import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { NotificationTrendChart } from '../components/admin/notifications/NotificationTrendChart'
import {
  channelLabel,
  formatCount,
  formatPercent,
  humanize,
} from '../components/admin/notifications/shared'
import { Alert } from '../components/ui/alert'
import { Card, SectionCard } from '../components/ui/card'
import { DescriptionList, DescriptionRow } from '../components/ui/description-list'
import { EmptyState } from '../components/ui/empty-state'
import { SegmentedControl } from '../components/ui/segmented-control'
import { Skeleton } from '../components/ui/skeleton'
import { StatStrip } from '../components/ui/stat-tile'
import { useAdminNotificationAnalytics } from '../lib/admin/use-admin-notifications'
import { errorMessage } from '../lib/api/client'

export const Route = createFileRoute('/admin/notifications/analytics')({
  component: AdminNotificationAnalytics,
})

type Range = '7d' | '30d' | '90d'
const RANGE_DAYS: Record<Range, number> = { '7d': 7, '30d': 30, '90d': 90 }

/**
 * Notification reporting.
 *
 * Every figure is derived from the delivery ledger over the selected range — no
 * estimated or fabricated metrics. SMS segment usage is summed from the bodies
 * actually queued.
 */
function AdminNotificationAnalytics() {
  const [range, setRange] = useState<Range>('30d')
  const query = useAdminNotificationAnalytics({ days: RANGE_DAYS[range] })
  const report = query.data

  if (query.isError) {
    return (
      <Alert tone="danger" title="We could not load notification analytics">
        {errorMessage(query.error, 'Try again in a moment.')}
      </Alert>
    )
  }

  return (
    <div className="flex flex-col gap-[1rem]">
      <Card className="p-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-heading font-bold tracking-snug">Delivery reporting</h2>
            <p className="mt-[0.15rem] text-meta text-muted">
              Computed from real delivery records for the selected period.
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

      {query.isPending ? (
        <Skeleton className="h-40 rounded-card" />
      ) : (
        <>
          <SectionCard title="Summary">
            <StatStrip
              items={[
                { value: formatCount(report?.totalNotifications), label: 'Total notifications' },
                { value: formatCount(report?.sent), label: 'Delivered' },
                { value: formatCount(report?.failed), label: 'Failed' },
                { value: formatCount(report?.pending), label: 'Pending' },
                {
                  value: formatPercent(report?.deliverySuccessRatePercent ?? null),
                  label: 'Success rate',
                },
                { value: formatPercent(report?.failureRatePercent ?? null), label: 'Failure rate' },
                { value: formatCount(report?.totalSmsSegments), label: 'SMS segments' },
              ]}
            />
          </SectionCard>

          <SectionCard title="Daily trend">
            {(report?.dailyTrend.length ?? 0) === 0 ? (
              <EmptyState
                icon={<BarChart3 className="size-5" />}
                title="No delivery activity in this period"
                description="Choose a wider range or wait for notifications to be processed."
              />
            ) : (
              <NotificationTrendChart
                points={report?.dailyTrend ?? []}
                ariaLabel="Daily notification delivery trend"
              />
            )}
          </SectionCard>

          <div className="grid grid-cols-2 gap-[1rem] max-lg:grid-cols-1">
            <SectionCard title="By channel">
              <DescriptionList>
                {(report?.byChannel ?? []).map((entry) => (
                  <DescriptionRow
                    key={entry.key}
                    label={channelLabel(entry.key)}
                    description={`${formatCount(entry.sent)} delivered · ${formatCount(entry.failed)} failed`}
                    value={formatCount(entry.total)}
                  />
                ))}
              </DescriptionList>
            </SectionCard>

            <SectionCard title="Provider performance">
              <DescriptionList>
                {(report?.providerPerformance ?? []).map((entry) => (
                  <DescriptionRow
                    key={entry.channel}
                    label={channelLabel(entry.channel)}
                    description={
                      entry.averageDeliverySeconds === null
                        ? 'No completed deliveries'
                        : `Average delivery ${entry.averageDeliverySeconds}s`
                    }
                    value={formatPercent(entry.successRatePercent)}
                  />
                ))}
              </DescriptionList>
            </SectionCard>
          </div>

          <div className="grid grid-cols-2 gap-[1rem] max-lg:grid-cols-1">
            <SectionCard title="By notification type">
              <DescriptionList>
                {(report?.byType ?? []).slice(0, 15).map((entry) => (
                  <DescriptionRow
                    key={entry.key}
                    label={humanize(entry.key)}
                    description={`${formatCount(entry.failed)} failed`}
                    value={formatCount(entry.total)}
                  />
                ))}
              </DescriptionList>
            </SectionCard>

            <SectionCard title="By business">
              <DescriptionList>
                {(report?.byBusiness ?? []).slice(0, 15).map((entry) => (
                  <DescriptionRow
                    key={entry.key}
                    label={entry.label}
                    description={`${formatCount(entry.failed)} failed`}
                    value={formatCount(entry.total)}
                  />
                ))}
              </DescriptionList>
            </SectionCard>
          </div>
        </>
      )}
    </div>
  )
}
