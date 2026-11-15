import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NavDrawer } from './NavDrawer'

/**
 * The phone navigation drawer.
 *
 * It is the controller for the business console on small screens: a side panel
 * over a dimming backdrop that closes four ways and locks the page behind it.
 * These are the interactions the acceptance criteria name, asserted against the
 * real component (portal, focus trap and scroll lock included).
 */

function renderDrawer() {
  const onClose = vi.fn()
  const result = render(
    <NavDrawer
      open
      onClose={onClose}
      title="Aurelia Luxe"
      description="Salon"
      closeLabel="Close menu"
    >
      <nav aria-label="Console">menu body</nav>
    </NavDrawer>,
  )
  return { ...result, onClose }
}

describe('NavDrawer', () => {
  it('renders a modal dialog with its heading and body', () => {
    renderDrawer()

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(within(dialog).getByRole('heading', { name: 'Aurelia Luxe' })).toBeInTheDocument()
    expect(screen.getByText('menu body')).toBeInTheDocument()
  })

  it('renders nothing when closed', () => {
    render(
      <NavDrawer open={false} onClose={() => {}} title="Aurelia Luxe">
        menu body
      </NavDrawer>,
    )

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes when the close button is pressed', async () => {
    const user = userEvent.setup()
    const { onClose } = renderDrawer()

    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Close menu' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes when the backdrop is clicked', async () => {
    const user = userEvent.setup()
    const { onClose } = renderDrawer()

    // The scrim carries the close label too; it renders before the panel.
    const scrim = screen.getAllByRole('button', { name: 'Close menu' })[0]
    await user.click(scrim)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes when Escape is pressed', async () => {
    const user = userEvent.setup()
    const { onClose } = renderDrawer()

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('locks background scrolling while open and restores it on unmount', () => {
    const { unmount } = renderDrawer()

    expect(document.body.style.overflow).toBe('hidden')

    unmount()

    expect(document.body.style.overflow).not.toBe('hidden')
  })
})
