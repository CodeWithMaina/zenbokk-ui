import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import type { StorefrontRevision } from '../../lib/api/types'
import { fail, ok } from '../../test/handlers'
import { renderDashboard } from '../../test/render'
import { server } from '../../test/server'
import { RevisionHistoryPanel } from './RevisionHistoryPanel'
import { revisionPeriod } from '../../lib/storefront-builder/revisions'

/**
 * The version history panel.
 *
 * Everything it renders comes from the API, so these tests serve the real
 * endpoints through MSW and assert the panel's behaviour: the metadata it shows,
 * its loading / empty / error states, and — most importantly — that restoring is
 * never accidental and never reports success it did not get.
 */

const BASE = '*/api/v1/storefront/builder/revisions'

function revision(overrides: Partial<StorefrontRevision> = {}): StorefrontRevision {
  return {
    id: 'rev-1',
    revisionNumber: 1,
    revisionType: 'draftSave',
    description: 'Draft saved',
    createdAt: new Date().toISOString(),
    createdByUserId: 'user-1',
    createdByName: 'Test Owner',
    sourceRevisionId: null,
    sourceRevisionNumber: null,
    isPublishedSnapshot: false,
    ...overrides,
  }
}

function historyPage(items: StorefrontRevision[], overrides: Record<string, unknown> = {}) {
  return {
    items,
    page: 1,
    pageSize: 20,
    totalCount: items.length,
    totalPages: 1,
    hasMore: false,
    draftVersion: 4,
    ...overrides,
  }
}

function renderPanel(overrides: Partial<Parameters<typeof RevisionHistoryPanel>[0]> = {}) {
  const onPreview = vi.fn()
  const onRestore = vi.fn(async (_revision: StorefrontRevision) => true)
  const onClose = vi.fn()

  renderDashboard(
    <RevisionHistoryPanel
      open
      onClose={onClose}
      draftVersion={4}
      publishedAt="2026-11-05T09:00:00.000Z"
      hasUnsavedChanges={false}
      onPreview={onPreview}
      onRestore={onRestore}
      {...overrides}
    />,
  )

  return { onPreview, onRestore, onClose }
}

describe('RevisionHistoryPanel', () => {
  it('groups saved versions into readable time buckets', () => {
    const now = new Date('2026-11-06T12:00:00.000Z')

    expect(revisionPeriod('2026-11-06T09:00:00.000Z', now)).toBe('Today')
    expect(revisionPeriod('2026-11-05T09:00:00.000Z', now)).toBe('Yesterday')
    expect(revisionPeriod('2026-11-02T09:00:00.000Z', now)).toBe('Earlier this week')
    expect(revisionPeriod('2026-10-01T09:00:00.000Z', now)).toBe('Older')
  })

  it('shows the version, time and type of every revision it is given', async () => {
    server.use(
      http.get(BASE, () =>
        ok(
          historyPage([
            revision({
              id: 'rev-2',
              revisionNumber: 2,
              revisionType: 'publish',
              description: 'Published to the live storefront',
              createdByName: 'Wanjiru',
              isPublishedSnapshot: true,
            }),
            revision({ id: 'rev-1', revisionNumber: 1, description: 'Baseline snapshot' }),
          ]),
        ),
      ),
    )

    renderPanel()

    // Wait for the list itself — "Published" alone also matches the filter chip.
    expect(await screen.findByText('Published to the live storefront')).toBeInTheDocument()
    const rows = await screen.findAllByRole('listitem')
    const publishedRow = rows.find((row) => within(row).queryByText('#2')) as HTMLElement
    expect(within(publishedRow).getByText('Published')).toBeInTheDocument()
    expect(screen.getByText(/Wanjiru/)).toBeInTheDocument()
    expect(screen.getByText('Draft saved')).toBeInTheDocument()
    expect(screen.getByText('Baseline snapshot')).toBeInTheDocument()
    expect(screen.getByText('#2')).toBeInTheDocument()
    expect(screen.getByText('Version 4')).toBeInTheDocument()
  })

  it('describes an empty history instead of inventing entries', async () => {
    server.use(http.get(BASE, () => ok(historyPage([]))))

    renderPanel()

    expect(await screen.findByText('No versions yet')).toBeInTheDocument()
  })

  it('reports a failed history load and offers a retry', async () => {
    server.use(http.get(BASE, () => fail('LOAD_FAILED', 'boom', 500)))

    renderPanel()

    expect(await screen.findByText('Your version history could not be loaded.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('never restores without an explicit confirmation', async () => {
    const user = userEvent.setup()
    server.use(http.get(BASE, () => ok(historyPage([revision()]))))

    const { onRestore } = renderPanel()

    await user.click(await screen.findByRole('button', { name: 'Restore' }))

    // The drawer is also a dialog, so address the confirmation by its title.
    const dialog = await screen.findByRole('dialog', { name: 'Restore version #1?' })
    expect(dialog).toHaveTextContent('Your live storefront does not change')
    expect(onRestore).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Restore this version' }))

    await waitFor(() => expect(onRestore).toHaveBeenCalledTimes(1))
    expect(onRestore.mock.calls[0][0]).toMatchObject({ id: 'rev-1' })
  })

  it('warns about unsaved editor changes before replacing the draft', async () => {
    const user = userEvent.setup()
    server.use(http.get(BASE, () => ok(historyPage([revision()]))))

    renderPanel({ hasUnsavedChanges: true })
    await user.click(await screen.findByRole('button', { name: 'Restore' }))

    expect(await screen.findByRole('dialog', { name: 'Restore version #1?' })).toHaveTextContent(
      'You have unsaved editor changes',
    )
  })

  it('keeps the dialog open and explains itself when a restore is refused', async () => {
    const user = userEvent.setup()
    server.use(http.get(BASE, () => ok(historyPage([revision()]))))
    const onRestore = vi.fn(async (_revision: StorefrontRevision) => false)

    renderPanel({ onRestore })
    await user.click(await screen.findByRole('button', { name: 'Restore' }))
    await user.click(await screen.findByRole('button', { name: 'Restore this version' }))

    await waitFor(() => expect(onRestore).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('dialog', { name: 'Restore version #1?' })).toHaveTextContent(
      'That version could not be restored. Nothing was changed.',
    )
    expect(screen.getByText('Version 4')).toBeInTheDocument()
  })

  it('previews a version without restoring it', async () => {
    const user = userEvent.setup()
    server.use(http.get(BASE, () => ok(historyPage([revision()]))))

    const { onPreview, onRestore } = renderPanel()

    await user.click(await screen.findByRole('button', { name: 'Preview' }))

    expect(onPreview).toHaveBeenCalledTimes(1)
    expect(onPreview.mock.calls[0][0]).toMatchObject({ id: 'rev-1' })
    expect(onRestore).not.toHaveBeenCalled()
  })

  it('compares two versions with sentence-level differences', async () => {
    const user = userEvent.setup()
    const older = revision({ id: 'rev-1', revisionNumber: 1 })
    const newer = revision({ id: 'rev-2', revisionNumber: 2, revisionType: 'publish' })

    server.use(
      http.get(BASE, () => ok(historyPage([older, newer]))),
      http.get(`${BASE}/compare`, () =>
        ok({
          from: newer,
          to: older,
          identical: false,
          counts: { added: 1, removed: 0, modified: 1, reordered: 0 },
          changes: [
            {
              kind: 'added',
              category: 'Sections',
              label: 'Gallery section added',
              detail: null,
              targetId: 'g1',
            },
            {
              kind: 'modified',
              category: 'Hero',
              label: 'Hero headline changed',
              detail: 'from “Old” to “New”',
              targetId: null,
            },
          ],
        }),
      ),
    )

    renderPanel()

    // Scope the actions to the revision's own row: the type filter chips share
    // the page, and a row's Compare button relabels itself once it is the base.
    const rowFor = async (label: string) => {
      const rows = await screen.findAllByRole('listitem')
      const row = rows.find((candidate) => within(candidate).queryByText(label))
      expect(row).toBeDefined()
      return row as HTMLElement
    }

    await user.click(within(await rowFor('#2')).getByRole('button', { name: /Compare/ }))
    expect(screen.getByText('Now pick the version to compare with.')).toBeInTheDocument()

    await user.click(within(await rowFor('#1')).getByRole('button', { name: /Compare/ }))

    expect(await screen.findByText('What changed')).toBeInTheDocument()
    expect(screen.getByText('Gallery section added')).toBeInTheDocument()
    expect(screen.getByText('Hero headline changed')).toBeInTheDocument()
    expect(screen.getByText('Added')).toBeInTheDocument()
    expect(screen.getByText('Changed')).toBeInTheDocument()
  })

  it('filters the feed by revision type', async () => {
    const user = userEvent.setup()
    const requested: string[] = []
    server.use(
      http.get(BASE, ({ request }) => {
        requested.push(new URL(request.url).searchParams.get('type') ?? '')
        return ok(historyPage([revision()]))
      }),
    )

    renderPanel()
    await screen.findByText('#1')

    await user.click(screen.getByRole('button', { name: 'Published' }))

    await waitFor(() => expect(requested).toContain('publish'))
  })
})
