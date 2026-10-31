import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { GrowthChart } from '../components/admin/GrowthChart'
import type { GrowthSeries } from '../components/admin/GrowthChart'
import { Alert } from '../components/ui/alert'
import { Card, SectionCard } from '../components/ui/card'
import { MetricGrid } from '../components/ui/metric-tile'
import { PageHeader } from '../components/ui/page-header'
import { SegmentedControl } from '../components/ui/segmented-control'
import { Skeleton } from '../components/ui/skeleton'
import { useAdminDashboard, useAdminGrowth } from '../lib/admin/use-admin'
import { errorMessage } from '../lib/api/client'
import { formatNumber, pluralize } from '../lib/format'

export const Route = createFileRoute('/admin/')({
  component: AdminOverview,
})

const PERIODS = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
] as const

type Period = (typeof PERIODS)[number]['value']

/** Platform-wide numbers, with the growth series the API actually exposes. */
function AdminOverview() {
  const [period, setPeriod] = useState<Period>('30d')
  const dashboard = useAdminDashboard()
  const growth = useAdminGrowth(period)

  const series: GrowthSeries[] = growth.data
    ? [
        {
          key: 'customers',
          label: 'New customers',
          color: 'var(--chart-1)',
          points: growth.data.customers,
        },
        {
          key: 'businesses',
          label: 'New businesses',
          color: 'var(--chart-2)',
          points: growth.data.businesses,
        },
        { key: 'stamps', label: 'Stamps', color: 'var(--chart-3)', points: growth.data.stamps },
        {
          key: 'redemptions',
          label: 'Redemptions',
          color: 'var(--chart-4)',
          points: growth.data.redemptions,
        },
      ]
    : []

  const hasSeries = series.some((entry) => entry.points.length > 0)

  const metrics: { value: number; label: string }[] = [
    { value: dashboard.data?.totalBusinesses ?? 0, label: 'Businesses' },
    { value: dashboard.data?.totalCustomers ?? 0, label: 'Customers' },
    { value: dashboard.data?.totalStaff ?? 0, label: 'Staff' },
    { value: dashboard.data?.totalStamps ?? 0, label: 'Stamps issued' },
    { value: dashboard.data?.totalRedemptions ?? 0, label: 'Redemptions' },
  ]

  return (
    <div>
      <PageHeader
        title="Platform overview"
        description="Every business, customer and stamp on Punched."
      />

      {dashboard.isError ? (
        <Alert tone="danger">
          {errorMessage(dashboard.error, 'We could not load the platform totals.')}{' '}
          <button
            type="button"
            className="link font-semibold"
            onClick={() => void dashboard.refetch()}
          >
            Try again
          </button>
        </Alert>
      ) : (
        <MetricGrid
          items={metrics.map((metric) => ({
            value: dashboard.isPending ? (
              <Skeleton className="h-6 w-14" />
            ) : (
              formatNumber(metric.value)
            ),
            label: metric.label,
          }))}
        />
      )}

      <div className="mt-[1rem] grid gap-[1rem] lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <SectionCard
          title="Growth"
          description={`New customers, businesses, stamps and redemptions over the last ${period}.`}
          action={
            <SegmentedControl
              label="Growth period"
              value={period}
              options={PERIODS.map((option) => ({ value: option.value, label: option.label }))}
              onValueChange={(next) => setPeriod(next)}
            />
          }
        >
          {growth.isError ? (
            <Alert tone="warning">
              {errorMessage(growth.error, 'The growth series did not load.')}{' '}
              <button
                type="button"
                className="link font-semibold"
                onClick={() => void growth.refetch()}
              >
                Try again
              </button>
            </Alert>
          ) : growth.isPending ? (
            <Skeleton className="h-[16rem] rounded-card" />
          ) : hasSeries ? (
            <GrowthChart series={series} ariaLabel={`Platform growth over the last ${period}`} />
          ) : (
            <p className="py-8 text-center text-meta text-muted">
              No activity recorded in this period yet.
            </p>
          )}
        </SectionCard>

        <Card className="p-card">
          <p className="eyebrow">Today</p>
          <h2 className="mt-[0.3rem] text-heading font-bold tracking-snug">Live activity</h2>
          {dashboard.isPending ? (
            <div className="mt-[0.8rem] space-y-2" aria-busy="true">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          ) : (
            <ul className="mt-[0.6rem] list-none divide-y divide-line p-0 text-meta">
              {[
                ['New customers', dashboard.data?.newCustomersToday ?? 0],
                ['New businesses', dashboard.data?.newBusinessesToday ?? 0],
                ['Stamps', dashboard.data?.stampsToday ?? 0],
                ['Redemptions', dashboard.data?.redemptionsToday ?? 0],
              ].map(([label, value]) => (
                <li
                  key={String(label)}
                  className="flex items-center justify-between gap-3 py-[0.6rem]"
                >
                  <span className="text-muted">{label}</span>
                  <b className="font-semibold tabular">{formatNumber(Number(value))}</b>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-[1rem] border-t border-line pt-[0.9rem]">
            <p className="eyebrow">Last 7 days</p>
            <p className="mt-[0.35rem] text-meta text-muted">
              {dashboard.isPending
                ? 'Loading…'
                : `${pluralize(dashboard.data?.newCustomers7d ?? 0, 'customer')} joined and ${pluralize(
                    dashboard.data?.stamps7d ?? 0,
                    'stamp',
                  )} were issued.`}
            </p>
            <p className="mt-[0.5rem] text-caption text-subtle">
              {dashboard.isPending
                ? ''
                : `${pluralize(dashboard.data?.churnedBusinesses ?? 0, 'business', 'businesses')} inactive.`}
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
