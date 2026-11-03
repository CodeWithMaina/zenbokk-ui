import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { StorefrontSearchPage } from './StorefrontSearchPage'
import { makeSearchResponse } from '../../test/fixtures'
import { fail, ok } from '../../test/handlers'
import { renderStorefront } from '../../test/render'
import { server } from '../../test/server'

/**
 * Server-side search.
 *
 * The page must search on the server (not filter two downloaded collections),
 * debounce typing, page the results, and never issue a request for an empty
 * query. The request itself is observed, so "no duplicate calls" and "the scope
 * chip changed the request" are asserted rather than assumed.
 */
describe('StorefrontSearchPage', () => {
  it('says nothing was searched until the visitor types', async () => {
    const onSearch = vi.fn(() => ok(makeSearchResponse()))
    server.use(http.get('*/api/v1/businesses/:businessId/search', onSearch))

    renderStorefront(<StorefrontSearchPage />)

    expect(await screen.findByText(/start typing to search/i)).toBeInTheDocument()
    expect(onSearch).not.toHaveBeenCalled()
  })

  it('issues one debounced request and renders the server’s results', async () => {
    const user = userEvent.setup()
    const seen: string[] = []
    server.use(
      http.get('*/api/v1/businesses/:businessId/search', ({ request }) => {
        const url = new URL(request.url)
        seen.push(`${url.searchParams.get('q')}|${url.searchParams.get('type')}`)
        return ok(makeSearchResponse({ query: url.searchParams.get('q') ?? '' }))
      }),
    )

    renderStorefront(<StorefrontSearchPage />)

    await user.type(screen.getByLabelText(/search services and team/i), 'fade')

    expect(await screen.findByText('Deluxe Fade')).toBeInTheDocument()
    expect(screen.getByText(/1 result/i)).toBeInTheDocument()
    // One request for the whole word, not one per keystroke.
    expect(seen).toEqual(['fade|all'])
  })

  it('narrows the request when a scope chip is chosen', async () => {
    const user = userEvent.setup()
    const seen: string[] = []
    server.use(
      http.get('*/api/v1/businesses/:businessId/search', ({ request }) => {
        const url = new URL(request.url)
        seen.push(url.searchParams.get('type') ?? '')
        return ok(makeSearchResponse({ type: url.searchParams.get('type') ?? 'all' }))
      }),
    )

    renderStorefront(<StorefrontSearchPage />)

    await user.type(screen.getByLabelText(/search services and team/i), 'fade')
    await screen.findByText('Deluxe Fade')

    await user.click(screen.getByRole('button', { name: 'Team' }))

    await waitFor(() => expect(seen).toContain('team'))
    expect(screen.getByRole('button', { name: 'Team' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('pages through results and keeps the previous page on screen', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('*/api/v1/businesses/:businessId/search', ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get('page') ?? '1')
        return ok(
          makeSearchResponse({
            page,
            totalCount: 2,
            totalPages: 2,
            items:
              page === 1
                ? [serviceItem('Deluxe Fade')]
                : [staffItem('Zawadi Mwangi', 'Nail Artist')],
          }),
        )
      }),
    )

    renderStorefront(<StorefrontSearchPage />)
    await user.type(screen.getByLabelText(/search services and team/i), 'fade')

    expect(await screen.findByText('Deluxe Fade')).toBeInTheDocument()
    expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /next/i }))

    expect(await screen.findByText('Zawadi Mwangi')).toBeInTheDocument()
    expect(screen.getByText(/page 2 of 2/i)).toBeInTheDocument()
    // The staff hit links to the person's own page.
    expect(screen.getByRole('link', { name: /zawadi mwangi/i })).toHaveAttribute(
      'href',
      expect.stringContaining('/team/44444444-4444-4444-4444-444444444444'),
    )
  })

  it('explains a failure and offers a retry that re-issues the request', async () => {
    const user = userEvent.setup()
    let attempt = 0
    server.use(
      http.get('*/api/v1/businesses/:businessId/search', () => {
        attempt += 1
        return attempt === 1
          ? fail('SEARCH_FAILED', 'Search is unavailable right now.', 500)
          : ok(makeSearchResponse())
      }),
    )

    renderStorefront(<StorefrontSearchPage />)
    await user.type(screen.getByLabelText(/search services and team/i), 'fade')

    expect(await screen.findByText(/search didn’t work/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /try again/i }))

    expect(await screen.findByText('Deluxe Fade')).toBeInTheDocument()
  })

  it('offers a way out when nothing matches', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('*/api/v1/businesses/:businessId/search', () =>
        ok(makeSearchResponse({ items: [], totalCount: 0, totalPages: 0 })),
      ),
    )

    renderStorefront(<StorefrontSearchPage />)
    await user.type(screen.getByLabelText(/search services and team/i), 'zzz')

    expect(await screen.findByText(/no matches/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /browse services/i })).toHaveAttribute(
      'href',
      expect.stringContaining('/services'),
    )
  })
})

function serviceItem(title: string) {
  return {
    type: 'service' as const,
    id: '33333333-3333-3333-3333-333333333333',
    title,
    subtitle: null,
    description: null,
    categoryName: null,
    price: 900,
    durationMinutes: 45,
    imageVariants: [],
    avatarUrl: null,
    serviceIds: [],
  }
}

function staffItem(title: string, subtitle: string) {
  return {
    type: 'staff' as const,
    id: '44444444-4444-4444-4444-444444444444',
    title,
    subtitle,
    description: null,
    categoryName: null,
    price: null,
    durationMinutes: null,
    imageVariants: [],
    avatarUrl: null,
    serviceIds: [],
  }
}
