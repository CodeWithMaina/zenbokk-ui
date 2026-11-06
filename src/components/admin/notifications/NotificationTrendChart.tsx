import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AdminNotificationTrendPoint } from '../../../lib/admin/notifications-api'
import { formatDay, formatNumber } from '../../../lib/format'

const SERIES = [
  { key: 'sent', label: 'Delivered', color: 'var(--chart-1)' },
  { key: 'failed', label: 'Failed', color: 'var(--chart-4)' },
  { key: 'pending', label: 'Pending', color: 'var(--chart-2)' },
] as const

/**
 * Daily delivery trend.
 *
 * Renders the real ledger aggregates supplied by the API — nothing is estimated
 * client-side. Colours are theme tokens so a theme change reaches the chart.
 */
export function NotificationTrendChart({
  points,
  ariaLabel,
  height = 240,
}: {
  points: readonly AdminNotificationTrendPoint[]
  ariaLabel: string
  height?: number
}) {
  return (
    <div style={{ height }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={[...points]} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <defs>
            {SERIES.map((entry) => (
              <linearGradient key={entry.key} id={`ntf-fill-${entry.key}`} x1="0" y1="0" x2="0" y2="1">
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

          {SERIES.map((entry) => (
            <Area
              key={entry.key}
              type="monotone"
              dataKey={entry.key}
              name={entry.label}
              stroke={entry.color}
              strokeWidth={2}
              fill={`url(#ntf-fill-${entry.key})`}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
