import { screen } from '@testing-library/react'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import { TeamPage } from './TeamPage'
import { fail, ok } from '../../../test/handlers'
import { makeStaff } from '../../../test/fixtures'
import { renderStorefront } from '../../../test/render'
import { server } from '../../../test/server'

const base = '*/api/v1'

/**
 * The roster page, and what it says when the roster is withdrawn.
 *
 * The Team navigation is derived from this same payload, so the page and the nav
 * must agree. A withdrawn module is a decision (`403 MODULE_DISABLED`), not a
 * fault: the page has to describe it instead of offering a retry that can only
 * fail the same way.
 */
describe('TeamPage', () => {
  it('renders the roster the backend returned', async () => {
    renderStorefront(<TeamPage />)

    expect(await screen.findByText('The team')).toBeInTheDocument()
    // The card is a link whose accessible name is "<name>, <position>".
    const staff = makeStaff()
    expect(
      await screen.findByRole('link', {
        name: `${staff.fullName}, ${staff.positionName}`,
      }),
    ).toBeInTheDocument()
  })

  it('describes a withdrawn roster instead of showing an error and a retry', async () => {
    server.use(
      http.get(`${base}/services/:businessId/staff`, () =>
        fail('MODULE_DISABLED', "The 'staff' module is not enabled for this business.", 403),
      ),
    )

    renderStorefront(<TeamPage />)

    expect(await screen.findByText(/team isn.t listed/i)).toBeInTheDocument()
    // No retry: the state is deliberate, so offering one would be a lie.
    expect(screen.queryByRole('button', { name: /try again|retry/i })).not.toBeInTheDocument()
  })

  it('still reports a real failure as a failure, with a retry', async () => {
    server.use(
      http.get(`${base}/services/:businessId/staff`, () =>
        fail('SERVER_ERROR', 'Something went wrong.', 500),
      ),
    )

    renderStorefront(<TeamPage />)

    expect(await screen.findByText(/team didn.t load/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again|retry/i })).toBeInTheDocument()
  })

  it('shows the empty state when the business simply publishes no one', async () => {
    server.use(http.get(`${base}/services/:businessId/staff`, () => ok([])))

    renderStorefront(<TeamPage />)

    expect(await screen.findByText(/no one listed yet/i)).toBeInTheDocument()
  })
})
