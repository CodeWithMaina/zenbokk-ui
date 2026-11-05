import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ReasonDialog } from './reason-dialog'

/**
 * Reason capture for high-impact actions.
 *
 * Every platform mutation is audited server-side, so the reason the
 * administrator types here becomes the reason recorded against the change. The
 * dialog must pass that exact text on and must never invent one.
 */
describe('ReasonDialog', () => {
  it('passes the typed reason to onConfirm', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()

    render(
      <ReasonDialog
        open
        title="Suspend Acme?"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    )

    await user.type(screen.getByLabelText(/reason/i), 'Chargeback investigation')
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(onConfirm).toHaveBeenCalledWith('Chargeback investigation')
  })

  it('refuses to confirm when a reason is required but empty', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()

    render(
      <ReasonDialog
        open
        requireReason
        title="Cancel the subscription?"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onConfirm).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText(/reason/i), '   ')
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onConfirm).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText(/reason/i), 'Owner requested closure')
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onConfirm).toHaveBeenCalledWith('Owner requested closure')
  })

  it('lets the administrator back out without confirming', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    render(
      <ReasonDialog open title="Deactivate?" onConfirm={onConfirm} onCancel={onCancel} />,
    )

    // The scrim also carries a "Cancel" label, so scope to the dialog itself.
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('does not carry a previous reason into the next action', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const dialog = (title: string, open: boolean) => (
      <ReasonDialog open={open} title={title} onConfirm={onConfirm} onCancel={() => {}} />
    )

    const { rerender } = render(dialog('First', true))
    await user.type(screen.getByLabelText(/reason/i), 'First reason')

    // Close, then reopen for a different action.
    rerender(dialog('First', false))
    rerender(dialog('Second', true))

    // Confirming immediately sends an empty reason, proving the field was reset
    // rather than reusing the previous action's text.
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onConfirm).toHaveBeenCalledWith('')
  })
})
