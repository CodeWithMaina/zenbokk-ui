import { Link } from '@tanstack/react-router'
import { ArrowRight, Check } from 'lucide-react'
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { cn } from '../../lib/cn'
import {
  BUSINESS_AREAS,
  COPYRIGHT_YEAR,
  ENTERPRISE_ITEMS,
  FEATURE_TONES,
  GROWTH_STEPS,
  LANDING_FEATURES,
  SUPPORT_ITEMS,
  SUPPORT_TONES,
} from '../../lib/marketing/content'
import { toneChip, toneDeep, toneWash } from '../../lib/marketing/tones'
import { Button } from '../ui/button'
import type { FeatureInfo } from './FeatureSheet'
import { FeatureSheet } from './FeatureSheet'
import { HeroTicket } from './HeroTicket'
import { Container, PublicCanvas } from './PublicCanvas'
import { PunchedWordmark } from './PunchedMark'
import { HeaderActions, SiteHeader } from './SiteHeader'
import type { NavItem } from './SiteHeader'

/** Where every marketing call to action leads. */
export const REGISTER_TO = '/register' as const

const NAV: NavItem[] = [
  { label: 'Platform', anchor: '#platform' },
  { label: 'How it grows', anchor: '#how' },
  { label: 'Enterprise', anchor: '#enterprise' },
  { label: 'Support', anchor: '#support' },
]

/** The one action colour the public pages use, as a pill. */
const CTA = 'btn btn-accent rounded-pill no-underline'
const CTA_LINE = 'btn rounded-pill no-underline'

/**
 * PUNCHED — the company landing page.
 *
 * Everything Punched does starts with a hole punched in a card, so the page is
 * built like a ticket book: the hero card has real notches and a perforation
 * line, and that same dashed perforation is the only divider used down the
 * page. One canvas, four pastel washes, one deep forest moment, one action
 * green — and calm motion (a 10px rise that settles) rather than anything that
 * pops.
 */
export function LandingPage() {
  const [activeFeature, setActiveFeature] = useState<FeatureInfo | null>(null)
  const [selected, setSelected] = useState(0)

  const current = LANDING_FEATURES[selected]
  const CurrentIcon = current.icon
  const currentTone = FEATURE_TONES[selected]

  return (
    <PublicCanvas>
      <SiteHeader nav={NAV} right={<HeaderActions />} />

      <main>
        {/* HERO */}
        <section className="pt-32 pb-24 lg:pt-44 lg:pb-36">
          <Container>
            <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-10">
              <div className="lg:col-span-7">
                <h1 className="punch-display animate-punch-rise text-[clamp(2.75rem,10.5vw,6.25rem)] leading-[0.95]">
                  Your business, connected.
                </h1>
                <p className="punch-body animate-punch-rise punch-step-2 mt-8 max-w-[34rem] text-[18px] leading-[1.65]">
                  Loyalty, appointments, customers and staff in one platform, built around how your
                  business actually works.
                </p>
                <div className="animate-punch-rise punch-step-3 mt-10 flex flex-col gap-3 sm:flex-row">
                  <Link to={REGISTER_TO} className={CTA}>
                    Build your business system
                  </Link>
                  <a href="#platform" className={CTA_LINE}>
                    Explore the platform
                  </a>
                </div>
              </div>
              <div className="animate-punch-rise punch-step-4 lg:col-span-5">
                <HeroTicket />
              </div>
            </div>
          </Container>
        </section>

        {/* PLATFORM: pick a module, read what it does */}
        <section id="platform" className="scroll-mt-24 pb-24 lg:pb-40">
          <Container>
            <h2 className="punch-display max-w-[16ch] text-[clamp(2.25rem,6vw,4.25rem)] leading-[1.03]">
              Use one part, or run everything on it.
            </h2>
            <p className="punch-body mt-5 max-w-md text-[16px] leading-[1.7]">
              Punched is modular. Pick a module to see what it does for your business.
            </p>

            <div className="mt-12 grid gap-4 lg:mt-16 lg:grid-cols-12 lg:gap-6">
              <div
                role="tablist"
                aria-label="Platform modules"
                className="flex gap-2 overflow-x-auto pb-1 lg:col-span-4 lg:flex-col lg:gap-3 lg:overflow-visible lg:pb-0"
              >
                {LANDING_FEATURES.map((feature, index) => {
                  const Icon = feature.icon
                  const on = index === selected
                  const tone = FEATURE_TONES[index]

                  return (
                    <button
                      key={feature.label}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      onClick={() => setSelected(index)}
                      style={
                        {
                          '--feature-accent': toneWash(tone),
                        } as CSSProperties
                      }
                      className={cn(
                        'flex shrink-0 items-center gap-3 rounded-pill border px-4 py-3 text-[15px] font-medium transition-all duration-300',
                        'lg:w-full lg:justify-start lg:rounded-[16px] lg:px-5 lg:py-4',
                        'lg:hover:-translate-y-0.5 lg:hover:border-(--feature-accent) lg:hover:bg-(--feature-accent)',
                        on
                          ? 'border-(--feature-accent) bg-(--feature-accent) text-fg'
                          : 'border-line bg-hover text-fg',
                      )}
                    >
                      <Icon className="size-[1.15rem]" aria-hidden="true" />
                      {feature.label}
                    </button>
                  )
                })}
              </div>

              <div
                role="tabpanel"
                key={current.label}
                className="rounded-[24px] p-6 sm:p-10 lg:col-span-8"
                style={{ background: toneWash(currentTone) }}
              >
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <span
                      className="grid size-11 place-items-center rounded-round"
                      style={{ background: toneChip }}
                    >
                      <CurrentIcon
                        className="size-[1.2rem]"
                        style={{ color: toneDeep(currentTone) }}
                        aria-hidden="true"
                      />
                    </span>
                    <h3 className="punch-display mt-8 text-[40px] leading-none text-fg sm:text-[52px]">
                      {current.label}
                    </h3>
                    <p className="mt-2 text-[15px] text-on-tone">{current.eyebrow}</p>
                  </div>
                  <div className="text-right">
                    <p className="punch-display text-[28px] leading-none text-fg sm:text-[36px]">
                      {current.metricValue}
                    </p>
                    <p className="mt-2 text-[14px] text-on-tone">{current.metric}</p>
                  </div>
                </div>

                <p className="punch-display mt-8 max-w-xl text-[17px] leading-[1.65] text-fg">
                  {current.summary}
                </p>

                {/* The perforation is punched out of the panel's own wash, not
                    the page canvas — otherwise the holes would read as discs
                    floating on the pastel. */}
                <div
                  className="punch-perf my-8"
                  data-surface="wash"
                  style={{ '--punch-bg': toneWash(currentTone) } as CSSProperties}
                />

                <ul className="grid list-none gap-x-8 gap-y-3 p-0 sm:grid-cols-2">
                  {current.benefits.map((benefit) => (
                    <li
                      key={benefit}
                      className="flex items-start gap-3 text-[15px] leading-[1.5] text-on-tone"
                    >
                      <Check
                        className="mt-[3px] size-4 shrink-0"
                        style={{ color: toneDeep(currentTone) }}
                        aria-hidden="true"
                      />
                      {benefit}
                    </li>
                  ))}
                </ul>

                <Button
                  variant="ghost"
                  className="mt-8"
                  onClick={() => setActiveFeature(current)}
                  aria-haspopup="dialog"
                >
                  See details
                </Button>
              </div>
            </div>
          </Container>
        </section>

        {/* HOW IT GROWS: a real sequence */}
        <section id="how" className="scroll-mt-24 pb-24 lg:pb-40">
          <Container>
            <h2 className="punch-display max-w-[18ch] text-[clamp(2.25rem,6vw,4.25rem)] leading-[1.03]">
              Start with one thing. Build from there.
            </h2>
            <div className="punch-stagger grid gap-12 pt-12 md:grid-cols-3 md:gap-10 lg:pt-20 lg:gap-16">
              {GROWTH_STEPS.map((step, index) => (
                <div key={step.title} className="punch-perf pt-8">
                  <span
                    className="grid size-9 place-items-center rounded-round text-[15px] font-medium text-fg tabular"
                    style={{ background: toneWash(step.tone) }}
                  >
                    {index + 1}
                  </span>
                  <h3 className="punch-display mt-6 text-[30px] leading-none">{step.title}</h3>
                  <p className="punch-body mt-4 max-w-[22rem] text-[15px] leading-[1.7]">
                    {step.text}
                  </p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* SOLUTIONS */}
        <section className="pb-24 lg:pb-40">
          <Container>
            <h2 className="punch-display max-w-[26ch] text-[clamp(1.9rem,4.6vw,3.5rem)] leading-[1.1]">
              A salon does not operate like a restaurant. A clinic does not operate like a
              barbershop.{' '}
              <span className="text-subtle">
                A franchise does not operate like a single location.
              </span>
            </h2>
            <p className="punch-body mt-6 max-w-md text-[16px] leading-[1.7]">
              Punched gives each business the building blocks it needs, without forcing every
              business into the same workflow.
            </p>
            <div className="punch-stagger mt-14 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:mt-20 lg:grid-cols-4">
              {BUSINESS_AREAS.map((area) => {
                const Icon = area.icon
                return (
                  <article
                    key={area.title}
                    className="punch-lift flex min-h-[260px] flex-col justify-between rounded-[20px] p-6 sm:min-h-[320px]"
                    style={{ background: toneWash(area.tone) }}
                  >
                    <span
                      className="grid size-10 place-items-center rounded-round"
                      style={{ background: toneChip }}
                    >
                      <Icon
                        className="size-[1.15rem]"
                        style={{ color: toneDeep(area.tone) }}
                        aria-hidden="true"
                      />
                    </span>
                    <div>
                      <h3 className="punch-display text-[28px] leading-[1.05] text-fg">
                        {area.title}
                      </h3>
                      <p className="mt-3 text-[14.5px] leading-[1.65] text-on-tone">{area.text}</p>
                    </div>
                  </article>
                )
              })}
            </div>
          </Container>
        </section>

        {/* ENTERPRISE: the one forest surface */}
        <section id="enterprise" className="scroll-mt-24 pb-24 lg:pb-40">
          <Container>
            <div className="rounded-[28px] bg-forest p-6 text-on-forest sm:p-10 lg:p-16">
              <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
                <div className="lg:col-span-6">
                  <h2 className="punch-display text-[clamp(2.5rem,7vw,4.75rem)] leading-none">
                    Your brand. Your system.
                  </h2>
                  <p className="mt-8 max-w-md text-[17px] leading-[1.65] text-on-forest/80">
                    Sometimes a business needs more than a SaaS subscription. We can take Punched
                    further, with your logo, your colours, your workflows and your business-specific
                    features.
                  </p>
                  <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                    <Link
                      to="/enterprise"
                      className="btn rounded-pill border-on-forest bg-on-forest text-forest no-underline hover:bg-on-forest/90"
                    >
                      Talk to our team
                    </Link>
                    <Link
                      to="/enterprise"
                      className="btn rounded-pill border-on-forest/40 bg-transparent text-on-forest no-underline hover:border-on-forest"
                    >
                      Explore enterprise
                    </Link>
                  </div>
                </div>

                <div className="lg:col-span-5 lg:col-start-8">
                  <p className="text-[15px] font-medium">Custom deployment</p>
                  <div
                    className="punch-perf mt-5"
                    data-surface="forest"
                    style={{ borderTopColor: 'var(--forest-line)' }}
                  />
                  <ul className="mt-4 list-none p-0">
                    {ENTERPRISE_ITEMS.map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-4 border-b py-3.5 text-[15px] text-on-forest/85"
                        style={{ borderColor: 'var(--forest-line)' }}
                      >
                        <Check className="size-4 shrink-0 text-forest-accent" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* SUPPORT */}
        <section id="support" className="scroll-mt-24 pb-24 lg:pb-40">
          <Container>
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
              <div className="lg:col-span-5">
                <h2 className="punch-display text-[clamp(2.25rem,6vw,4rem)] leading-[1.03]">
                  Technology backed by people.
                </h2>
                <p className="punch-body mt-6 max-w-md text-[16px] leading-[1.7]">
                  From your first digital loyalty programme to a complete branded platform, there is
                  a team behind the technology.
                </p>
              </div>
              <ul className="punch-stagger grid list-none grid-cols-2 gap-3 p-0 lg:col-span-6 lg:col-start-7">
                {SUPPORT_ITEMS.map((item, index) => (
                  <li
                    key={item}
                    className="punch-lift flex min-h-[96px] items-end rounded-[14px] p-5 text-[15px] leading-[1.35] text-on-tone"
                    style={{ background: toneWash(SUPPORT_TONES[index]) }}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Container>
        </section>

        {/* FINAL CTA */}
        <section className="pb-24 lg:pb-36">
          <Container>
            <div className="punch-perf pt-14 text-center lg:pt-20">
              <h2 className="punch-display mx-auto max-w-[14ch] text-[clamp(2.75rem,9vw,6.5rem)] leading-[0.96]">
                Give your first stamp today.
              </h2>
              <p className="punch-body mx-auto mt-8 max-w-md text-[17px] leading-[1.65]">
                Loyalty, bookings, staff, customers, or a complete white-labelled system. Choose
                what your business needs now.
              </p>
              <div className="mt-10 flex justify-center">
                <Link to={REGISTER_TO} className={CTA}>
                  Get started with Punched
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </Container>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-line">
        <Container className="py-12 lg:py-16">
          <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
            <div>
              <PunchedWordmark />
              <p className="mt-5 max-w-xs text-[15px] leading-[1.65] text-subtle">
                Digital business infrastructure for loyalty, appointments, people and customer
                relationships.
              </p>
            </div>
            <nav
              className="grid grid-cols-2 gap-x-12 gap-y-4 sm:grid-cols-3 lg:gap-x-16"
              aria-label="Footer"
            >
              {[
                { label: 'Platform', anchor: '#platform' },
                { label: 'How it grows', anchor: '#how' },
                { label: 'Enterprise', to: '/enterprise' as const },
                { label: 'For business', to: REGISTER_TO },
                { label: 'Sign in', to: '/login' as const },
                { label: 'Customer sign up', to: '/auth/sign-up' as const },
              ].map((item) =>
                'anchor' in item ? (
                  <a
                    key={item.label}
                    href={item.anchor}
                    className="text-[15px] text-subtle no-underline transition-colors hover:text-fg"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="text-[15px] text-subtle no-underline transition-colors hover:text-fg"
                  >
                    {item.label}
                  </Link>
                ),
              )}
            </nav>
          </div>
          <p className="mt-12 border-t border-line pt-6 text-[14px] text-subtle">
            © {COPYRIGHT_YEAR} Punched. All rights reserved.
          </p>
        </Container>
      </footer>

      <FeatureSheet
        feature={activeFeature}
        tone={activeFeature ? FEATURE_TONES[LANDING_FEATURES.indexOf(activeFeature)] : 'purple'}
        onClose={() => setActiveFeature(null)}
        ctaTo={REGISTER_TO}
        ctaLabel="Start with this"
      />
    </PublicCanvas>
  )
}
