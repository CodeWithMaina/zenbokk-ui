import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_APPOINTMENT_FILTERS } from '../../lib/appointments'
import {
  TEST_CUSTOMER_ID,
  TEST_SERVICE_ID,
  TEST_STAFF_ID,
  makeServiceBucket,
  makeStaffBucket,
} from '../../test/appointments'
import { ok } from '../../test/handlers'
import { renderDashboard } from '../../test/render'
import { server } from '../../test/server'
import { AppointmentFilters } from './AppointmentFilters'

/**
 * The filter drawer.
 *
 * Every control writes through `onChange` with the filter set the endpoint
 * understands, so these assertions are about the contract between the drawer and
 * the query — not about how the panel is drawn. The multi-select cases matter most:
 * adding a second value must not clear the first, and removing one chip must not
 * reset the rest.
 */

const base = '*/api/v1'

function renderFilters(overrides: Partial<Parameters<typeof AppointmentFilters>[0]> = {}) {
  const onChange = vi.fn()
  const onReset = vi.fn()
  const onClose = vi.fn()

  renderDashboard(
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

/** The chips row a multi-select renders above its search box. */
function chips(label: string): HTMLElement {
  return screen.getByRole('list', { name: `${label} selected` })
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

  it('adds a service as a removable chip without clearing the other filters', async () => {
    const user = userEvent.setup()
    const { onChange } = renderFilters({
      filters: { ...DEFAULT_APPOINTMENT_FILTERS, status: 'confirmed', customerIds: ['cus-1'] },
    })

    await user.click(screen.getByRole('option', { name: /Signature treatment/ }))

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceIds: [TEST_SERVICE_ID],
        // Nothing else moved.
        status: 'confirmed',
        customerIds: ['cus-1'],
      }),
    )
  })

  it('keeps every chosen service and removes only the chip that was clicked', async () => {
    const user = userEvent.setup()
    const { onChange } = renderFilters({
      services: [
        makeServiceBucket({ id: TEST_SERVICE_ID, name: 'Haircut' }),
        makeServiceBucket({ id: 'svc-2', name: 'Beard Trim' }),
      ],
      filters: { ...DEFAULT_APPOINTMENT_FILTERS, serviceIds: [TEST_SERVICE_ID, 'svc-2'] },
    })

    const row = chips('Services')
    expect(within(row).getByText('Haircut')).toBeInTheDocument()
    expect(within(row).getByText('Beard Trim')).toBeInTheDocument()

    await user.click(within(row).getByRole('button', { name: 'Remove Haircut' }))

    // The other selection survives; only the clicked chip is gone.
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ serviceIds: ['svc-2'] }))
  })

  it('searches services rather than listing the whole catalogue', async () => {
    const user = userEvent.setup()
    renderFilters({
      services: [
        makeServiceBucket({ id: TEST_SERVICE_ID, name: 'Haircut' }),
        makeServiceBucket({ id: 'svc-2', name: 'Beard Trim' }),
      ],
    })

    await user.type(screen.getByLabelText('Services'), 'beard')

    const list = screen.getByRole('listbox', { name: 'Services options' })
    expect(within(list).getByText('Beard Trim')).toBeInTheDocument()
    expect(within(list).queryByText('Haircut')).toBeNull()
  })

  it('selects a customer and keeps them as a chip', async () => {
    server.use(
      http.get(`${base}/businesses/me/customers`, () =>
        ok({
          items: [
            {
              userId: TEST_CUSTOMER_ID,
              fullName: 'John Kamau',
              email: 'john@example.test',
              phoneNumber: '+254712345678',
              avatarUrl: null,
              enrollmentStatus: 'active',
            },
          ],
          totalCount: 1,
          page: 1,
          pageSize: 20,
        }),
      ),
    )

    const user = userEvent.setup()
    const { onChange } = renderFilters()

    await user.click(await screen.findByRole('option', { name: /John Kamau/ }))

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ customerIds: [TEST_CUSTOMER_ID] }),
    )
  })

  it('shows a chosen customer as a chip that names them', async () => {
    server.use(
      http.get(`${base}/businesses/me/customers`, () =>
        ok({
          items: [
            {
              userId: TEST_CUSTOMER_ID,
              fullName: 'John Kamau',
              email: 'john@example.test',
              phoneNumber: '+254712345678',
              avatarUrl: null,
              enrollmentStatus: 'active',
            },
          ],
          totalCount: 1,
          page: 1,
          pageSize: 20,
        }),
      ),
    )

    renderFilters({ filters: { ...DEFAULT_APPOINTMENT_FILTERS, customerIds: [TEST_CUSTOMER_ID] } })

    // The chip keeps the customer's name rather than showing a bare id.
    expect(await screen.findByRole('button', { name: 'Remove John Kamau' })).toBeInTheDocument()
  })

  it('chooses a staff member', async () => {
    const user = userEvent.setup()
    const { onChange } = renderFilters()

    await user.click(screen.getByRole('option', { name: /Amara Okafor/ }))

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ staffIds: [TEST_STAFF_ID] }),
    )
  })

  it('removes one staff chip without touching the rest of the filter set', async () => {
    const user = userEvent.setup()
    const { onChange } = renderFilters({
      staff: [makeStaffBucket()],
      filters: {
        ...DEFAULT_APPOINTMENT_FILTERS,
        staffIds: [TEST_STAFF_ID],
        serviceIds: ['svc-1'],
      },
    })

    await user.click(within(chips('Staff')).getByRole('button', { name: 'Remove Amara Okafor' }))

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ staffIds: [], serviceIds: ['svc-1'] }),
    )
  })

  it('omits the staff filter entirely when the Staff module is off', () => {
    renderFilters({ staffEnabled: false })

    expect(screen.queryByLabelText('Staff')).toBeNull()
    expect(screen.queryByRole('listbox', { name: 'Staff options' })).toBeNull()
  })

  it('picks a status from the dropdown', async () => {
    const user = userEvent.setup()
    const { onChange } = renderFilters()

    await user.selectOptions(screen.getByLabelText('Appointment status'), 'completed')
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }))
  })

  it('clears the chosen status', async () => {
    const user = userEvent.setup()
    const { onChange } = renderFilters({
      filters: { ...DEFAULT_APPOINTMENT_FILTERS, status: 'completed' },
    })

    await user.click(screen.getByRole('button', { name: 'Clear status' }))
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ status: null }))
  })

  it('changes the sort, including to creation order', async () => {
    const user = userEvent.setup()
    const { onChange } = renderFilters()

    await user.click(screen.getByRole('radio', { name: 'Recently created' }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ sort: 'created-desc' }))
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

/**
 * Payment-verification filtering.
 *
 * Payment is not a column on an appointment — the option the user picks is answered
 * from the ledger — so what the drawer has to guarantee is the contract: every state
 * is offered, and "All payment states" removes ONLY the payment filter.
 */
describe('AppointmentFilters — payment', () => {
  it('offers every payment state, with an All option', () => {
    renderFilters()

    const select = screen.getByLabelText('Payment state')
    expect(within(select).getByRole('option', { name: 'All payment states' })).toBeInTheDocument()
    expect(within(select).getByRole('option', { name: 'Fully paid & verified' })).toBeInTheDocument()
    expect(within(select).getByRole('option', { name: 'Partially paid' })).toBeInTheDocument()
    expect(within(select).getByRole('option', { name: 'Awaiting verification' })).toBeInTheDocument()
    expect(within(select).getByRole('option', { name: 'Unpaid' })).toBeInTheDocument()
    expect(within(select).getByRole('option', { name: 'Failed or expired' })).toBeInTheDocument()
    expect(within(select).getByRole('option', { name: 'Refunded or reversed' })).toBeInTheDocument()
  })

  it('selects a payment state without disturbing the other filters', async () => {
    const user = userEvent.setup()
    const { onChange } = renderFilters({
      filters: { ...DEFAULT_APPOINTMENT_FILTERS, status: 'confirmed' },
    })

    await user.selectOptions(screen.getByLabelText('Payment state'), 'awaiting')

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ payment: 'awaiting', status: 'confirmed' }),
    )
  })

  it('clears only the payment filter back to All', async () => {
    const user = userEvent.setup()
    const { onChange } = renderFilters({
      filters: { ...DEFAULT_APPOINTMENT_FILTERS, payment: 'partial', status: 'confirmed' },
    })

    await user.click(screen.getByRole('button', { name: 'Clear payment filter' }))

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ payment: 'all', status: 'confirmed' }),
    )
  })
})

