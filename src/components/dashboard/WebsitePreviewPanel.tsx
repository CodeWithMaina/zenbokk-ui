import { Link } from '@tanstack/react-router'
import { ArrowUpRight, Globe, Loader2, PencilRuler, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import { useDashboardContext } from '../../lib/dashboard/dashboard-context'
import { MODULE } from '../../lib/entitlements'
import { formatDateTime } from '../../lib/format'
import { useStorefrontBuilder } from '../../lib/storefront-builder'
import { storefrontHref, storefrontPublicUrl } from '../../lib/tenant'
import { StatusPill } from '../ui/badge'
import { SectionCard } from '../ui/card'
import { EmptyState } from '../ui/empty-state'
import { Skeleton } from '../ui/skeleton'

/** The desktop viewport the storefront is rendered at before being scaled down. */
const PREVIEW_WIDTH = 1280
const PREVIEW_HEIGHT = 800

/** `/v1/...` in a frame is never shown; the address bar wants `slug.zenbokk.com`. */
function prettyAddress(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

/**
 * The browser-window frame around the live storefront.
 *
 * The storefront is rendered at a desktop size and scaled down with container
 * query units, so what the owner sees is the real site's desktop layout rather
 * than the same site reflowed into a 400px column. It is inert (`pointer-events:
 * none`) on purpose: the dashboard must not trap a click inside a miniature site,
 * which is what the "Open website" action is for.
 *
 * The frame only ever reloads when its own refresh token changes — a re-render of
 * the dashboard cannot reload the customer-facing site.
 */
export function WebsitePreviewFrame({
  src,
  address,
  label,
  className,
}: {
  src: string
  /** The address printed in the frame's bar — the canonical one the owner shares. */
  address?: string
  label: string
  className?: string
}) {
  const [token, setToken] = useState(0)
  const [loadedToken, setLoadedToken] = useState<number | null>(null)
  const [slowToken, setSlowToken] = useState<number | null>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.33)

  /**
   * The frame is a real 1280×800 viewport, scaled to whatever width the card has.
   * The scale is measured rather than expressed in CSS because `scale()` needs a
   * unitless ratio and no CSS unit can produce one from a container width.
   */
  useEffect(() => {
    const element = viewportRef.current
    if (!element) return

    const measure = () => {
      const width = element.clientWidth
      if (width > 0) setScale(Math.min(1, width / PREVIEW_WIDTH))
    }
    measure()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }

    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  /**
   * The frame reports when it is showing; until then an overlay covers it. Both
   * pieces of state are keyed by the reload token, so a remount resets them without
   * an effect having to write "loading" back into state.
   */
  useEffect(() => {
    const timer = window.setTimeout(() => setSlowToken(token), 12_000)
    return () => window.clearTimeout(timer)
  }, [token])

  const ready = loadedToken === token
  const slow = !ready && slowToken === token

  return (
    <div className={cn('dash-preview', className)}>
      <div className="dash-preview-bar">
        <span className="dash-preview-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="dash-preview-url" title={address ?? src}>
          {prettyAddress(address ?? src)}
        </span>
        <button
          type="button"
          className="dash-preview-reload"
          aria-label="Reload the website preview"
          title="Reload preview"
          onClick={() => setToken((value) => value + 1)}
        >
          <RefreshCw className="size-[0.78rem]" aria-hidden="true" />
        </button>
      </div>

      <div className="dash-preview-viewport" ref={viewportRef}>
        <iframe
          key={token}
          src={src}
          title={label}
          className="dash-preview-frame"
          loading="lazy"
          tabIndex={-1}
          width={PREVIEW_WIDTH}
          height={PREVIEW_HEIGHT}
          referrerPolicy="strict-origin-when-cross-origin"
          style={{ transform: `scale(${scale})` }}
          onLoad={() => setLoadedToken(token)}
        />
        {ready ? null : (
          <div className="dash-preview-overlay" aria-live="polite">
            {slow ? (
              <>
                Still loading.
                <button
                  type="button"
                  className="link font-semibold"
                  onClick={() => setToken((value) => value + 1)}
                >
                  Try again
                </button>
              </>
            ) : (
              <>
                <Loader2 className="size-[1rem] animate-spin" aria-hidden="true" />
                Loading your website…
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * "Your website": what a customer sees at this business's public address.
 *
 * The address comes from the tenant router (`storefrontPublicUrl`) and the frame is
 * the real storefront at the same origin (`storefrontHref`) — the path form of the
 * same routing the subdomain uses, which keeps the embed inside this tenant without
 * requiring the storefront host to relax any framing policy. No identifier is taken
 * from the caller: the slug is the one the dashboard bootstrap resolved from the
 * signed-in membership.
 *
 * An unpublished site is never framed (it would render a "not available" page); the
 * card explains the state and sends the owner to the existing publishing flow.
 */
export function WebsitePreviewPanel({ className }: { className?: string }) {
  const { business, hasModule } = useDashboardContext()
  const enabled = hasModule(MODULE.storefront)
  const builder = useStorefrontBuilder(enabled)
  const state = builder.data

  const address = useMemo(
    () => (business.slug ? storefrontPublicUrl(business.slug) : null),
    [business.slug],
  )

  /**
   * The same-origin path form of the storefront. On a business host this is `/`;
   * on the app/marketing host it is `/{slug}`. It is the published site either way.
   */
  const previewSrc = useMemo(() => {
    if (!business.slug || typeof window === 'undefined') return null
    return `${window.location.origin}${storefrontHref(business.slug)}`
  }, [business.slug])

  if (!enabled) return null

  const published = Boolean(state?.isPublished)
  const status = !state
    ? null
    : !state.isPublished
      ? { tone: 'neutral' as const, label: 'Not published' }
      : state.hasUnpublishedChanges
        ? { tone: 'warning' as const, label: 'Draft changes' }
        : { tone: 'success' as const, label: 'Live' }

  return (
    <SectionCard
      icon={<Globe />}
      iconTone="info"
      title="Your website"
      titleClassName="font-display font-normal"
      description={
        address ? (
          <span className="block truncate" title={address}>
            {prettyAddress(address)}
          </span>
        ) : (
          'No address yet'
        )
      }
      className={cn(
        'w-full max-w-[44rem] min-w-0 self-start p-[clamp(0.7rem,1vw,1rem)] min-[60rem]:max-w-none',
        className,
      )}
      contentClassName="mt-[0.65rem]"
      action={status ? <StatusPill tone={status.tone}>{status.label}</StatusPill> : null}
    >
      {builder.isPending ? (
        <div className="grid gap-[0.45rem]" aria-busy="true" aria-label="Loading your website">
          <Skeleton className="h-[1.4rem] rounded-md" />
          <Skeleton className="aspect-[16/10] w-full rounded-[0.7rem]" />
        </div>
      ) : builder.isError ? (
        <div className="text-meta text-muted">
          <p>The website status could not be loaded.</p>
          <div className="mt-[0.6rem] flex flex-wrap items-center gap-[0.6rem]">
            <button
              type="button"
              className="link font-semibold"
              onClick={() => void builder.refetch()}
            >
              Try again
            </button>
            {address ? (
              <a href={address} target="_blank" rel="noreferrer" className="link font-semibold">
                Open website
              </a>
            ) : null}
          </div>
        </div>
      ) : !business.slug || !address || !previewSrc ? (
        <EmptyState
          className="py-[1.2rem]"
          icon={<Globe className="size-5" />}
          title="Set up your address"
          description="Your website needs a public address before it can go live."
          action={
            <Link to="/dashboard/settings" className="btn btn-ghost no-underline">
              Open settings
            </Link>
          }
        />
      ) : !published ? (
        <EmptyState
          className="py-[1.2rem]"
          icon={<Globe className="size-5" />}
          title="Your website isn’t published"
          description="Your page is saved but offline. Publish it from the builder to show it to customers."
          action={
            <Link to="/dashboard/storefront/builder" className="btn btn-primary no-underline">
              <PencilRuler className="size-[0.9rem]" aria-hidden="true" />
              Build &amp; publish
            </Link>
          }
        />
      ) : (
        <WebsitePreviewFrame
          src={previewSrc}
          address={address}
          label={`${business.name} — live website preview`}
        />
      )}

      <div className="mt-[0.7rem] flex flex-wrap items-center gap-x-[0.7rem] gap-y-[0.45rem]">
        {state?.isPublished ? (
          <span className="text-caption text-subtle">
            {state.publishedAt ? `Updated ${formatDateTime(state.publishedAt)}` : 'Live'}
          </span>
        ) : null}

        <div className="ml-auto flex flex-wrap items-center gap-[0.45rem]">
          {published && address ? (
            <a
              href={address}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary btn-sm no-underline"
            >
              Open website
              <ArrowUpRight className="size-[0.85rem]" aria-hidden="true" />
            </a>
          ) : null}
          <Link to="/dashboard/storefront/builder" className="btn btn-ghost btn-sm no-underline">
            <PencilRuler className="size-[0.85rem]" aria-hidden="true" />
            Manage
          </Link>
        </div>
      </div>
    </SectionCard>
  )
}

