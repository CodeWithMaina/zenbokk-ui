import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { FinancialTrendPoint } from '../../lib/finances/api'
import { money } from '../../lib/format'

export type TrendSeries = {
  /** Field name in the merged row. */
  key: string
  label: string
  /** A token reference, e.g. `var(--chart-1)` — never a raw hex. */
  color: string
  points: readonly FinancialTrendPoint[]
}

type Row = { bucket: string; label: string } & Record<string, number | string>

/**
 * Merges per-metric series so one chart can plot them together.
 *
 * The buckets come from the server (already grouped by the granularity the period implies), so the chart
 * never re-buckets anything: two screens showing the same period cannot disagree about where a bucket
 * starts.
 */
function mergeSeries(series: readonly TrendSeries[]): Row[] {
  const rows = new Map<string, Row>()

  for (const entry of series) {
    for (const point of entry.points) {
      const row = rows.get(point.period) ?? { bucket: point.period, label: point.label }
      row[entry.key] = point.amount
      rows.set(point.period, row)
    }
  }

  return [...rows.values()]
    .map((row) => {
      for (const entry of series) {
        if (typeof row[entry.key] !== 'number') row[entry.key] = 0
      }
      return row
    })
    .sort((a, b) => a.bucket.localeCompare(b.bucket))
}

/**
 * A money trend, over time.
 *
 * Recharts renders inline SVG, so the series colours are the theme's chart tokens rather than literals.
 * Every figure it draws is also listed numerically beside it, which is why the chart carries a label
 * instead of a hidden data table.
 */
export function TrendChart({
  series,
  ariaLabel,
  height = 240,
  emptyLabel = 'Nothing recorded for this period.',
}: {
  series: readonly TrendSeries[]
  ariaLabel: string
  height?: number
  emptyLabel?: string
}) {
  const rows = mergeSeries(series)

  if (rows.length === 0) {
    return <p className="text-meta text-muted">{emptyLabel}</p>
  }

  return (
    <div style={{ height }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <defs>
            {series.map((entry) => (
              <linearGradient key={entry.key} id={`finance-fill-${entry.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={entry.color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={entry.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="var(--chart-axis)"
            fontSize={11}
            tickLine={false}
            minTickGap={20}
          />
          <YAxis
            stroke="var(--chart-axis)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(value: number) => money(Number(value))}
          />
          <Tooltip
            formatter={(value, name) => [money(Number(value)), String(name)]}
            contentStyle={{
              background: 'var(--surface-raised)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-md)',
              fontSize: 12,
              color: 'var(--fg)',
            }}
          />

          {series.map((entry) => (
            <Area
              key={entry.key}
              type="monotone"
              dataKey={entry.key}
              name={entry.label}
              stroke={entry.color}
              strokeWidth={2}
              fill={`url(#finance-fill-${entry.key})`}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
