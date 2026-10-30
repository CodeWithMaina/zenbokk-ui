import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type StatTileProps = {
  value: ReactNode
  label: ReactNode
  className?: string
}

/** One metric in a `StatStrip` (the overview count row). */
export function StatTile({ value, label, className }: StatTileProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <b className="block text-metric leading-[1.15] font-bold tracking-tight tabular">
        {value}
      </b>
      <span className="mt-[0.1rem] block text-meta text-muted">{label}</span>
    </div>
  )
}

export type StatItem = {
  value: ReactNode
  label: ReactNode
}

export type StatStripProps = {
  items: readonly StatItem[]
  className?: string
}

/** Row of headline counts above a list, stacked on phones. */
export function StatStrip({ items, className }: StatStripProps) {
  return (
    <div
      className={cn(
        'my-4 grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-4 max-sm:grid-cols-1 max-sm:gap-[0.9rem]',
        className,
      )}
    >
      {items.map((item, index) => (
        <StatTile key={index} value={item.value} label={item.label} />
      ))}
    </div>
  )
}
