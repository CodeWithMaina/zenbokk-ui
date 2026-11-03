import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import { StorefrontGallery } from './StorefrontGallery'
import { makeBootstrap, variant } from '../../test/fixtures'
import { fail, ok } from '../../test/handlers'
import { renderStorefront } from '../../test/render'
import { server } from '../../test/server'

/**
 * The public gallery.
 *
 * These are interaction tests, not render smoke tests: they drive the grid and
 * the lightbox the way a visitor does (click to open, Escape to close, arrow
 * keys to move) and assert the outcomes — which image is showing, where focus
 * goes, and what happens when the API refuses.
 */
describe('StorefrontGallery', () => {
  it('renders one openable tile per published image', async () => {
    renderStorefront(<StorefrontGallery />)

    const tiles = await screen.findAllByRole('button', { name: /open image \d+ of 3/i })
    expect(tiles).toHaveLength(3)
  })

  it('opens the lightbox on click and closes it on Escape, returning focus', async () => {
    const user = userEvent.setup()
    renderStorefront(<StorefrontGallery />)

    const tiles = await screen.findAllByRole('button', { name: /open image/i })
    const first = tiles[0]
    first.focus()
    await user.click(first)

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/gallery image 1 of 3/i)).toBeInTheDocument()

    // Focus moves into the dialog so a keyboard user is not left behind it.
    await waitFor(() =>
      expect(within(dialog).getByRole('button', { name: /close gallery viewer/i })).toHaveFocus(),
    )

    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    // Focus returns to the tile that opened it.
    expect(first).toHaveFocus()
  })

  it('moves between images with the arrow keys, wrapping at the ends', async () => {
    const user = userEvent.setup()
    renderStorefront(<StorefrontGallery />)

    const tiles = await screen.findAllByRole('button', { name: /open image/i })
    await user.click(tiles[0])

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/image 1 of 3/i)).toBeInTheDocument()

    await user.keyboard('{ArrowRight}')
    await waitFor(() => expect(within(dialog).getByText(/image 2 of 3/i)).toBeInTheDocument())

    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    // Wrapped past the first image to the last one.
    await waitFor(() => expect(within(dialog).getByText(/image 3 of 3/i)).toBeInTheDocument())
  })

  it('shows the owner’s caption in the lightbox, and reads it with the tile', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('*/api/v1/businesses/:businessId/gallery', () =>
        ok({
          businessId: '11111111-1111-1111-1111-111111111111',
          images: [
            {
              mediaId: '22222222-2222-2222-2222-222222222222',
              caption: 'Balayage in progress',
              sortOrder: 0,
              featured: false,
              width: 1280,
              height: 960,
              variants: [variant(640), variant(1280)],
            },
            {
              // An image with no caption must not invent one.
              mediaId: '33333333-3333-3333-3333-333333333333',
              caption: null,
              sortOrder: 1,
              featured: false,
              width: 1280,
              height: 960,
              variants: [variant(640)],
            },
          ],
        }),
      ),
    )

    renderStorefront(<StorefrontGallery />)

    const tile = await screen.findByRole('button', {
      name: /open image 1 of 2: balayage in progress/i,
    })
    await user.click(tile)

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Balayage in progress')).toBeInTheDocument()

    // The uncaptioned image shows no caption at all.
    await user.keyboard('{ArrowRight}')
    await waitFor(() => expect(within(dialog).getByText(/image 2 of 2/i)).toBeInTheDocument())
    expect(within(dialog).queryByText(/balayage/i)).not.toBeInTheDocument()
  })

  it('says so plainly when the business has published no photos', async () => {
    server.use(
      http.get('*/api/v1/businesses/:businessId/gallery', () =>
        ok({ businessId: '11111111-1111-1111-1111-111111111111', images: [] }),
      ),
    )

    renderStorefront(<StorefrontGallery />)

    expect(await screen.findByText(/no photos yet/i)).toBeInTheDocument()
  })

  it('offers a retry when the gallery request fails', async () => {
    server.use(
      http.get('*/api/v1/businesses/:businessId/gallery', () =>
        fail('LOAD_FAILED', 'Failed to load the gallery.', 500),
      ),
    )

    renderStorefront(<StorefrontGallery />)

    expect(await screen.findByText(/the gallery didn’t load/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('does not offer a gallery to a business without the capability', async () => {
    renderStorefront(<StorefrontGallery />, {
      bootstrap: makeBootstrap({
        business: {
          ...makeBootstrap().business,
          capabilities: { gallery: false },
        },
      }),
    })

    expect(
      await screen.findByText(/this business doesn’t publish a gallery/i),
    ).toBeInTheDocument()
    // Nothing was requested, because the module is off.
    expect(screen.queryByRole('button', { name: /open image/i })).not.toBeInTheDocument()
  })
})
