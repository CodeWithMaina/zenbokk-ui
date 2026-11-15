import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { BreakdownList } from '../components/finances/BreakdownList'
import { PeriodPicker } from '../components/finances/PeriodPicker'
import { TrendChart } from '../components/finances/TrendChart'
import { ModulePlaceholder } from '../components/shell/ModulePlaceholder'
import { Alert } from '../components/ui/alert'
import { Card } from '../components/ui/card'
import { MetricGrid } from '../components/ui/metric-tile'
import { PageHeader } from '../components/ui/page-header'
import { Skeleton } from '../components/ui/skeleton'
import { errorMessage } from '../lib/api/client'
import { useDashboardContext } from '../lib/dashboard/dashboard-context'
import { MODULE } from '../lib/entitlements'
import { useFinancialAnalytics } from '../lib/finances/api'
import { DEFAULT_PERIOD, periodLabel } from '../lib/finances/period'
import { formatDate, money } from '../lib/format'

export const Route = createFileRoute('/dashboard/finances/analytics')({
  component: FinancialAnalyticsPage,
})

/**
 * Financial analytics — the detailed view, separate from the at-a-glance overview.
 *
 * Everything here is derived from the ledger alone, so no figure double-counts a payment that also exists
 * in the payments module: a payment appears once, as its income row. Pending and rejected money is shown
 * for what it is — not yet revenue.
 */
function FinancialAnalyticsPage() {
  const { hasModule, hasPermission } = useDashboardContext()
  const [period, setPeriod] = useState({ period: DEFAULT_PERIOD as string, from: '', to: '' })

  const enabled = hasModule(MODULE.financials) && hasPermission('finances.analytics.view')
  const analytics = useFinancialAnalytics(period.period, period.from || null, period.to || null, enabled)

  if (!enabled) {
    return <ModulePlaceholder navKey="finances-analytics" />
  }

  const data = analytics.data

  return (
    <>
      <PageHeader
        title="Financial analytics"
        description="Where the money came from, where it went, and what it nets to — from your recorded books."
        actions={
          <Link to="/dashboard/finances" className="link text-meta">
            Back to overview
          </Link>
        }
      />

      <div className="mb-4">
        <PeriodPicker
          period={period.period}
          from={period.from}
          to={period.to}
          onChange={setPeriod}
          compact
        />
      </div>

      {analytics.isError ? (
        <Alert tone="danger">{errorMessage(analytics.error, 'The analytics could not be loaded.')}</Alert>
      ) : null}

      {analytics.isLoading && !data ? (
        <div className="grid gap-[0.6rem]">
          <Skeleton className="h-[6rem]" />
          <Skeleton className="h-[14rem]" />
        </div>
      ) : null}

      {data ? (
        <>
          <MetricGrid
            items={[
              { value: money(data.performance.totalIncome), label: 'Total income' },
              { value: money(data.performance.totalExpenses), label: 'Total expenses' },
              { value: money(data.performance.netOperatingResult), label: 'Net result' },
              { value: money(data.performance.outstandingBalances), label: 'Outstanding' },
              { value: `${data.performance.refundRate}%`, label: 'Refund rate' },
              { value: money(data.performance.averageTransactionValue), label: 'Avg transaction' },
            ]}
          />

          <p className="mt-[0.5rem] text-meta text-muted">
            {periodLabel(data.period)} · {formatDate(data.from)} – {formatDate(data.to)}. Income is money
            verified in your books; outstanding is what live appointments still owe, not income minus
            appointment values.
          </p>

          <Card className="mt-5 p-[0.9rem]">
            <div className="flex flex-wrap items-baseline justify-between gap-[0.5rem]">
              <h2 className="text-label font-semibold">Revenue over time</h2>
              <span className="text-caption text-muted">Grouped by {data.revenue.granularity}</span>
            </div>
            <div className="mt-[0.8rem]">
              <TrendChart
                ariaLabel={`Verified income by ${data.revenue.granularity}`}
                series={[
                  {
                    key: 'income',
                    label: 'Verified income',
                    color: 'var(--chart-1)',
                    points: data.revenue.overTime,
                  },
                ]}
              />
            </div>
            <p className="mt-[0.5rem] text-caption text-muted">
              Average transaction value:{' '}
              <b className="font-semibold text-fg">{money(data.revenue.averageTransactionValue)}</b>
            </p>
          </Card>

          <Card className="mt-5 p-[0.9rem]">
            <h2 className="text-label font-semibold">Income against expenses</h2>
            <div className="mt-[0.8rem]">
              <TrendChart
                ariaLabel="Verified income against expenses over time"
                series={[
                  {
                    key: 'income',
                    label: 'Income',
                    color: 'var(--chart-1)',
                    points: data.revenue.overTime,
                  },
                  {
                    key: 'expenses',
                    label: 'Expenses',
                    color: 'var(--chart-4)',
                    points: data.expenses.overTime,
                  },
                ]}
              />
            </div>
            <p className="mt-[0.5rem] text-caption text-muted">
              Net operating result:{' '}
              <b className="font-semibold text-fg">{money(data.performance.netOperatingResult)}</b> · margin{' '}
              {data.performance.marginPercentage}%
            </p>
          </Card>

          <div className="mt-5 grid gap-[0.9rem] lg:grid-cols-2">
            <Card className="p-[0.9rem]">
              <h2 className="text-label font-semibold">Revenue by source</h2>
              <p className="text-caption text-muted">
                Appointment money compared with everything the business brought in itself.
              </p>
              <BreakdownList className="mt-[0.8rem]" items={data.revenue.bySource} />
            </Card>

            <Card className="p-[0.9rem]">
              <h2 className="text-label font-semibold">Revenue by payment method</h2>
              <p className="text-caption text-muted">How verified money actually reached you.</p>
              <BreakdownList className="mt-[0.8rem]" items={data.revenue.byPaymentMethod} />
            </Card>

            <Card className="p-[0.9rem]">
              <h2 className="text-label font-semibold">Revenue by service</h2>
              <p className="text-caption text-muted">Which services earned, from appointment income.</p>
              <BreakdownList className="mt-[0.8rem]" items={data.revenue.byService} />
            </Card>

            <Card className="p-[0.9rem]">
              <h2 className="text-label font-semibold">Revenue by staff member</h2>
              <p className="text-caption text-muted">Who earned it, where the appointment records it.</p>
              <BreakdownList className="mt-[0.8rem]" items={data.revenue.byStaff} />
            </Card>

            <Card className="p-[0.9rem]">
              <h2 className="text-label font-semibold">Revenue by category</h2>
              <p className="text-caption text-muted">Which service category the money came from.</p>
              <BreakdownList className="mt-[0.8rem]" items={data.revenue.byCategory} />
            </Card>

            <Card className="p-[0.9rem]">
              <h2 className="text-label font-semibold">Expenses by category</h2>
              <p className="text-caption text-muted">
                {money(data.expenses.total)} across {data.expenses.count} expense(s).
              </p>
              <BreakdownList className="mt-[0.8rem]" items={data.expenses.byCategory} />
            </Card>
          </div>

          <Card className="mt-5 p-[0.9rem]">
            <h2 className="text-label font-semibold">Payment analysis</h2>
            <p className="text-caption text-muted">
              Only verified money is revenue. Pending money is waiting on a decision; rejected money never
              counts.
            </p>

            <div className="mt-[0.8rem]">
              <MetricGrid
                items={[
                  {
                    value: `${data.payments.verifiedCount}`,
                    label: `Verified ${money(data.payments.verifiedAmount)}`,
                  },
                  {
                    value: `${data.payments.pendingCount}`,
                    label: `Pending ${money(data.payments.pendingAmount)}`,
                  },
                  {
                    value: `${data.payments.rejectedCount}`,
                    label: `Rejected ${money(data.payments.rejectedAmount)}`,
                  },
                  {
                    value: `${data.payments.refundCount}`,
                    label: `Refunds ${money(data.payments.refundTotal)}`,
                  },
                ]}
              />
            </div>

            <h3 className="mt-[0.9rem] text-meta font-semibold">By payment method</h3>
            <BreakdownList className="mt-[0.6rem]" items={data.payments.byMethod} />

            <h3 className="mt-[0.9rem] text-meta font-semibold">Refunds over time</h3>
            <div className="mt-[0.6rem]">
              <TrendChart
                ariaLabel={`Refunds by ${data.revenue.granularity}`}
                series={[
                  {
                    key: 'refunds',
                    label: 'Refunds',
                    color: 'var(--chart-2)',
                    points: data.payments.refundsOverTime,
                  },
                ]}
              />
            </div>
          </Card>

        </>
      ) : null}
    </>
  )
}
