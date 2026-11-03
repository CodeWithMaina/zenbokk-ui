import { Clock, Download, X } from 'lucide-react'
import { Button } from '../ui/button'

export type StaffSelectionDockProps = {
  selectedCount: number
  onClear: () => void
  onExport?: () => void
  /** Manual clock actions, shown only when the attendance module is entitled. */
  onClockIn?: () => void
  onClockOut?: () => void
  busy?: boolean
}

/**
 * The floating action bar for a multi-selection, matching the design's dock.
 *
 * It sits above the page content on a phone and inline at the bottom of the
 * roster on a wide screen, and it only ever offers actions the caller can
 * actually perform — clocking is hidden when attendance is not in the plan.
 */
export function StaffSelectionDock({
  selectedCount,
  onClear,
  onExport,
  onClockIn,
  onClockOut,
  busy = false,
}: StaffSelectionDockProps) {
  if (selectedCount === 0) return null

  return (
    <div
      role="toolbar"
      aria-label="Actions for the selected teammates"
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-1/2 z-20 flex max-w-[calc(100%-1rem)] -translate-x-1/2 flex-wrap items-center gap-[0.5rem] rounded-panel bg-inverse px-[1rem] py-[0.5rem] text-on-inverse shadow-overlay"
    >
      <b className="text-meta whitespace-nowrap">
        {selectedCount} selected
      </b>

      {onClockIn ? (
        <button
          type="button"
          onClick={onClockIn}
          disabled={busy}
          className="inline-flex min-h-[2.375rem] items-center gap-[0.35rem] rounded-md bg-on-inverse/20 px-[0.875rem] text-meta font-semibold text-on-inverse transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Clock className="size-3.5" aria-hidden="true" />
          Clock in
        </button>
      ) : null}

      {onClockOut ? (
        <button
          type="button"
          onClick={onClockOut}
          disabled={busy}
          className="inline-flex min-h-[2.375rem] items-center gap-[0.35rem] rounded-md bg-on-inverse/20 px-[0.875rem] text-meta font-semibold text-on-inverse transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Clock className="size-3.5" aria-hidden="true" />
          Clock out
        </button>
      ) : null}

      {onExport ? (
        <button
          type="button"
          onClick={onExport}
          className="inline-flex min-h-[2.375rem] items-center gap-[0.35rem] rounded-md bg-on-inverse/20 px-[0.875rem] text-meta font-semibold text-on-inverse transition-opacity hover:opacity-90"
        >
          <Download className="size-3.5" aria-hidden="true" />
          Export
        </button>
      ) : null}

      <Button
        variant="ghost"
        size="icon"
        onClick={onClear}
        aria-label="Clear selection"
        className="text-on-inverse hover:bg-on-inverse/20 hover:text-on-inverse"
      >
        <X className="size-4" aria-hidden="true" />
      </Button>
    </div>
  )
}
