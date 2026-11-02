import { ChevronRight } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { LoyaltyProgram } from '../../lib/loyalty/types'
import { programSubtitle, rewardSummary } from '../../lib/loyalty/mappers'
import { LoyaltyCardRenderer } from './LoyaltyCardRenderer'
import { ProgramStatusBadge } from './ProgramStatusBadge'

export type LoyaltyProgramCardProps = {
  program: LoyaltyProgram
  onOpen?: (program: LoyaltyProgram) => void
  className?: string
}

/**
 * One program in the list.
 *
 * The layout is the design's own responsive switch: a stacked card on small
 * screens (the card art carries the name), and a row — thumbnail, details,
 * chevron — once the list becomes a single bordered panel at 900px. Both
 * layouts render the same backend card template, scaled to the available width.
 */
export function LoyaltyProgramCard({ program, onOpen, className }: LoyaltyProgramCardProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen?.(program)}
      aria-label={`Open ${program.name}`}
      className={cn(
        'w-full min-w-0 text-left transition-colors focus-visible:shadow-ring focus-visible:outline-none',
        'min-[900px]:grid min-[900px]:grid-cols-[200px_minmax(0,1fr)_auto] min-[900px]:items-center min-[900px]:gap-[1.6rem]',
        'min-[900px]:border-b min-[900px]:border-line min-[900px]:px-[1.2rem] min-[900px]:py-[1rem] min-[900px]:hover:bg-hover',
        'min-[900px]:last:border-b-0',
        className,
      )}
    >
      <div className="w-full min-[900px]:h-[124px] min-[900px]:w-[200px] min-[900px]:overflow-hidden min-[900px]:rounded-[0.6rem]">
        <LoyaltyCardRenderer
          html={program.cardDesignHtml}
          designName={program.cardDesignName}
          values={{ programName: program.name, rewardName: rewardSummary(program), stampsRequired: program.stampsRequired }}
        />
      </div>

      <div className="flex items-start justify-between gap-4 pt-[0.8rem] min-[900px]:block min-[900px]:pt-0">
        <div className="min-w-0">
          <p className="hidden text-label font-bold tracking-snug min-[900px]:block">
            {program.name}
          </p>
          <p className="text-label font-semibold leading-[1.35]">{rewardSummary(program)}</p>
          <p className="mt-[0.15rem] text-meta text-muted">{programSubtitle(program)}</p>
        </div>
        <div className="shrink-0 min-[900px]:mt-[0.6rem]">
          <ProgramStatusBadge status={program.status} />
        </div>
      </div>

      <ChevronRight className="hidden size-4 text-muted min-[900px]:block" aria-hidden="true" />
    </button>
  )
}
