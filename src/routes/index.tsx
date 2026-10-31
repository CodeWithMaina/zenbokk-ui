import { Link, createFileRoute, Navigate } from '@tanstack/react-router'
import { Store } from 'lucide-react'
import { LandingPage } from '../components/marketing'
import { StorefrontHome } from '../components/storefront'
import { Card } from '../components/ui/card'
import { StorefrontGate } from '../lib/storefront'
import { marketingUrl, resolveSurface } from '../lib/tenant'

export const Route = createFileRoute('/')({
  component: HomeRoute,
})

/**
 * The address decides which product this is.
 *
 *  - `nuru-studio.zenbokk.com/` → that business's storefront.
 *  - `admin.zenbokk.com/`      → the platform administration console.
 *  - `zenbokk.com/`            → the Punched marketing website.
 *
 * A malformed platform address (a reserved label, or a multi-level tenant
 * address) is shown as unavailable rather than silently treated as either.
 */
function HomeRoute() {
  const surface = resolveSurface()

  if (surface.kind === 'admin') return <Navigate to="/admin" replace />
  if (surface.kind === 'unknown') return <HostUnavailable surfaceReason={surface.reason} />
  if (surface.kind === 'tenant') {
    return (
      <StorefrontGate slug={surface.slug}>
        <StorefrontHome />
      </StorefrontGate>
    )
  }

  return <LandingPage />
}

function HostUnavailable({ surfaceReason }: { surfaceReason: string }) {
  return (
    <main className="grid min-h-svh place-items-center bg-bg px-5 py-12">
      <Card className="w-full max-w-[34rem] p-[clamp(1.2rem,4vw,2rem)]">
        <span className="grid size-[2.6rem] place-items-center rounded-round bg-accent-soft text-accent-ink">
          <Store className="size-[1.2rem]" aria-hidden="true" />
        </span>
        <p className="eyebrow mt-[0.9rem]">Address unavailable</p>
        <h1 className="display mt-[0.35rem] text-title">
          This address isn&rsquo;t a business page
        </h1>
        <p className="mt-[0.5rem] text-meta text-muted">
          {surfaceReason === 'reserved'
            ? 'This hostname belongs to the platform, not to a business.'
            : 'Business addresses are a single name on the Punched domain, for example nuru-studio.zenbokk.com.'}
        </p>
        <div className="mt-[1.2rem] flex flex-wrap gap-[0.5rem]">
          <a href={marketingUrl('/')} className="btn btn-primary no-underline">
            Go to Punched
          </a>
          <Link to="/login" className="btn btn-ghost no-underline">
            Business sign in
          </Link>
        </div>
      </Card>
    </main>
  )
}
