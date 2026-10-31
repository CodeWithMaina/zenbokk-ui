import { cn } from '../../lib/cn'

/**
 * The punch mark: a filled brand circle with a hole in it. The hole is painted
 * in the canvas colour so the mark reads as punched *out of* whatever panel it
 * sits on rather than as a second dot on top of it.
 */
export function PunchedMark({
  className,
  holeClassName,
}: {
  className?: string
  holeClassName?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn('relative grid size-6 place-items-center rounded-round bg-accent', className)}
    >
      <span className={cn('size-2 rounded-round bg-bg', holeClassName)} />
    </span>
  )
}

/** Mark + wordmark, sized for the site header. */
export function PunchedWordmark({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-[0.6rem]', className)}>
      <PunchedMark />
      <span className="punch-display text-[26px] leading-none text-fg">Punched</span>
    </span>
  )
}
