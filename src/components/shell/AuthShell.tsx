import type { ReactNode } from 'react'
import { Sparkles } from 'lucide-react'

/**
 * Frame for every auth screen: an editorial panel on the left (brand, promise,
 * three proof points) and the form on the right. The panel collapses to a
 * compact masthead on phones so the form is the first thing a visitor sees.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh bg-bg">
      <div className="mx-auto grid min-h-svh w-full max-w-(--container-page-wide) lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
        <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-surface px-[clamp(1.5rem,4vw,3.5rem)] py-[clamp(1.75rem,4vw,3rem)] lg:flex">
          <div
            className="pointer-events-none absolute -top-24 -left-24 size-[26rem] rounded-full bg-accent-soft opacity-70 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative">
            <p className="display text-[1.6rem] tracking-tight">Punched</p>
            <p className="eyebrow mt-[0.35rem]">The business, in one place</p>
          </div>

          <div className="relative max-w-[26rem]">
            <h2 className="display text-title">
              Every visit counted, every appointment kept.
            </h2>
            <p className="mt-[0.75rem] text-meta text-muted">
              Punched keeps your storefront, your calendar and your regulars in one
              calm workspace — so the front desk stops guessing.
            </p>
            <ul className="mt-[1.4rem] flex flex-col gap-[0.6rem]">
              {[
                'Bookings that match your real opening hours',
                'Staff, services and prices in one catalogue',
                'Loyalty that your regulars actually use',
              ].map((line) => (
                <li key={line} className="flex items-start gap-[0.5rem] text-meta">
                  <Sparkles className="mt-[0.15rem] size-[0.95rem] shrink-0 text-accent" aria-hidden="true" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="relative text-caption text-subtle">
            © {new Date().getFullYear()} Punched. All rights reserved.
          </p>
        </aside>

        <main className="flex flex-col px-5 py-[clamp(1.5rem,4vw,3rem)] sm:px-8">
          <div className="flex items-center justify-between lg:hidden">
            <p className="display text-[1.4rem]">Punched</p>
            <p className="eyebrow">The business, in one place</p>
          </div>
          <div className="flex flex-1 items-center justify-center py-[1.5rem]">
            <div className="w-full max-w-[26rem]">{children}</div>
          </div>
        </main>
      </div>
    </div>
  )
}
