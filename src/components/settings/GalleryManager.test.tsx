import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { GalleryManager } from './GalleryManager'
import { ok } from '../../test/handlers'
import { renderStorefront } from '../../test/render'
import { server } from '../../test/server'

/**
 * The owner's gallery manager.
 *
 * Uploading is not tested here (it drives the presigned-grant pipeline and is
 * covered by the media tests); what matters is that the three edits an owner
 * makes — caption, publication, removal — reach the API with the right payload,
 * and that a caption is not sent on every keystroke.
 */
const MEDIA_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const MEDIA_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

function entry(overrides: Record<string, unknown> = {}) {
  return {
    businessId: '11111111-1111-1111-1111-111111111111',
    mediaId: MEDIA_A,
    role: 'Gallery',
    sortOrder: 0,
    featured: false,
    caption: null,
    isVisible: true,
    media: {
      id: MEDIA_A,
      purpose: 'business-gallery',
      status: 'ready',
      visibility: 'private',
      declaredMimeType: 'image/jpeg',
      detectedMimeType: 'image/jpeg',
      width: 1280,
      height: 960,
      sizeBytes: 1024,
      variants: [
        { url: 'https://cdn.example/a-640.webp', width: 640, height: 480, format: 'webp', transform: 'w640' },
      ],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    ...overrides,
  }
}

function serveGallery(entries: unknown[]) {
  server.use(
    http.get('*/api/v1/media/business/gallery', () => ok(entries)),
    http.get('*/api/v1/media/business/gallery/capacity', () =>
      ok({ limit: 30, used: entries.length, remaining: 30 - entries.length }),
    ),
  )
}

describe('GalleryManager', () => {
  it('lists the owner’s photos with their publication state', async () => {
    serveGallery([
      entry({ caption: 'Balayage' }),
      entry({ mediaId: MEDIA_B, sortOrder: 1, isVisible: false }),
    ])

    renderStorefront(<GalleryManager />)

    expect(await screen.findByText('Published')).toBeInTheDocument()
    expect(screen.getByText('Hidden')).toBeInTheDocument()
    const captions = screen.getAllByLabelText(/caption/i, { selector: 'input' })
    expect(captions[0]).toHaveValue('Balayage')
    expect(captions[1]).toHaveValue('')
  })

  it('publishes and hides a photo through the entry endpoint', async () => {
    const user = userEvent.setup()
    const patches: unknown[] = []
    serveGallery([entry()])
    server.use(
      http.patch('*/api/v1/media/business/gallery/:mediaId', async ({ request, params }) => {
        patches.push({ mediaId: params.mediaId, body: await request.json() })
        return ok(entry({ isVisible: false }))
      }),
    )

    renderStorefront(<GalleryManager />)

    await user.click(await screen.findByRole('switch', { name: /hide photo 1/i }))

    await waitFor(() =>
      expect(patches).toEqual([{ mediaId: MEDIA_A, body: { isVisible: false } }]),
    )
  })

  it('saves a caption on blur, not on every keystroke', async () => {
    const user = userEvent.setup()
    const patches: unknown[] = []
    serveGallery([entry()])
    server.use(
      http.patch('*/api/v1/media/business/gallery/:mediaId', async ({ request }) => {
        patches.push(await request.json())
        return ok(entry({ caption: 'The studio floor' }))
      }),
    )

    renderStorefront(<GalleryManager />)

    const caption = await screen.findByLabelText(/caption/i, { selector: 'input' })
    await user.type(caption, 'The studio floor')

    // Typing alone must not have issued anything.
    expect(patches).toHaveLength(0)

    await user.tab()

    await waitFor(() => expect(patches).toEqual([{ caption: 'The studio floor' }]))
  })

  it('removes a photo from the gallery', async () => {
    const user = userEvent.setup()
    const deletes: string[] = []
    serveGallery([entry()])
    server.use(
      http.delete('*/api/v1/media/business/gallery/:mediaId', ({ params }) => {
        deletes.push(String(params.mediaId))
        return ok(true)
      }),
    )

    renderStorefront(<GalleryManager />)

    await user.click(await screen.findByRole('button', { name: /remove photo 1/i }))

    await waitFor(() => expect(deletes).toEqual([MEDIA_A]))
  })

  it('invites the owner to add photos when the gallery is empty', async () => {
    serveGallery([])

    renderStorefront(<GalleryManager />)

    expect(await screen.findByText(/no photos yet/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add photos/i })).toBeEnabled()
  })

  it('explains a failure instead of showing an empty gallery', async () => {
    const onGallery = vi.fn(() =>
      ok(null, { status: 500 }),
    )
    server.use(
      http.get('*/api/v1/media/business/gallery', onGallery),
      http.get('*/api/v1/media/business/gallery/capacity', () =>
        ok({ limit: 30, used: 0, remaining: 30 }),
      ),
    )

    renderStorefront(<GalleryManager />)

    expect(await screen.findByText(/your gallery didn’t load/i)).toBeInTheDocument()
  })
})
