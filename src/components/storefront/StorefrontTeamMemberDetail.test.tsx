import { screen, within } from '@testing-library/react'
import { http } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { StorefrontTeamMemberDetail } from './StorefrontTeamMemberDetail'
import { makeService, makeStaff } from '../../test/fixtures'
import { ok } from '../../test/handlers'
import { renderStorefront } from '../../test/render'
import { server } from '../../test/server'

/**
 * A member of the roster.
 *
 * The business owns this text, so the page shows exactly what it published and
 * nothing it did not: a member with no biography has no biography section (not
 * a placeholder paragraph), and "0 years" is a real answer that reads as such.
 */
const SERVICE_ID = '33333333-3333-3333-3333-333333333333'
const MEMBER_ID = '44444444-4444-4444-4444-444444444444'

function renderMember(staffUserId = MEMBER_ID) {
  return renderStorefront(
    <StorefrontTeamMemberDetail
      staffUserId={staffUserId}
      onBookWith={vi.fn()}
      onToggleService={vi.fn()}
      isInLineup={() => false}
    />,
  )
}

describe('StorefrontTeamMemberDetail', () => {
  it('publishes the biography, specialities and experience the business wrote', async () => {
    server.use(
      http.get('*/api/v1/services/:businessId/staff', () =>
        ok([
          makeStaff({
            userId: MEMBER_ID,
            fullName: 'Zawadi Mwangi',
            positionName: 'Nail Artist',
            bio: 'Detail-obsessed nail artist. Bring a reference photo.',
            specialities: 'Gel, Nail art,  Braids',
            yearsOfExperience: 7,
            serviceIds: [SERVICE_ID],
          }),
        ]),
      ),
      http.get('*/api/v1/services/:businessId', () => ok([makeService({ id: SERVICE_ID })])),
    )

    renderMember()

    expect(await screen.findByRole('heading', { name: 'Zawadi Mwangi' })).toBeInTheDocument()
    expect(screen.getByText(/about zawadi/i)).toBeInTheDocument()
    expect(
      screen.getByText('Detail-obsessed nail artist. Bring a reference photo.'),
    ).toBeInTheDocument()

    // Specialities are split on commas, and a stray double space is trimmed.
    const specialities = screen.getByText(/specialities/i).closest('div')
    expect(within(specialities!).getByText('Gel')).toBeInTheDocument()
    expect(within(specialities!).getByText('Nail art')).toBeInTheDocument()
    expect(within(specialities!).getByText('Braids')).toBeInTheDocument()

    // The stated experience is shown as years.
    const experience = screen.getByText('Experience')
    expect(experience.nextElementSibling).toHaveTextContent('7 years')

    // And the service they deliver is listed.
    expect(screen.getByRole('link', { name: 'Deluxe Fade' })).toBeInTheDocument()
  })

  it('omits every section the business has not filled in', async () => {
    server.use(
      http.get('*/api/v1/services/:businessId/staff', () =>
        ok([
          makeStaff({
            userId: MEMBER_ID,
            fullName: 'Zawadi Mwangi',
            positionName: null,
            bio: null,
            specialities: null,
            yearsOfExperience: null,
            serviceIds: [],
          }),
        ]),
      ),
      http.get('*/api/v1/services/:businessId', () => ok([])),
    )

    renderMember()

    expect(await screen.findByRole('heading', { name: 'Zawadi Mwangi' })).toBeInTheDocument()

    // Nothing was invented to fill the gaps.
    expect(screen.queryByText(/^about /i)).not.toBeInTheDocument()
    expect(screen.queryByText(/specialities/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Experience')).not.toBeInTheDocument()

    // The services section states the fact rather than showing an empty list.
    expect(screen.getByText(/has not assigned any published services/i)).toBeInTheDocument()
  })

  it('treats zero years as a real answer rather than a missing one', async () => {
    server.use(
      http.get('*/api/v1/services/:businessId/staff', () =>
        ok([makeStaff({ userId: MEMBER_ID, yearsOfExperience: 0 })]),
      ),
      http.get('*/api/v1/services/:businessId', () => ok([])),
    )

    renderMember()

    const experience = await screen.findByText('Experience')
    expect(experience.nextElementSibling).toHaveTextContent('New to the trade')
  })

  it('says so plainly when the person is no longer listed', async () => {
    server.use(
      http.get('*/api/v1/services/:businessId/staff', () => ok([])),
      http.get('*/api/v1/services/:businessId', () => ok([])),
    )

    renderMember('99999999-9999-9999-9999-999999999999')

    expect(await screen.findByText(/we can’t find that person/i)).toBeInTheDocument()
  })
})
