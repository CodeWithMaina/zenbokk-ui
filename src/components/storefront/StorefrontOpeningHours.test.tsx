import { screen } from '@testing-library/react'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import { StorefrontOpeningHours } from './StorefrontOpeningHours'
import { makeOpeningHours } from '../../test/fixtures'
import { fail, ok } from '../../test/handlers'
import { renderStorefront } from '../../test/render'
import { server } from '../../test/server'

/**
 * Opening hours.
 *
 * The page must show the business's real hours — including the days it is
 * closed — and must never invent a time. The assertions are on what a visitor
 * reads, and on the fallback caption that tells them these are the business's
 * hours rather than live availability.
 */
describe('StorefrontOpeningHours', () => {
  it('lists every day, Monday first, and marks the closed day', async () => {
    renderStorefront(<StorefrontOpeningHours />)

    // Sunday is closed in the fixture; the other six are 09:00–18:00.
    expect(await screen.findByText('Closed')).toBeInTheDocument()

    const terms = screen.getAllByRole('term').map((node) => node.textContent)
    expect(terms).toEqual([
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ])

    const openDays = screen.getAllByRole('definition').filter((node) => node.textContent?.includes('09:00'))
    expect(openDays).toHaveLength(6)
  })

  it('shows a break inside the period when the business declares one', async () => {
    server.use(
      http.get('*/api/v1/businesses/:businessId/opening-hours', () =>
        ok(
          makeOpeningHours({
            days: [
              {
                day: 'monday',
                dayOfWeek: 1,
                isClosed: false,
                periods: [
                  { opensAt: '09:00', closesAt: '17:00', breakStartsAt: '13:00', breakEndsAt: '14:00' },
                ],
              },
            ],
          }),
        ),
      ),
    )

    renderStorefront(<StorefrontOpeningHours />)

    expect(
      await screen.findByText('09:00–17:00 (break 13:00–14:00)'),
    ).toBeInTheDocument()
  })

  it('lists dated exceptions, labelled as closures', async () => {
    server.use(
      http.get('*/api/v1/businesses/:businessId/opening-hours', () =>
        ok(
          makeOpeningHours({
            specialHours: [
              { date: '2026-12-25', isClosed: true, label: 'Christmas Day', periods: [] },
            ],
          }),
        ),
      ),
    )

    renderStorefront(<StorefrontOpeningHours />)

    expect(await screen.findByText(/upcoming changes/i)).toBeInTheDocument()
    expect(screen.getByText('Christmas Day')).toBeInTheDocument()
  })

  it('says the hours are the booking window when no roster is recorded', async () => {
    server.use(
      http.get('*/api/v1/businesses/:businessId/opening-hours', () =>
        ok(makeOpeningHours({ hasStaffSchedule: false })),
      ),
    )

    renderStorefront(<StorefrontOpeningHours />)

    expect(await screen.findByText(/booking window/i)).toBeInTheDocument()
  })

  it('degrades quietly in the footer but explains itself on a page', async () => {
    server.use(
      http.get('*/api/v1/businesses/:businessId/opening-hours', () =>
        fail('LOAD_FAILED', 'Failed to load opening hours.', 500),
      ),
    )

    const { unmount } = renderStorefront(<StorefrontOpeningHours variant="footer" />)
    // A footer must not shout: nothing is rendered at all.
    await screen.findByText(/opening hours/i, {}, { timeout: 2000 }).catch(() => undefined)
    expect(screen.queryByText(/unavailable right now/i)).not.toBeInTheDocument()
    unmount()

    renderStorefront(<StorefrontOpeningHours />)
    expect(await screen.findByText(/unavailable right now/i)).toBeInTheDocument()
  })
})
