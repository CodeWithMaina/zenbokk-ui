import { Fragment, useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { Ellipsis } from 'lucide-react'
import { cn } from '../../lib/cn'

export type MenuItem = {
  label: ReactNode
  icon?: ReactNode
  onSelect: () => void
  destructive?: boolean
  disabled?: boolean
  /** Draw a divider above this item. */
  separatorBefore?: boolean
}

export type MenuProps = {
  items: readonly MenuItem[]
  /** Content of the trigger button. Defaults to a horizontal ellipsis. */
  trigger?: ReactNode
  triggerLabel?: string
  /** Accessible name for the menu itself; defaults to the trigger label. */
  label?: string
  triggerClassName?: string
  align?: 'start' | 'end'
  className?: string
}

/**
 * Small actions menu used by client/service rows. Click or `ArrowDown` opens;
 * arrow keys, Home and End move; Escape closes and returns focus to the trigger.
 */
export function Menu({
  items,
  trigger,
  triggerLabel = 'More actions',
  label,
  triggerClassName,
  align = 'end',
  className,
}: MenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  const close = (restoreFocus = false) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return

    const frame = window.requestAnimationFrame(() => {
      const first = menuRef.current?.querySelector<HTMLButtonElement>(
        '[role="menuitem"]:not([disabled])',
      )
      ;(first ?? menuRef.current)?.focus()
    })

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!open) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setOpen(true)
      }
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      close(true)
      return
    }

    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return

    const menuItems = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not([disabled])',
      ) ?? [],
    )
    if (menuItems.length === 0) return

    event.preventDefault()

    const current = (event.target as HTMLElement).closest<HTMLElement>(
      '[role="menuitem"]',
    )
    const currentIndex = current ? menuItems.indexOf(current as HTMLButtonElement) : -1

    let nextIndex: number
    if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = menuItems.length - 1
    else if (event.key === 'ArrowDown') {
      nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % menuItems.length
    } else {
      nextIndex =
        currentIndex < 0
          ? menuItems.length - 1
          : (currentIndex - 1 + menuItems.length) % menuItems.length
    }

    menuItems[nextIndex].focus()
  }

  return (
    <div
      ref={rootRef}
      className={cn('relative inline-flex', className)}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        className={cn('btn btn-ghost btn-icon', triggerClassName)}
      >
        {trigger ?? <Ellipsis className="size-4" aria-hidden="true" />}
      </button>

      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label ?? triggerLabel}
          tabIndex={-1}
          className={cn(
            'absolute top-[calc(100%+0.35rem)] z-30 min-w-[11rem] rounded-card border border-line bg-surface p-[0.35rem] shadow-overlay focus:outline-none',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item, index) => (
            <Fragment key={index}>
              {item.separatorBefore ? (
                <div role="separator" className="my-[0.3rem] h-px bg-line" />
              ) : null}
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                disabled={item.disabled}
                onClick={() => {
                  item.onSelect()
                  close(true)
                }}
                className={cn(
                  'flex w-full items-center gap-[0.6rem] rounded-sm px-[0.7rem] py-[0.5rem] text-left text-[0.9rem] font-medium transition-colors hover:bg-hover focus-visible:bg-hover focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40',
                  item.destructive ? 'text-danger-ink' : 'text-fg',
                )}
              >
                {item.icon ? (
                  <span className="shrink-0" aria-hidden="true">
                    {item.icon}
                  </span>
                ) : null}
                <span className="min-w-0">{item.label}</span>
              </button>
            </Fragment>
          ))}
        </div>
      ) : null}
    </div>
  )
}
