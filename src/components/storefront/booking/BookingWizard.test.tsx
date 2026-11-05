import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { BookingWizardPage } from '../../../routes/$slug.book'
import { emptyDraft, writeBookingDraft } from '../../../lib/storefront/booking-draft'
import { makeService, makeStaff, TEST_BUSINESS_ID } from '../../../test/fixtures'
import { fail, ok } from '../../../test/handlers'
import { renderStorefront } from '../../../test/render'
import { server } from '../../../test/server'
import { StorefrontBookingSummary } from './StorefrontBookingSummary'

vi.mock('../../../lib/auth', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { fullName: 'Customer' } }),
}))

const base = '*/api/v1'

function restoreDraft(step: typeof emptyDraft.step, staffId: string | null = null) {
  writeBookingDraft(TEST_BUSINESS_ID, {
    ...emptyDraft,
    serviceIds: [makeService().id],
    step,
    staffId,
  })
}

function calendarHandler(staffIds: (string | null)[] = []) {
  return http.get(`${base}/businesses/:businessId/availability/calendar`, ({ request }) => {
    staffIds.push(new URL(request.url).searchParams.get('staffId'))
    return ok({ days: [], notice: 'No open times for this date range.' })
  })
}

describe('BookingWizardPage', () => {
  it('continues a solo booking without a render loop and goes back to services', async () => {
    const user = userEvent.setup()
    server.use(
      http.get(`${base}/services/:businessId/staff`, () => ok([])),
      calendarHandler(),
    )
    restoreDraft('services')
    renderStorefront(<BookingWizardPage />)

    const next = screen.getByRole('button', { name: 'Continue' })
    await waitFor(() => expect(next).toBeEnabled())
    await user.click(next)

    expect(await screen.findByRole('heading', { name: 'Pick a time' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Step 2 of 4: Date & time' })).toBeInTheDocument()
    expect(await screen.findByText('No open times for this date range.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('heading', { name: 'Choose your services' })).toBeInTheDocument()
  })

  it('resumes a solo draft at the time step and ignores an obsolete staff selection', async () => {
    const staffIds: (string | null)[] = []
    server.use(
      http.get(`${base}/services/:businessId/staff`, () => ok([])),
      calendarHandler(staffIds),
    )
    restoreDraft('staff', 'obsolete-staff-id')
    renderStorefront(<BookingWizardPage />)

    expect(await screen.findByRole('heading', { name: 'Pick a time' })).toBeInTheDocument()
    await waitFor(() => expect(staffIds).toEqual([null]))
  })

  it('uses the solo flow when the Staff module is disabled', async () => {
    server.use(
      http.get(`${base}/services/:businessId/staff`, () =>
        fail('MODULE_DISABLED', 'Staff is disabled.', 403),
      ),
      calendarHandler(),
    )
    restoreDraft('time')
    renderStorefront(<BookingWizardPage />)

    expect(await screen.findByRole('list', { name: 'Step 2 of 4: Date & time' }))
      .toBeInTheDocument()
    expect(await screen.findByText('No open times for this date range.')).toBeInTheDocument()
  })

  it.each(['details', 'payment'] as const)('resumes a solo draft at %s without re-rendering forever', async (step) => {
    server.use(
      http.get(`${base}/services/:businessId/staff`, () => ok([])),
      calendarHandler(),
    )
    restoreDraft(step)
    renderStorefront(<BookingWizardPage />)

    await waitFor(() => expect(
      screen.getByRole('list', {
        name: step === 'details' ? 'Step 3 of 4: Details' : 'Step 4 of 4: Payment',
      }),
    ).toBeInTheDocument())
    expect(screen.getAllByText('Nuru Studio').length).toBeGreaterThan(0)
  })

  it('waits for staff to load before continuing into the specialist step', async () => {
    const user = userEvent.setup()
    server.use(
      http.get(`${base}/services/:businessId/staff`, async () => {
        await delay(100)
        return ok([makeStaff()])
      }),
    )
    restoreDraft('services')
    renderStorefront(<BookingWizardPage />)

    const next = screen.getByRole('button', { name: 'Continue' })
    expect(next).toBeDisabled()
    await waitFor(() => expect(next).toBeEnabled())
    await user.click(next)

    expect(screen.getByRole('heading', { name: 'Choose your specialist' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Step 2 of 5: Specialist' })).toBeInTheDocument()
  })

  it('reports a roster failure instead of treating it as a solo business', async () => {
    server.use(
      http.get(`${base}/services/:businessId/staff`, () =>
        fail('SERVER_ERROR', 'The team could not be loaded.', 500),
      ),
    )
    restoreDraft('services')
    renderStorefront(<BookingWizardPage />)

    expect(await screen.findByText(/the team could not be loaded/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
  })
})

describe('StorefrontBookingSummary', () => {
  it('shows the business name for solo bookings', () => {
    renderStorefront(
      <StorefrontBookingSummary
        services={[makeService()]}
        staffName={null}
        when={null}
        businessName="Solo Studio"
        hasEligibleStaff={false}
      />,
    )
    expect(screen.getByText('Solo Studio')).toBeInTheDocument()
    expect(screen.queryByText('First available')).not.toBeInTheDocument()
  })

  it('preserves the default summary for staff-enabled bookings', () => {
    renderStorefront(
      <StorefrontBookingSummary services={[makeService()]} staffName={null} when={null} />,
    )
    expect(screen.getByText('First available')).toBeInTheDocument()
  })
})
