import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { toneChip, toneWash } from '../../lib/marketing/tones'

const TOTAL_STAMPS = 8

/**
 * The hero ticket: a real punch card.
 *
 * Five stamps punch in once on load (staggered, so the card reads as being
 * filled), and tapping the cells adds your own. The punch hole is painted in
 * the panel's own wash, so each perforation is punched *out of* the ticket
 * rather than drawn on top of it.
 */
export function HeroTicket() {
  const [stamps, setStamps] = useState(0)

  useEffect(() => {
    const timers: number[] = []
    for (let i = 1; i <= 5; i += 1) {
      timers.push(window.setTimeout(() => setStamps((current) => Math.max(current, i)), 650 + i * 170))
    }
    return () => {
      for (const timer of timers) window.clearTimeout(timer)
    }
  }, [])

  const remaining = TOTAL_STAMPS - stamps

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      <div
        className="col-span-2 rounded-[24px] px-6 pt-6 pb-6 sm:px-8 sm:pt-8"
        style={
          {
            background: toneWash('pink'),
            '--punch-bg': toneWash('pink'),
          } as CSSProperties
        }
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[14px] text-on-tone">Loyalty card</p>
            <p className="punch-display mt-2 text-[30px] leading-none text-fg sm:text-[38px]">
              Free treatment
            </p>
          </div>
          <span
            className="shrink-0 rounded-pill px-3 py-1 text-[13px] font-medium text-fg tabular"
            style={{ background: toneChip }}
          >
            {stamps} of {TOTAL_STAMPS}
          </span>
        </div>

        <div className="punch-perf -mx-6 my-6 sm:-mx-8 sm:my-8" data-surface="wash" />

        <button
          type="button"
          onClick={() => setStamps((current) => (current >= TOTAL_STAMPS ? 0 : current + 1))}
          aria-label="Add a stamp to the demo card"
          className="grid w-full max-w-[20rem] grid-cols-4 gap-2.5 text-left sm:gap-3"
        >
          {Array.from({ length: TOTAL_STAMPS }).map((_, index) => (
            <span
              key={index}
              className="relative aspect-square rounded-round"
              style={{ background: toneChip }}
            >
              <span
                className="absolute inset-[24%] rounded-round bg-fg transition-transform duration-500"
                style={{ transform: `scale(${index < stamps ? 1 : 0})` }}
              />
            </span>
          ))}
        </button>

        <p className="mt-6 text-[14px] leading-[1.5] text-on-tone">
          {remaining > 0
            ? `${remaining} more ${remaining === 1 ? 'stamp' : 'stamps'} to your reward. Tap the stamps to try it.`
            : 'Reward unlocked. Tap to start again.'}
        </p>
      </div>

      <div className="rounded-[18px] p-5 sm:p-6" style={{ background: toneWash('blue') }}>
        <p className="text-[14px] text-on-tone">Next booking</p>
        <p className="punch-display mt-5 text-[44px] leading-none text-fg tabular sm:text-[52px]">
          11:30
        </p>
        <p className="mt-3 text-[14px] leading-[1.45] text-on-tone">Consultation with Amina</p>
      </div>

      <div className="rounded-[18px] p-5 sm:p-6" style={{ background: toneWash('purple') }}>
        <p className="text-[14px] text-on-tone">Customers</p>
        <p className="punch-display mt-5 text-[44px] leading-none text-fg tabular sm:text-[52px]">
          186
        </p>
        <p className="mt-3 text-[14px] leading-[1.45] text-on-tone">12 new this week</p>
      </div>
    </div>
  )
}
