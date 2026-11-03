import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_APPOINTMENT_FILTERS } from '../../lib/appointments'
import { makeServiceBucket, makeStaffBucket } from '../../test/appointments'
import { AppointmentFilters } from './AppointmentFilters'

/**
 * The filter drawer.
 *
 * Every control writes through `onChange` with the filter set the endpoint
 * understands, so these assertions are about the contract between the drawer and
 * the query — not about how the panel is drawn.
 */

function renderFilters(overrides: Partial<Parameters<typeof AppointmentFilters>[0]> = {}) {
  const onChange = vi.fn()
  const onReset = vi.fn()
  const onClose = vi.fn()

  render(
    <AppointmentFilters
      open
      onClose={onClose}
      filters={DEFAULT_APPOINTMENT_FILTERS}
      onChange={onChange}
      onReset={onReset}
      staff={[makeStaffBucket()]}
      services={[makeServiceBucket()]}
      resultCount={12}
      {...overrides}
    />,
  )

  return { onChange, onReset, onClose }
}

describe('AppointmentFilters', () => {
  it('shows the result count the caller supplied', () => {
    renderFilters({ resultCount: 7 })
    expect(screen.getByRole('button', { name: 'Show 7 appointments' })).toBeInTheDocument()
  })

  it('switches the date window', async () => {
    const user = userEvent.setup()
    const { onChange } = renderFilters()

    await user.click(screen.getByRole('button', { name: 'Tomorrow' }))

    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_APPOINTMENT_FILTERS, preset: 'tomorrow' })
  })

  it('narrows to one staff member and back to all', async () => {
    const user = userEvent.setup()
    const { onChange } = renderFilters()

    await user.click(screen.getByRole('radio', { name: /Amara Okafor/ }))
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ staffId: makeStaffBucket().userId }),
    )

    await user.click(screen.getByRole('radio', { name: /All staff/ }))
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ staffId: null }))
  })

  it('narrows to one status', async () => {
    const user = userEvent.setup()
    const { onChange } = renderFilters()

    await user.click(screen.getByRole('radio', { name: 'Completed' }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }))
  })

  it('changes the sort', async () => {
    const user = userEvent.setup()
    const { onChange } = renderFilters()

    await user.click(screen.getByRole('radio', { name: 'Customer, A to Z' }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ sort: 'customer' }))
  })

  it('asks for the custom range when that preset is chosen', async () => {
    const user = userEvent.setup()
    const { onChange } = renderFilters()

    await user.click(screen.getByRole('button', { name: 'Custom range' }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ preset: 'custom' }))
  })

  it('shows the from/to fields only while the custom range is active', () => {
    renderFilters({ filters: { ...DEFAULT_APPOINTMENT_FILTERS, preset: 'custom' } })

    expect(screen.getByLabelText('From')).toBeInTheDocument()
    expect(screen.getByLabelText('To')).toBeInTheDocument()
  })

  it('hides the from/to fields for a preset window', () => {
    renderFilters()
    expect(screen.queryByLabelText('From')).toBeNull()
  })

  it('offers the calendar granularity and a jump-to date when used as the calendar panel', () => {
    renderFilters({
      calendar: {
        mode: 'week',
        onModeChange: vi.fn(),
        anchor: '2026-05-12',
        onAnchorChange: vi.fn(),
      },
    })

    expect(screen.getByRole('group', { name: 'Calendar granularity' })).toBeInTheDocument()
    expect(screen.getByLabelText('Go to a specific date')).toHaveValue('2026-05-12')
    // Custom ranges belong to the list views, so the calendar panel omits them.
    expect(screen.queryByRole('button', { name: 'Custom range' })).toBeNull()
    expect(screen.queryByRole('radio', { name: 'Customer, A to Z' })).toBeNull()
  })

  it('resets everything', async () => {
    const user = userEvent.setup()
    const { onReset } = renderFilters()

    await user.click(screen.getByRole('button', { name: 'Reset all' }))
    expect(onReset).toHaveBeenCalled()
  })
})
