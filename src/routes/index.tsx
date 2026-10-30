import { createFileRoute, Link, Navigate, useNavigate } from '@tanstack/react-router'
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  ShieldCheck,
  Sparkles,
  Store,
  UsersRound,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Field } from '../components/ui/field'
import { StorefrontGate } from '../lib/storefront'
import { getRootDomain, marketingUrl, resolveSurface, tenantUrl } from '../lib/tenant'
import { StorefrontHomePage } from './$slug.index'

export const Route = createFileRoute('/')({
  component: HomeRoute,
})

/**
 * The address decides which product this is.
 *
 *  - `nuru-studio.zenbokk.com/` → that business's storefront.
 *  - `admin.zenbokk.com/`      → the platform administration dashboard.
 *  - `zenbokk.com/`            → the Zenbokk marketing website.
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
        <StorefrontHomePage />
      </StorefrontGate>
    )
  }

  return <MarketingHome />
}

function HostUnavailable({ surfaceReason }: { surfaceReason: string }) {
  return (
    <main className="grid min-h-svh place-items-center bg-bg px-5 py-12">
      <Card className="w-full max-w-[34rem] p-[clamp(1.2rem,4vw,2rem)]">
        <span className="grid size-[2.6rem] place-items-center rounded-full bg-accent-soft text-accent-ink">
          <Store className="size-[1.2rem]" aria-hidden="true" />
        </span>
        <p className="eyebrow mt-[0.9rem]">Address unavailable</p>
        <h1 className="display mt-[0.35rem] text-title">This address isn’t a business page</h1>
        <p className="mt-[0.5rem] text-meta text-muted">
          {surfaceReason === 'reserved'
            ? 'This hostname belongs to the platform, not to a business.'
            : 'Business addresses are a single name on the Zenbokk domain, for example nuru-studio.zenbokk.com.'}
        </p>
        <div className="mt-[1.2rem] flex flex-wrap gap-[0.5rem]">
          <a href={marketingUrl('/')} className="btn btn-primary no-underline">
            Go to Zenbokk
          </a>
          <Link to="/login" className="btn btn-ghost no-underline">
            Business sign in
          </Link>
        </div>
      </Card>
    </main>
  )
}

const FEATURES = [
  {
    icon: CalendarCheck2,
    title: 'A calendar that tells the truth',
    body: 'Real opening hours, real staff availability and no double bookings — online or at the desk.',
  },
  {
    icon: Store,
    title: 'One storefront per business',
    body: 'Every business gets its own address on the Zenbokk domain, configured from its owner dashboard.',
  },
  {
    icon: UsersRound,
    title: 'Customers who come back',
    body: 'Bookings, visit history and loyalty live in the same account, so regulars are recognised.',
  },
  {
    icon: ShieldCheck,
    title: 'Separate by design',
    body: 'Owners, staff and customers each see only their business. Plan modules decide what is switched on.',
  },
] as const

function normaliseSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\..*$/, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** The public Zenbokk website. It never resolves a tenant from this host. */
function MarketingHome() {
  const navigate = useNavigate()
  const [address, setAddress] = useState('')
  const slug = normaliseSlug(address)
  const root = getRootDomain()

  function openBusiness() {
    if (!slug) return
    if (root) {
      // Host-based address — works on localhost and in production.
      window.location.assign(tenantUrl(slug))
      return
    }
    void navigate({ to: '/$slug', params: { slug } })
  }

  return (
    <div className="min-h-svh bg-bg">
      <header className="sticky top-0 z-(--z-header) border-b border-line bg-surface/92 backdrop-blur">
        <div className="mx-auto flex w-full max-w-(--container-page) items-center justify-between gap-4 px-gutter py-[0.85rem]">
          <Link to="/" className="flex items-center gap-[0.55rem] no-underline">
            <span className="grid size-[1.9rem] place-items-center rounded-md bg-inverse font-display text-[0.95rem] leading-none text-on-inverse">
              Z
            </span>
            <span className="display text-[1.3rem] tracking-tight text-fg">Zenbokk</span>
          </Link>

          <nav className="hidden items-center gap-[1.1rem] text-label md:flex" aria-label="Primary">
            <a href="#features" className="link text-muted">
              Features
            </a>
            <a href="#how" className="link text-muted">
              How it works
            </a>
            <a href="#plans" className="link text-muted">
              Plans
            </a>
            <a href="#find" className="link text-muted">
              Find a business
            </a>
          </nav>

          <div className="flex items-center gap-[0.4rem]">
            <Link to="/login" className="btn btn-ghost no-underline max-sm:btn-sm">
              Sign in
            </Link>
            <Link to="/register" className="btn btn-primary no-underline max-sm:btn-sm">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="border-b border-line bg-surface">
          <div className="mx-auto grid w-full max-w-(--container-page) items-center gap-[clamp(1.5rem,4vw,3rem)] px-gutter py-[clamp(2.5rem,7vw,5rem)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
            <div>
              <p className="eyebrow">The operating system for service businesses</p>
              <h1 className="display mt-[0.6rem] text-display">
                Your business, with its own address.
              </h1>
              <p className="mt-[1rem] max-w-[36rem] text-lead text-muted">
                Zenbokk gives every business a storefront, a booking calendar, a team console and
                a loyalty programme — each on its own subdomain, each scoped to its own customers.
              </p>

              <div className="mt-[1.5rem] flex flex-wrap items-center gap-[0.6rem]">
                <Link to="/register" className="btn btn-primary btn-xl no-underline">
                  Create your business
                  <ArrowRight className="size-[1rem]" aria-hidden="true" />
                </Link>
                <Link to="/login" className="btn btn-ghost btn-xl no-underline">
                  Owner sign in
                </Link>
              </div>

              <ul className="mt-[1.4rem] flex list-none flex-wrap gap-x-[1.1rem] gap-y-[0.4rem] p-0 text-meta text-muted">
                {['Free to start', 'Your own subdomain', 'No card required'].map((line) => (
                  <li key={line} className="flex items-center gap-[0.35rem]">
                    <Check className="size-[0.9rem] text-accent" aria-hidden="true" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative overflow-hidden rounded-panel border border-line bg-sunken p-[clamp(1rem,3vw,1.5rem)]">
              <div className="rounded-card border border-line bg-surface p-[1rem] shadow-sm">
                <p className="text-caption text-subtle">Business address</p>
                <p className="mt-[0.2rem] font-mono text-meta text-fg">
                  nuru-studio{root ? `.${root}` : '/nuru-studio'}
                </p>
                <div className="mt-[0.9rem] grid grid-cols-3 gap-[0.5rem] text-center">
                  {[
                    ['Today', '6 bookings'],
                    ['This week', '31 visits'],
                    ['Regulars', '128'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-md border border-line bg-hover p-[0.55rem]">
                      <p className="text-caption text-subtle">{label}</p>
                      <p className="mt-[0.15rem] text-label font-bold">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-[0.9rem] flex items-center justify-between rounded-md bg-accent-soft px-[0.7rem] py-[0.55rem] text-meta text-accent-ink">
                  <span className="flex items-center gap-[0.35rem] font-semibold">
                    <Sparkles className="size-[0.9rem]" aria-hidden="true" />
                    Next appointment
                  </span>
                  <span>14:30 · Amina</span>
                </div>
              </div>
              <p className="mt-[0.8rem] text-caption text-subtle">
                Illustrative dashboard — every number in the real console comes from your own
                business.
              </p>
            </div>
          </div>
        </section>

        <section id="features" className="border-b border-line">
          <div className="mx-auto w-full max-w-(--container-page) px-gutter py-[clamp(2rem,5vw,3.5rem)]">
            <p className="eyebrow">Built around the counter</p>
            <h2 className="display mt-[0.4rem] text-title">
              Everything the front desk needs. Nothing it doesn’t.
            </h2>
            <ul className="mt-[1.5rem] grid list-none grid-cols-1 gap-[0.9rem] p-0 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((feature) => (
                <li key={feature.title} className="card p-card">
                  <span className="grid size-[2.3rem] place-items-center rounded-full bg-accent-soft text-accent-ink">
                    <feature.icon className="size-[1.05rem]" aria-hidden="true" />
                  </span>
                  <h3 className="mt-[0.7rem] text-heading font-bold tracking-snug">
                    {feature.title}
                  </h3>
                  <p className="mt-[0.3rem] text-meta text-muted">{feature.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="how" className="border-b border-line bg-surface">
          <div className="mx-auto grid w-full max-w-(--container-page) gap-[1.4rem] px-gutter py-[clamp(2rem,5vw,3rem)] md:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Create your owner account',
                body: 'Confirm your email, then name your business. Zenbokk generates a unique, URL-safe address for it.',
              },
              {
                step: '02',
                title: 'Open your dashboard',
                body: 'Add services, invite staff and publish your storefront. Your plan decides which modules are switched on.',
              },
              {
                step: '03',
                title: 'Share your address',
                body: 'Customers book, sign up and collect loyalty on your own subdomain — separate from every other business.',
              },
            ].map((item) => (
              <article key={item.step}>
                <p className="font-mono text-meta text-accent">{item.step}</p>
                <h3 className="mt-[0.3rem] text-heading font-bold tracking-snug">{item.title}</h3>
                <p className="mt-[0.3rem] text-meta text-muted">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="plans" className="border-b border-line">
          <div className="mx-auto w-full max-w-(--container-page) px-gutter py-[clamp(2rem,5vw,3.5rem)]">
            <div className="grid gap-[1.5rem] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div>
                <p className="eyebrow">Plans</p>
                <h2 className="display mt-[0.4rem] text-title">Start with what you need.</h2>
                <p className="mt-[0.6rem] max-w-[32rem] text-meta text-muted">
                  Every new business starts on the standard plan so the essentials work on day
                  one. Modules are controlled by your subscription — upgrade when you add staff,
                  loyalty or analytics, and the storefront updates without a redeploy.
                </p>
                <div className="mt-[1rem] flex flex-wrap gap-[0.5rem]">
                  <Link to="/register" className="btn btn-primary no-underline">
                    Create your business
                  </Link>
                  <Link to="/login" className="btn btn-ghost no-underline">
                    Sign in to manage a plan
                  </Link>
                </div>
              </div>
              <Card className="p-card">
                <h3 className="text-heading font-bold tracking-snug">
                  What’s included as you grow
                </h3>
                <ul className="mt-[0.6rem] grid list-none grid-cols-1 gap-[0.4rem] p-0 text-meta text-muted sm:grid-cols-2">
                  {[
                    'Storefront and booking',
                    'Service catalogue',
                    'Staff console',
                    'Customer records',
                    'Loyalty and rewards',
                    'Analytics',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-[0.35rem]">
                      <Check
                        className="mt-[0.15rem] size-[0.85rem] shrink-0 text-accent"
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-[0.8rem] text-caption text-subtle">
                  Exact module availability is shown inside your owner dashboard and is enforced
                  by the API on every request.
                </p>
              </Card>
            </div>
          </div>
        </section>

        <section id="find" className="border-b border-line bg-surface">
          <div className="mx-auto w-full max-w-(--container-page) px-gutter py-[clamp(2rem,5vw,3rem)]">
            <div className="max-w-[38rem]">
              <p className="eyebrow">Already have an address?</p>
              <h2 className="display mt-[0.4rem] text-title">Find a business on Zenbokk</h2>
              <p className="mt-[0.4rem] text-meta text-muted">
                Type the name you were given — for example <code>nuru-studio</code> — and we’ll
                take you to its own page.
              </p>
            </div>

            <form
              className="mt-[1.1rem] flex max-w-[42rem] flex-col gap-[0.7rem] sm:flex-row sm:items-end"
              onSubmit={(event) => {
                event.preventDefault()
                openBusiness()
              }}
            >
              <Field label="Business address" htmlFor="business-address" className="flex-1">
                <div className="flex items-stretch">
                  <span className="flex items-center rounded-l-md border border-r-0 border-line bg-hover px-[0.7rem] text-meta text-subtle">
                    {root ? `${root}/` : 'zenbokk.com/'}
                  </span>
                  <input
                    id="business-address"
                    name="business-address"
                    className="input rounded-l-none"
                    placeholder="nuru-studio"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                  />
                </div>
              </Field>
              <Button type="submit" variant="primary" disabled={!slug}>
                Open
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </form>

            <p className="mt-[0.8rem] text-caption text-subtle">
              Looking for bookings you already made? Sign in on the business’s own page to see
              them.
            </p>
          </div>
        </section>
      </main>

      <footer className="bg-surface">
        <div className="mx-auto flex w-full max-w-(--container-page) flex-col gap-[1rem] px-gutter py-[1.6rem] text-caption text-subtle md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Zenbokk. All rights reserved.</p>
          <nav className="flex flex-wrap items-center gap-[1rem]" aria-label="Platform">
            <Link to="/register" className="link">
              Create a business
            </Link>
            <Link to="/login" className="link">
              Business sign in
            </Link>
            <Link to="/admin/login" className="link">
              Platform administration
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
