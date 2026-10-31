import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AdminGrowthPoint } from '../../lib/api/types'
import { formatDay, formatNumber } from '../../lib/format'

export type GrowthSeries = {
  /** Field name in the merged row. */
  key: string
  label: string
  /** A token reference, e.g. `var(--chart-1)` — never a raw hex. */
  color: string
  points: AdminGrowthPoint[]
}

type Row = { date: string } & Record<string, number | string>

/** Merge per-metric series into one row per date so a chart can plot them together. */
function mergeSeries(series: readonly GrowthSeries[]): Row[] {
  const rows = new Map<string, Row>()

  for (const entry of series) {
    for (const point of entry.points) {
      const row = rows.get(point.date) ?? { date: point.date }
      row[entry.key] = point.count
      rows.set(point.date, row)
    }
  }

  return [...rows.values()]
    .map((row) => {
      for (const entry of series) {
        if (typeof row[entry.key] !== 'number') row[entry.key] = 0
      }
      return row
    })
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
}

/**
 * Platform growth chart.
 *
 * Recharts renders inline SVG, so the series colours are the theme's chart
 * tokens rather than literals — a theme change reaches the chart with everything
 * else. The chart is a picture of data that is also listed numerically next to
 * it, which is why it carries a label instead of a data table.
 */
export function GrowthChart({
  series,
  ariaLabel,
  height = 260,
}: {
  series: readonly GrowthSeries[]
  ariaLabel: string
  height?: number
}) {
  const rows = mergeSeries(series)

  return (
    <div style={{ height }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <defs>
            {series.map((entry) => (
              <linearGradient key={entry.key} id={`fill-${entry.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={entry.color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={entry.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) => formatDay(value)}
            stroke="var(--chart-axis)"
            fontSize={11}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            stroke="var(--chart-axis)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            labelFormatter={(value) => formatDay(String(value))}
            formatter={(value, name) => [formatNumber(Number(value)), String(name)]}
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
              fill={`url(#fill-${entry.key})`}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
