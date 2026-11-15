import { CalendarDays, Check, Clock, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { errorMessage } from '../../../lib/api/client'
import { useCustomerSearch } from '../../../lib/appointments'
import { clientsApi } from '../../../lib/clients/api'
import { cn } from '../../../lib/cn'
import { formatKenyanPhone } from '../../../lib/validation/contact'
import { getInitials } from '../../../lib/format'
import { Button } from '../../ui/button'
import { Field, FieldError, Input } from '../../ui/field'
import { Skeleton } from '../../ui/skeleton'
import { StepHeading } from './shared'
import type { BookingWizardApi } from '../use-booking-wizard'

/**
 * Step 1 — who the booking is for.
 *
 * The booking type comes first, because it decides whether the flow needs a date
 * and time at all. The customer is then found in the business's own roster,
 * searched on the server (debounced, paged) rather than shipped to the browser,
 * and a customer who does not exist yet can be created without leaving the
 * dialog. Customers are identified by `userId`: two customers really can share a
 * name.
 */

/** `+254712345678` → `0712 345 678` when it looks Kenyan, else the raw value. */
function contactPhone(value: string | null): string | null {
  if (!value) return null
  return formatKenyanPhone(value) || value
}

export function CustomerStep({ wizard }: { wizard: BookingWizardApi }) {
  const { draft } = wizard
  const [term, setTerm] = useState('')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ fullName: '', phoneNumber: '', email: '' })
  const queryClient = useQueryClient()

  // The roster is searched on the server: a business can hold thousands of
  // customers, so the browser is never shipped the whole list.
  const search = useCustomerSearch(term, !adding)

  const create = useMutation({
    mutationFn: () =>
      clientsApi.quickAdd({
        fullName: form.fullName.trim(),
        phoneNumber: form.phoneNumber.trim() || null,
        email: form.email.trim() || null,
      }),
    onSuccess: (customer) => {
      void queryClient.invalidateQueries({ queryKey: ['customers'] })
      wizard.setCustomer(customer)
      setAdding(false)
      setForm({ fullName: '', phoneNumber: '', email: '' })
      setTerm('')
    },
  })

  return (
    <div>
      <StepHeading
        title="Who is this booking for?"
        hint="Choose the booking type, then find or add the customer."
      />

      <div className="bkw-choice-grid two" role="radiogroup" aria-label="Booking type">
        <button
          type="button"
          role="radio"
          aria-checked={draft.type === 'walk_in'}
          className={cn('bkw-choice', draft.type === 'walk_in' && 'is-on')}
          onClick={() => wizard.setType('walk_in')}
        >
          <span className="bkw-choice-icon" aria-hidden="true">
            <Clock className="size-[1.1rem]" />
          </span>
          <span>
            <b className="block font-semibold">Walk-in</b>
            <small className="block text-meta text-muted">Customer is here now</small>
          </span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={draft.type === 'appointment'}
          className={cn('bkw-choice', draft.type === 'appointment' && 'is-on')}
          onClick={() => wizard.setType('appointment')}
        >
          <span className="bkw-choice-icon" aria-hidden="true">
            <CalendarDays className="size-[1.1rem]" />
          </span>
          <span>
            <b className="block font-semibold">Appointment</b>
            <small className="block text-meta text-muted">Customer arrives later</small>
          </span>
        </button>
      </div>

      {draft.type === null ? null : draft.customer ? (
        <div className="bkw-list mt-[1rem]">
          <div className="bkw-row is-on">
            <span className="avatar size-[2.4rem] text-[0.8rem]" aria-hidden="true">
              {getInitials(draft.customer.fullName)}
            </span>
            <span className="bkw-row-text">
              <b>{draft.customer.fullName}</b>
              <small>
                {contactPhone(draft.customer.phoneNumber) ??
                  draft.customer.email ??
                  'No contact on file'}
              </small>
            </span>
            <Button size="sm" onClick={() => wizard.setCustomer(null)}>
              Change
            </Button>
          </div>
        </div>
      ) : adding ? (
        <div className="bkw-note mt-[1rem]">
          <p className="mb-[0.7rem] font-semibold">Add a new customer</p>
          <div className="bkw-choice-grid">
            <Field label="Full name" htmlFor="bkw-new-name">
              <Input
                id="bkw-new-name"
                value={form.fullName}
                maxLength={100}
                autoComplete="off"
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, fullName: event.target.value }))
                }
                placeholder="e.g. Zawadi Achieng"
              />
            </Field>
            <div className="bkw-choice-grid two">
              <Field label="Phone number" htmlFor="bkw-new-phone">
                <Input
                  id="bkw-new-phone"
                  type="tel"
                  inputMode="tel"
                  value={form.phoneNumber}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, phoneNumber: event.target.value }))
                  }
                  placeholder="0712 345 678"
                />
              </Field>
              <Field label="Email" htmlFor="bkw-new-email" optional>
                <Input
                  id="bkw-new-email"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, email: event.target.value }))
                  }
                  placeholder="name@example.com"
                />
              </Field>
            </div>
          </div>
          {create.isError ? <FieldError>{errorMessage(create.error)}</FieldError> : null}
          <div className="mt-[0.8rem] flex flex-wrap gap-[0.5rem]">
            <Button
              variant="primary"
              disabled={create.isPending || form.fullName.trim().length === 0}
              onClick={() => create.mutate()}
            >
              {create.isPending ? 'Saving…' : 'Save and select'}
            </Button>
            <Button
              variant="ghost"
              disabled={create.isPending}
              onClick={() => {
                setAdding(false)
                create.reset()
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-[1rem] flex flex-wrap items-center gap-[0.6rem]">
            <div className="relative min-w-0 flex-1 basis-[14rem]">
              <Search
                className="pointer-events-none absolute top-1/2 left-[0.7rem] size-[1rem] -translate-y-1/2 text-subtle"
                aria-hidden="true"
              />
              <Input
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Search by name, phone or email"
                aria-label="Search customers"
                className="pl-[2.1rem]"
              />
            </div>
            <Button onClick={() => setAdding(true)}>
              <Plus className="size-4" aria-hidden="true" />
              Add customer
            </Button>
          </div>

          <div className="bkw-list" aria-busy={search.isLoading}>
            {search.isLoading ? (
              <>
                <div className="p-[0.6rem]">
                  <Skeleton className="h-[2.4rem]" />
                </div>
                <div className="p-[0.6rem]">
                  <Skeleton className="h-[2.4rem]" />
                </div>
              </>
            ) : search.isError ? (
              <p className="bkw-list-foot" role="alert">
                Customers could not be loaded. {errorMessage(search.error)}
              </p>
            ) : (search.data ?? []).length === 0 ? (
              <p className="bkw-list-foot" style={{ borderTop: 0 }}>
                No customer matches “{term.trim()}”. Try another search, or add them as a new
                customer.
              </p>
            ) : (
              (search.data ?? []).map((customer) => {
                const phone = contactPhone(customer.phoneNumber)
                return (
                  <button
                    key={customer.userId}
                    type="button"
                    className="bkw-row"
                    onClick={() => wizard.setCustomer(customer)}
                  >
                    <span className="avatar size-[2.4rem] text-[0.8rem]" aria-hidden="true">
                      {getInitials(customer.fullName)}
                    </span>
                    <span className="bkw-row-text">
                      <b>{customer.fullName}</b>
                      <small>
                        {phone ?? customer.email ?? 'No contact on file'}
                        {phone && customer.email ? (
                          <span className="max-[40rem]:hidden"> · {customer.email}</span>
                        ) : null}
                      </small>
                    </span>
                    <span className="rounded-pill bg-sunken px-[0.5rem] py-[0.1rem] text-caption text-muted">
                      {customer.enrollmentStatus}
                    </span>
                    <span className="bkw-check" aria-hidden="true">
                      <Check className="size-[0.8rem]" />
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}

