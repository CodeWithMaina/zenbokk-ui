import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import type { StorefrontConfig, StorefrontRevision } from '../../lib/api/types'
import { MODULE } from '../../lib/entitlements'
import { createDefaultConfig } from '../../lib/storefront-builder'
import { StorefrontBuilderPage } from '../../routes/dashboard.storefront.builder'
import { makeDashboardContext } from '../../test/appointments'
import { TEST_BUSINESS_ID } from '../../test/fixtures'
import { fail, ok } from '../../test/handlers'
import { renderDashboard } from '../../test/render'
import { server } from '../../test/server'

/**
 * Version history inside the real builder screen.
 *
 * These assertions run against the actual route component, the real editor hook
 * and the real API client, so they cover what a unit test cannot: that previewing
 * an old version leaves the draft alone, that a restore replaces the draft only
 * after it is confirmed, that a refused restore changes nothing, and that the
 * history is re-read once a rollback has been recorded.
 */

const BUILDER = '*/api/v1/storefront/builder'
const REVISIONS = '*/api/v1/storefront/builder/revisions'

const DRAFT_TITLE = 'Draft services heading'
const HISTORIC_TITLE = 'Historic services heading'

function configWithFirstSectionTitle(title: string): StorefrontConfig {
  const config = createDefaultConfig()
  const [first, ...rest] = config.sections
  return { ...config, sections: [{ ...first, title }, ...rest] }
}

const DRAFT = configWithFirstSectionTitle(DRAFT_TITLE)
const HISTORIC = configWithFirstSectionTitle(HISTORIC_TITLE)

function builderState(draft: StorefrontConfig = DRAFT) {
  return {
    businessId: TEST_BUSINESS_ID,
    templateId: 'classic',
    isPublished: true,
    publishedAt: '2026-11-05T09:00:00.000Z',
    updatedAt: '2026-11-06T09:00:00.000Z',
    hasDraft: true,
    hasUnpublishedChanges: false,
    draft,
    published: draft,
    draftVersion: 4,
    latestRevisionNumber: 4,
  }
}

function revision(overrides: Partial<StorefrontRevision> = {}): StorefrontRevision {
  return {
    id: 'rev-1',
    revisionNumber: 1,
    revisionType: 'draftSave',
    description: 'Baseline snapshot',
    createdAt: '2026-11-01T09:00:00.000Z',
    createdByUserId: 'user-1',
    createdByName: 'Test Owner',
    sourceRevisionId: null,
    sourceRevisionNumber: null,
    isPublishedSnapshot: false,
    ...overrides,
  }
}

function historyPage(items: StorefrontRevision[]) {
  return {
    items,
    page: 1,
    pageSize: 20,
    totalCount: items.length,
    totalPages: 1,
    hasMore: false,
    draftVersion: 4,
  }
}

function renderBuilder() {
  renderDashboard(<StorefrontBuilderPage />, {
    // Only the storefront module: the preview's gated sections then render
    // nothing, so the screen makes exactly the requests these tests declare.
    // `hasModule` is closed over in the fixture, so it is overridden as well.
    context: makeDashboardContext({
      entitlements: [MODULE.storefront],
      hasModule: (key: string) => key === MODULE.storefront,
    }),
  })
}

async function revisionRow(number: number): Promise<HTMLElement> {
  await screen.findByText(`#${number}`)
  const row = document.querySelector(`[data-revision-number="${number}"]`)
  expect(row).not.toBeNull()
  return row as HTMLElement
}

describe('builder version history', () => {
  it('previews a saved version without touching the draft', async () => {
    const user = userEvent.setup()
    let draftWrites = 0
    server.use(
      http.get(BUILDER, () => ok(builderState())),
      http.get(REVISIONS, () => ok(historyPage([revision()]))),
      http.get(`${REVISIONS}/:revisionId`, () =>
        ok({ revision: revision(), configuration: HISTORIC }),
      ),
      http.put(`${BUILDER}/draft`, () => {
        draftWrites += 1
        return ok(builderState())
      }),
    )

    renderBuilder()

    expect(await screen.findByText(DRAFT_TITLE)).toBeInTheDocument()
    expect(screen.getByText('Draft matches the published storefront.')).toBeInTheDocument()

    await user.click(screen.getByTestId('builder-history'))
    await user.click(within(await revisionRow(1)).getByRole('button', { name: 'Preview' }))

    expect(await screen.findByTestId('historical-preview-banner')).toHaveTextContent(
      'Viewing version #1',
    )

    // The draft is untouched: still clean, still the editor's own content, and
    // nothing was written back to the server.
    expect(screen.getByText(DRAFT_TITLE)).toBeInTheDocument()
    expect(screen.queryByText(HISTORIC_TITLE)).not.toBeInTheDocument()
    expect(screen.getByText('Draft matches the published storefront.')).toBeInTheDocument()
    expect(draftWrites).toBe(0)

    await user.click(screen.getByRole('button', { name: 'Return to current draft' }))
    await waitFor(() =>
      expect(screen.queryByTestId('historical-preview-banner')).not.toBeInTheDocument(),
    )
    expect(screen.getByText(DRAFT_TITLE)).toBeInTheDocument()
    // This renders the entire editor screen and walks a full user journey, so it
    // is given more than the default per-test budget.
  }, 20_000)

  it('restores a version into the draft and refreshes the history', async () => {
    const user = userEvent.setup()
    let historyReads = 0
    server.use(
      http.get(BUILDER, () => ok(builderState())),
      http.get(REVISIONS, () => {
        historyReads += 1
        return ok(historyPage([revision()]))
      }),
      http.get(`${REVISIONS}/:revisionId`, () =>
        ok({ revision: revision(), configuration: HISTORIC }),
      ),
      http.post(`${REVISIONS}/:revisionId/restore`, () =>
        ok({
          revision: revision({
            id: 'rev-2',
            revisionNumber: 2,
            revisionType: 'rollback',
            description: 'Restored version #1',
            sourceRevisionId: 'rev-1',
            sourceRevisionNumber: 1,
          }),
          state: builderState(HISTORIC),
        }),
      ),
    )

    renderBuilder()
    await screen.findByText(DRAFT_TITLE)

    await user.click(screen.getByTestId('builder-history'))
    await user.click(within(await revisionRow(1)).getByRole('button', { name: 'Restore' }))
    await user.click(await screen.findByRole('button', { name: 'Restore this version' }))

    // The editor adopts the restored draft…
    expect(await screen.findByText(HISTORIC_TITLE)).toBeInTheDocument()
    // …and the history is read again, because a rollback is a new revision.
    await waitFor(() => expect(historyReads).toBeGreaterThan(1))
  }, 20_000)

  it('leaves the draft and the editor alone when a restore is refused', async () => {
    const user = userEvent.setup()
    server.use(
      http.get(BUILDER, () => ok(builderState())),
      http.get(REVISIONS, () => ok(historyPage([revision()]))),
      http.get(`${REVISIONS}/:revisionId`, () =>
        ok({ revision: revision(), configuration: HISTORIC }),
      ),
      http.post(`${REVISIONS}/:revisionId/restore`, () =>
        fail('STALE_VERSION', 'This storefront changed since you opened it.', 409),
      ),
    )

    renderBuilder()
    await screen.findByText(DRAFT_TITLE)

    await user.click(screen.getByTestId('builder-history'))
    await user.click(within(await revisionRow(1)).getByRole('button', { name: 'Restore' }))
    await user.click(await screen.findByRole('button', { name: 'Restore this version' }))

    expect(await screen.findByRole('dialog', { name: 'Restore version #1?' })).toHaveTextContent(
      'That version could not be restored. Nothing was changed.',
    )
    expect(screen.getByText(DRAFT_TITLE)).toBeInTheDocument()
    expect(screen.queryByText(HISTORIC_TITLE)).not.toBeInTheDocument()
    expect(screen.getByText('Draft matches the published storefront.')).toBeInTheDocument()
  }, 20_000)
})
