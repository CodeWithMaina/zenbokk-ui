import { Link } from '@tanstack/react-router'
import { ArrowUpRight, LayoutTemplate, PencilRuler, Store } from 'lucide-react'
import { StatusPill } from '../ui/badge'
import { Card } from '../ui/card'
import { EmptyState } from '../ui/empty-state'
import { Skeleton } from '../ui/skeleton'
import { useDashboardContext } from '../../lib/dashboard/dashboard-context'
import { MODULE } from '../../lib/entitlements'
import { formatDateTime } from '../../lib/format'
import { useStorefrontBuilder } from '../../lib/storefront-builder'
import { storefrontPublicUrl } from '../../lib/tenant'

/**
 * The storefront, surfaced on the business dashboard home.
 *
 * The overview used to mention the business's address as plain text inside the
 * billing card, which told an owner nothing about the thing they actually care
 * about: is my public page live, and does it match what I last saved? This card
 * answers that from the same builder state the editor uses — publication status,
 * when it last went live, how many versions are stored — and gives the two entry
 * points that follow from it (edit the page, change its template).
 *
 * Every value is server state; nothing here is inferred or faked.
 */
export function StorefrontStatusCard() {
  const { business, hasModule } = useDashboardContext()
  const enabled = hasModule(MODULE.storefront)
  const builder = useStorefrontBuilder(enabled)

  const state = builder.data
  const address = storefrontPublicUrl(business.slug)

  const status = (() => {
    if (!state) return null
    if (!state.isPublished) {
      return {
        tone: 'neutral' as const,
        label: 'Not published',
        detail: 'Your page is offline. Publish it from the editor when you are ready.',
      }
    }
    if (state.hasUnpublishedChanges) {
      return {
        tone: 'warning' as const,
        label: 'Draft changes',
        detail: 'You have saved changes that are not on the live page yet.',
      }
    }
    return {
      tone: 'success' as const,
      label: 'Live',
      detail: 'Your published page is up to date.',
    }
  })()

  return (
    <Card className="p-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Storefront</p>
          <h2 className="mt-[0.3rem] flex items-center gap-[0.4rem] text-heading font-bold tracking-snug">
            <Store className="size-[1.05rem] shrink-0 text-accent" aria-hidden="true" />
            Your public page
          </h2>
        </div>
        {status ? <StatusPill tone={status.tone}>{status.label}</StatusPill> : null}
      </div>

      {!enabled ? (
        <EmptyState
          icon={<Store className="size-5" />}
          title="The storefront isn’t in this plan"
          description="Turn on the Storefront module to build and publish the page customers land on before they book."
          action={
            <Link to="/dashboard/settings" className="btn btn-primary no-underline">
              Review modules
            </Link>
          }
        />
      ) : builder.isPending ? (
        <div className="mt-[0.9rem] space-y-2" aria-busy="true">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      ) : builder.isError || !state ? (
        <p className="mt-[0.75rem] text-meta text-muted">
          Your storefront status could not be loaded. Open the editor to check it.
        </p>
      ) : (
        <>
          <p className="mt-[0.45rem] text-meta text-muted">{status?.detail}</p>

          <dl className="mt-[0.9rem] grid gap-[0.5rem] text-meta">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted">Address</dt>
              <dd className="min-w-0 truncate text-right">
                <Link
                  to="/$slug"
                  params={{ slug: business.slug }}
                  className="link font-semibold"
                  title={address}
                >
                  {address}
                </Link>
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted">Last published</dt>
              <dd className="text-right font-semibold">
                {state.publishedAt ? formatDateTime(state.publishedAt) : 'Never'}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted">Saved versions</dt>
              <dd className="text-right font-semibold">{state.latestRevisionNumber}</dd>
            </div>
          </dl>
        </>
      )}

      {enabled ? (
        <div className="mt-[1rem] flex flex-wrap gap-[0.5rem]">
          <Link to="/dashboard/storefront/builder" className="btn btn-primary no-underline">
            <PencilRuler className="size-[0.9rem]" aria-hidden="true" />
            {state?.isPublished ? 'Edit storefront' : 'Build your page'}
          </Link>
          <Link to="/dashboard/storefront/templates" className="btn btn-ghost no-underline">
            <LayoutTemplate className="size-[0.9rem]" aria-hidden="true" />
            Templates
          </Link>
          {state?.isPublished ? (
            <a
              href={address}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost no-underline"
            >
              Live page
              <ArrowUpRight className="size-[0.9rem]" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      ) : null}
    </Card>
  )
}
