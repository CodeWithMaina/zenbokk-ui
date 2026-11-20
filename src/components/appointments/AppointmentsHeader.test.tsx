import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AppointmentsHeader } from './AppointmentsHeader'
import { AppointmentsToolbar } from './AppointmentsToolbar'

/**
 * The top of the Appointments page.
 *
 * The redesign's promise is a split of responsibilities: the header owns *where you
 * are* (the period bar) and *what you can do* (New booking), while the toolbar owns
 * *narrowing what is shown* (search, filters). These tests pin that split down,
 * because the previous layout drifted into one crowded row of controls.
 */

describe('AppointmentsHeader', () => {
  const navigation = {
    label: 'Mon 16 – Sun 22 Nov',
    onPrevious: vi.fn(),
    onNext: vi.fn(),
    onToday: vi.fn(),
    onPickDate: vi.fn(),
    dateValue: '2026-11-16',
  }

  it('shows the period and steps it from the period bar', async () => {
    const user = userEvent.setup()
    render(
      <AppointmentsHeader
        view="calendar"
        onViewChange={() => {}}
        todayCount={3}
        onNewBooking={() => {}}
        canBook
        navigation={navigation}
      />,
    )

    expect(screen.getByText('Mon 16 – Sun 22 Nov')).toBeInTheDocument()
    expect(screen.getByText(/3 appointments today/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Previous period' }))
    await user.click(screen.getByRole('button', { name: 'Next period' }))
    await user.click(screen.getByRole('button', { name: 'Today' }))

    expect(navigation.onPrevious).toHaveBeenCalledTimes(1)
    expect(navigation.onNext).toHaveBeenCalledTimes(1)
    expect(navigation.onToday).toHaveBeenCalledTimes(1)
  })

  it('jumps to a picked date', () => {
    const onPickDate = vi.fn()
    render(
      <AppointmentsHeader
        view="table"
        onViewChange={() => {}}
        todayCount={0}
        onNewBooking={() => {}}
        canBook
        navigation={{ ...navigation, onPickDate }}
      />,
    )

    fireEvent.change(screen.getByLabelText('Jump to date'), { target: { value: '2026-12-01' } })

    expect(onPickDate).toHaveBeenCalledWith('2026-12-01')
  })

  it('hides New booking from a role that may only view', () => {
    render(
      <AppointmentsHeader
        view="calendar"
        onViewChange={() => {}}
        todayCount={0}
        onNewBooking={() => {}}
        canBook={false}
      />,
    )

    expect(screen.queryByRole('button', { name: /new booking/i })).not.toBeInTheDocument()
  })

  it('switches the view from the header', async () => {
    const user = userEvent.setup()
    const onViewChange = vi.fn()
    render(
      <AppointmentsHeader
        view="calendar"
        onViewChange={onViewChange}
        todayCount={0}
        onNewBooking={() => {}}
        canBook
      />,
    )

    const groups = screen.getAllByRole('group', { name: 'Appointment view' })
    await user.click(within(groups[0]).getByRole('button', { name: /timeline/i }))

    expect(onViewChange).toHaveBeenCalledWith('timeline')
  })
})

describe('AppointmentsToolbar', () => {
  it('carries search, filters and the counts — and no date navigation', async () => {
    const user = userEvent.setup()
    const onSearchChange = vi.fn()
    const onOpenFilters = vi.fn()

    render(
      <AppointmentsToolbar
        search=""
        onSearchChange={onSearchChange}
        filterCount={2}
        onOpenFilters={onOpenFilters}
        summary="4 appointments · Today"
        statusCounts={[{ status: 'booked', label: 'Booked', count: 2 }]}
      />,
    )

    await user.type(screen.getByLabelText('Search appointments'), 'amara')
    expect(onSearchChange).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /filters/i }))
    expect(onOpenFilters).toHaveBeenCalledTimes(1)

    expect(screen.getByText('4 appointments · Today')).toBeInTheDocument()
    expect(screen.getByText('2 booked')).toBeInTheDocument()

    // The period controls live in the header now: a second copy here is exactly the
    // duplication the redesign removed.
    expect(screen.queryByRole('button', { name: 'Previous period' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Today' })).not.toBeInTheDocument()
  })
})
