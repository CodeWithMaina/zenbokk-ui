import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { ENTERPRISE_CAPABILITIES, ENTERPRISE_OUTCOMES } from '../../lib/marketing/content'
import { PublicCanvas } from './PublicCanvas'
import { PunchedMark } from './PunchedMark'
import { REGISTER_TO } from './LandingPage'

/** Where enterprise enquiries go — a real address, not a placeholder form. */
export const SALES_EMAIL = 'sales@punched.app'

/**
 * PUNCHED Enterprise — the marketing page for groups, franchises and
 * multi-location operators. It keeps the original's editorial index treatment
 * (uppercase mono labels, hairline grid, one giant watermark) on the shared
 * public canvas, so it reads as the same publication as the landing page.
 */
export function EnterprisePage() {
  return (
    <PublicCanvas>
      <header className="fixed inset-x-0 top-0 z-(--z-header) flex h-12 items-center justify-between border-b border-line bg-bg px-5 md:px-16">
        <Link to="/" aria-label="Punched home" className="flex items-center gap-2 no-underline">
          <PunchedMark className="size-4" />
          <span className="punch-display text-[1.15rem] leading-none tracking-tight text-fg">
            PUNCHED
          </span>
        </Link>
        <span className="punch-eyebrow">Enterprise</span>
        <Link
          to={REGISTER_TO}
          className="border border-line px-4 py-1 font-mono text-[0.75rem] text-fg no-underline transition-colors hover:bg-hover"
        >
          Get Started
        </Link>
      </header>

      <main className="flex flex-col pt-12">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-5 py-20 text-center md:px-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 -left-[6%] -translate-y-1/2 font-display text-[36vw] leading-none font-extrabold text-subtle opacity-10 select-none md:text-[360px]"
          >
            ENT
          </div>

          <div className="z-10 flex w-full max-w-3xl flex-col items-center">
            <p className="punch-eyebrow mb-8">
              For groups · franchises · multi-location operators
            </p>
            <h1 className="punch-display mb-8 text-[clamp(2.75rem,9vw,5rem)] leading-[0.95] tracking-tight">
              Loyalty at
              <br />
              Enterprise Scale.
            </h1>
            <p className="mb-12 max-w-xl font-mono text-[0.875rem] leading-relaxed text-muted md:text-[1rem]">
              One platform for every branch. Consolidated analytics, custom programs and priority
              support — backed by real-time stamp infrastructure.
            </p>
            <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row">
              <Link to={REGISTER_TO} className="btn btn-accent rounded-pill no-underline">
                Register Your Business
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <a href={`mailto:${SALES_EMAIL}`} className="btn rounded-pill no-underline">
                Talk to Sales
              </a>
            </div>
          </div>
        </section>

        {/* ── Capabilities index ───────────────────────────────── */}
        <section className="w-full px-5 py-24">
          <h2 className="punch-eyebrow mb-12 pl-2">What Enterprise Unlocks</h2>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2">
            {ENTERPRISE_CAPABILITIES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="group relative overflow-hidden border border-line p-6 transition-colors hover:bg-hover md:p-8"
              >
                <Icon className="mb-4 size-6 text-accent" strokeWidth={1.25} aria-hidden="true" />
                <h3 className="punch-display mb-2 text-[1.05rem] font-bold tracking-tight uppercase">
                  {title}
                </h3>
                <p className="font-mono text-[0.75rem] leading-relaxed text-subtle">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Outcome strip ────────────────────────────────────── */}
        <section className="w-full px-5 pb-24">
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3">
            {ENTERPRISE_OUTCOMES.map(({ value, label }) => (
              <div key={label} className="flex flex-col gap-2 border border-line p-6">
                <span className="punch-display text-[2.25rem] leading-none tracking-tight">
                  {value}
                </span>
                <span className="punch-eyebrow">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA band ─────────────────────────────────────────── */}
        <section className="w-full px-5 pb-24">
          <div className="relative mx-auto max-w-5xl overflow-hidden border border-line p-8 text-center md:p-14">
            <h2 className="punch-display mb-4 text-[clamp(1.5rem,4vw,2.25rem)] font-extrabold tracking-tighter">
              Deploy loyalty across every location.
            </h2>
            <p className="mx-auto mb-10 max-w-lg font-mono text-[0.875rem] leading-relaxed text-subtle">
              Tell us about your footprint and we&rsquo;ll tailor a rollout plan for your brand.
            </p>
            <Link to={REGISTER_TO} className="btn btn-accent rounded-pill mx-auto no-underline">
              Get Started
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="mt-auto flex w-full flex-col items-center justify-between gap-6 border-t border-line px-5 py-8 md:flex-row md:px-16">
        <span className="punch-display font-bold tracking-tighter">PUNCHED</span>
        <nav className="flex flex-wrap justify-center gap-6 font-mono text-[0.75rem] text-subtle">
          <Link to="/" className="transition-colors hover:text-fg">
            Home
          </Link>
          <Link to={REGISTER_TO} className="transition-colors hover:text-fg">
            Register
          </Link>
          <Link to="/login" className="transition-colors hover:text-fg">
            Log in
          </Link>
        </nav>
      </footer>
    </PublicCanvas>
  )
}
