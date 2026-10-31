import type { LinkProps } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { Check, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useId } from 'react'
import type { PublicTone } from '../../lib/marketing/tones'
import { toneChip, toneDeep, toneWash } from '../../lib/marketing/tones'
import { Button } from '../ui/button'
import { Portal } from '../ui/portal'
import { useOverlay } from '../ui/use-overlay'

export type FeatureInfo = {
  label: string
  eyebrow: string
  icon: LucideIcon
  summary: string
  benefits: string[]
  metric: string
  metricValue: string
}

export type FeatureSheetProps = {
  /** `null` closes the sheet. */
  feature: FeatureInfo | null
  tone?: PublicTone
  onClose: () => void
  ctaTo: LinkProps['to']
  ctaLabel?: string
}

/** Every Punched capability is delivered through the same platform services. */
const CAPABILITIES = [
  'Mobile experience',
  'Business dashboard',
  'Role-based access',
  'QR integration',
]

/**
 * Feature detail sheet: the bottom sheet on phones and a centred dialog from
 * `sm` up — the same overlay recipe every other dialog in the app uses, so
 * Escape, focus trapping, scroll lock and focus restore come from one place.
 */
export function FeatureSheet({
  feature,
  tone = 'purple',
  onClose,
  ctaTo,
  ctaLabel = 'Start with this',
}: FeatureSheetProps) {
  const titleId = useId()
  const panelRef = useOverlay<HTMLDivElement>(feature !== null, onClose)

  if (!feature) return null

  const Icon = feature.icon

  return (
    <Portal>
      <button type="button" className="scrim" aria-label="Close" tabIndex={-1} onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="dialog dialog-wide max-h-[92dvh] p-0 focus:outline-none"
      >
        <header className="sheet-head gap-4">
          <div className="flex min-w-0 items-center gap-[0.75rem]">
            <span
              className="grid size-11 shrink-0 place-items-center rounded-round"
              style={{ background: toneChip }}
            >
              <Icon
                className="size-[1.15rem]"
                style={{ color: toneDeep(tone) }}
                aria-hidden="true"
              />
            </span>
            <div className="min-w-0">
              <h2 id={titleId} className="punch-display text-[1.5rem] leading-none text-fg">
                {feature.label}
              </h2>
              <p className="punch-eyebrow mt-[0.35rem]">{feature.eyebrow}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={`Close ${feature.label} details`}
            className="shrink-0"
          >
            <X className="size-[1.1rem]" aria-hidden="true" />
          </Button>
        </header>

        <div className="sheet-body grid gap-0 p-0 md:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="p-[1.4rem]">
            <p className="punch-display max-w-[38ch] text-[1.5rem] leading-[1.25] text-fg">
              {feature.summary}
            </p>

            <p className="mt-[2rem] text-[0.8rem] font-semibold text-subtle">
              What&rsquo;s included
            </p>
            <ul className="mt-[0.6rem] list-none divide-y divide-line border-y border-line p-0">
              {feature.benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-[0.9rem] py-[0.9rem]">
                  <span
                    className="mt-[0.05rem] grid size-6 shrink-0 place-items-center rounded-round"
                    style={{ background: toneWash(tone) }}
                  >
                    <Check
                      className="size-[0.75rem]"
                      style={{ color: toneDeep(tone) }}
                      aria-hidden="true"
                    />
                  </span>
                  <span className="text-meta leading-relaxed text-muted">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          <aside className="bg-sunken p-[1.4rem]">
            <div className="rounded-card p-[1.1rem]" style={{ background: toneWash(tone) }}>
              <p className="text-[0.8rem] text-on-tone">{feature.metric}</p>
              <p className="punch-display mt-[1.4rem] text-[2.6rem] leading-none text-fg">
                {feature.metricValue}
              </p>
            </div>

            <p className="mt-[1.6rem] text-[0.8rem] font-semibold text-subtle">
              Part of the Punched platform
            </p>
            <ul className="mt-[0.9rem] list-none space-y-[0.8rem] p-0">
              {CAPABILITIES.map((capability) => (
                <li key={capability} className="flex items-center gap-[0.7rem]">
                  <span
                    className="size-[0.6rem] shrink-0 rounded-round"
                    style={{ background: toneDeep(tone) }}
                    aria-hidden="true"
                  />
                  <span className="text-meta text-muted">{capability}</span>
                </li>
              ))}
            </ul>

            <p className="mt-[1.6rem] text-[0.8rem] leading-relaxed text-subtle">
              Use this capability on its own, or connect it to the rest of your Punched business
              system.
            </p>
          </aside>
        </div>

        <footer className="sheet-foot bg-surface">
          <p className="hidden text-meta text-subtle sm:block">
            Start with what your business needs.
          </p>
          <Link to={ctaTo} onClick={onClose} className="btn btn-primary no-underline max-sm:w-full">
            {ctaLabel}
          </Link>
        </footer>
      </div>
    </Portal>
  )
}
