import { Archive, MoreHorizontal, Pause, Play, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { serviceStatusActionLabel, serviceStatusActions } from '../../lib/services'
import type { Service, ServiceStatusAction } from '../../lib/services'
import { ActionSheet } from '../ui/action-sheet'
import type { ActionSheetAction } from '../ui/action-sheet'
import { Menu } from '../ui/menu'
import type { MenuItem } from '../ui/menu'

export type ServiceActionsMenuProps = {
  service: Service
  onStatusAction: (action: ServiceStatusAction) => void
  onDelete: () => void
  /** True while a status change or delete is in flight. */
  busy?: boolean
  className?: string
}

const ACTION_ICONS: Record<ServiceStatusAction, ReactNode> = {
  pause: <Pause className="size-4" aria-hidden="true" />,
  resume: <Play className="size-4" aria-hidden="true" />,
  archive: <Archive className="size-4" aria-hidden="true" />,
  restore: <RotateCcw className="size-4" aria-hidden="true" />,
}

/**
 * The "more actions" control from the design.
 *
 * A pointer device gets a popover menu anchored to the button; a touch device
 * gets the bottom action sheet, which is what the design shows on a phone. Both
 * offer exactly the transitions the service's current status allows, so an
 * impossible move is never presented as a choice — the API would reject it.
 */
export function ServiceActionsMenu({
  service,
  onStatusAction,
  onDelete,
  busy = false,
  className,
}: ServiceActionsMenuProps) {
  const transitions = serviceStatusActions(service.status)

  const menuItems: MenuItem[] = [
    ...transitions.map((action) => ({
      label: serviceStatusActionLabel(action),
      icon: ACTION_ICONS[action],
      disabled: busy,
      onSelect: () => onStatusAction(action),
    })),
    {
      label: 'Delete service',
      icon: <Trash2 className="size-4" aria-hidden="true" />,
      destructive: true,
      separatorBefore: true,
      disabled: busy,
      onSelect: onDelete,
    },
  ]

  const sheetActions: ActionSheetAction[] = [
    ...transitions.map((action) => ({
      label: serviceStatusActionLabel(action),
      icon: ACTION_ICONS[action],
      disabled: busy,
      onSelect: () => onStatusAction(action),
    })),
    {
      label: 'Delete service',
      icon: <Trash2 className="size-4" aria-hidden="true" />,
      destructive: true,
      disabled: busy,
      onSelect: onDelete,
    },
  ]

  return (
    <>
      <span className="max-md:hidden">
        <Menu
          items={menuItems}
          triggerLabel="More actions"
          label={`More actions for ${service.name}`}
          trigger={<MoreHorizontal className="size-4" aria-hidden="true" />}
          className={className}
        />
      </span>

      <span className="md:hidden">
        <ActionSheetTrigger
          title={service.name}
          description={`${service.status[0]?.toUpperCase()}${service.status.slice(1)}`}
          actions={sheetActions}
        />
      </span>
    </>
  )
}

/** Small wrapper so the sheet's open state stays local to the phone variant. */
function ActionSheetTrigger({
  title,
  description,
  actions,
}: {
  title: string
  description: string
  actions: readonly ActionSheetAction[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        aria-label="More actions"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="btn btn-icon"
      >
        <MoreHorizontal className="size-4" aria-hidden="true" />
      </button>
      <ActionSheet
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        description={description}
        actions={actions}
      />
    </>
  )
}
