import { Check, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { serviceTotals } from '../../../lib/booking'
import { cn } from '../../../lib/cn'
import { formatDuration, money } from '../../../lib/format'
import { Input } from '../../ui/field'
import { StepHeading } from './shared'
import type { BookingWizardApi } from '../use-booking-wizard'

/**
 * Step 2 — the services.
 *
 * The catalogue is the business's own active services, handed to the flow by the
 * screen that opened it. Multi-select, with the price and duration per service
 * and a running total. Durations are summed one after another (the server's own
 * figure when the booking is written); there is no parallel-scheduling rule to
 * apply because the availability endpoint is asked for the summed duration.
 * The catalogue bucket carries no category field, so no category filter is
 * offered rather than inventing one.
 */
export function ServicesStep({ wizard }: { wizard: BookingWizardApi }) {
  const [term, setTerm] = useState('')
  const [category, setCategory] = useState('All')
  const totals = serviceTotals(wizard.draft.services)

  /** Only offered when the catalogue the caller holds really carries categories. */
  const categories = useMemo(() => {
    const names = new Set<string>()
    for (const service of wizard.catalogue) {
      if (service.categoryName) names.add(service.categoryName)
    }
    return [...names].sort()
  }, [wizard.catalogue])

  const matches = useMemo(() => {
    const needle = term.trim().toLowerCase()
    return wizard.catalogue.filter((service) => {
      if (category !== 'All' && service.categoryName !== category) return false
      return needle === '' || service.name.toLowerCase().includes(needle)
    })
  }, [category, term, wizard.catalogue])

  return (
    <div>
      <StepHeading
        title="Select services"
        hint="Add one or more. Searching never clears your selection."
      />
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-[0.7rem] size-[1rem] -translate-y-1/2 text-subtle"
          aria-hidden="true"
        />
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search services"
          aria-label="Search services"
          className="pl-[2.1rem]"
        />
      </div>

      {categories.length > 0 ? (
        <div className="mt-[0.7rem] flex flex-wrap gap-[0.4rem]" role="group" aria-label="Categories">
          {['All', ...categories].map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={category === name}
              className={cn(
                'chip',
                category === name && 'border-transparent bg-inverse text-on-inverse',
              )}
              onClick={() => setCategory(name)}
            >
              {name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="bkw-list">
        {matches.length === 0 ? (
          <p className="bkw-list-foot" style={{ borderTop: 0 }}>
            {wizard.catalogue.length === 0
              ? 'This business has no active services yet. Add one in Services first.'
              : 'No services match your search.'}
          </p>
        ) : (
          matches.map((service) => {
            const chosen = wizard.draft.services.some((line) => line.id === service.id)
            return (
              <button
                key={service.id}
                type="button"
                aria-pressed={chosen}
                className={cn('bkw-row', chosen && 'is-on')}
                onClick={() => wizard.toggleService(service)}
              >
                <span className="bkw-check" aria-hidden="true">
                  <Check className="size-[0.8rem]" />
                </span>
                <span className="bkw-row-text">
                  <b>{service.name}</b>
                  <small>{formatDuration(service.durationMinutes)}</small>
                </span>
                <span className="flex-none text-right tabular">
                  <b className="block font-semibold">{money(service.price)}</b>
                  <small className="block text-meta text-muted">
                    {formatDuration(service.durationMinutes)}
                  </small>
                </span>
              </button>
            )
          })
        )}
      </div>

      {wizard.draft.services.length > 0 ? (
        <dl className="mt-[1rem] rounded-lg border border-line bg-sunken p-[0.9rem] text-meta">
          <div className="flex justify-between gap-[1rem] py-[0.2rem]">
            <dt className="text-muted">{wizard.draft.services.length} selected</dt>
            <dd className="tabular font-semibold">{money(totals.price)}</dd>
          </div>
          <div className="flex justify-between gap-[1rem] py-[0.2rem]">
            <dt className="text-muted">Total time (one service after another)</dt>
            <dd className="tabular font-semibold">{formatDuration(totals.durationMinutes)}</dd>
          </div>
        </dl>
      ) : null}
    </div>
  )
}
