import { Download, MessageCircle } from 'lucide-react'
import { BulkActionBar } from '../ui/bulk-action-bar'
import { Button } from '../ui/button'

export type ClientSelectionDockProps = {
  selectedCount: number
  onClear: () => void
  onMessage: () => void
  onExport: () => void
}

/**
 * Floating action dock from the Clients design. It renders nothing while the
 * selection is empty, so the list stays unobstructed.
 */
export function ClientSelectionDock({
  selectedCount,
  onClear,
  onMessage,
  onExport,
}: ClientSelectionDockProps) {
  const dockButton =
    'text-on-inverse hover:bg-on-inverse/10 hover:text-on-inverse'

  return (
    <BulkActionBar
      selectedCount={selectedCount}
      itemLabel="selected"
      onClear={onClear}
      clearLabel="Clear selection"
      label="Actions for selected clients"
      actions={
        <>
          <Button variant="ghost" size="sm" className={dockButton} onClick={onMessage}>
            <MessageCircle className="size-4" aria-hidden="true" />
            Send message
          </Button>
          <Button variant="ghost" size="sm" className={dockButton} onClick={onExport}>
            <Download className="size-4" aria-hidden="true" />
            Export
          </Button>
        </>
      }
    />
  )
}
