import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Card } from './card'

export type MetricTileProps = {
  value: ReactNode
  label: ReactNode
  className?: string
}

/**
 * Bordered headline number from the client detail overview. Use `MetricGrid`
 * when several sit side by side.
 */
export function MetricTile({ value, label, className }: MetricTileProps) {
  return (
    <Card className={cn('min-w-0 p-[0.9rem]', className)}>
      <b className="block text-metric leading-[1.15] font-bold tracking-tight tabular">
        {value}
      </b>
      <span className="mt-[0.1rem] block text-meta text-muted">{label}</span>
    </Card>
  )
}

export type MetricItem = {
  value: ReactNode
  label: ReactNode
}

export type MetricGridProps = {
  items: readonly MetricItem[]
  className?: string
}

/** Responsive row of `MetricTile`s. */
export function MetricGrid({ items, className }: MetricGridProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-[0.7rem]',
        className,
      )}
    >
      {items.map((item, index) => (
        <MetricTile key={index} value={item.value} label={item.label} />
      ))}
    </div>
  )
}
