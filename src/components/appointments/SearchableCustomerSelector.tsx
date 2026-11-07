import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CustomerOption } from '../../lib/api/types'
import { errorMessage } from '../../lib/api/client'
import { useCustomerSearch } from '../../lib/appointments'
import { clientsApi } from '../../lib/clients/api'
import { Button } from '../ui/button'
import { Field, Input } from '../ui/field'
import { SearchableEntitySelector } from './SearchableEntitySelector'

/** `phone · email` — whichever the customer has on file. */
function contactLine(customer: CustomerOption): string | null {
  const parts = [customer.phoneNumber, customer.email].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
}

export type SearchableCustomerSelectorProps = {
  value: CustomerOption | null
  onChange: (customer: CustomerOption | null) => void
  /** Offer the "create a new customer" flow inline. Defaults to true. */
  enableCreate?: boolean
  disabled?: boolean
  label?: string
}

/**
 * Searchable customer selection for the booking flow.
 *
 * <para>Replaces the long scrolling dropdown: the term is searched server-side (debounced)
 * across the business's roster by name, phone and email, so the browser never holds the
 * whole customer list. A customer who does not exist yet can be created without leaving
 * the modal — the created row is returned and selected immediately, so booking continues.</para>
 */
export function SearchableCustomerSelector({
  value,
  onChange,
  enableCreate = true,
  disabled = false,
  label = 'Customer',
}: SearchableCustomerSelectorProps) {
  const [term, setTerm] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ fullName: '', phoneNumber: '', email: '' })
  const queryClient = useQueryClient()

  const search = useCustomerSearch(term, !disabled)

  const create = useMutation({
    mutationFn: () =>
      clientsApi.quickAdd({
        fullName: form.fullName.trim(),
        phoneNumber: form.phoneNumber.trim() || null,
        email: form.email.trim() || null,
      }),
    onSuccess: (customer) => {
      // Enrolling a customer changes the roster, so refresh the search cache, then
      // hand the new customer straight back so the wizard can continue to Step 2.
      void queryClient.invalidateQueries({ queryKey: ['customers'] })
      onChange(customer)
      setCreating(false)
      setForm({ fullName: '', phoneNumber: '', email: '' })
      setTerm('')
    },
  })

  const options = (search.data ?? []).map((customer) => ({
    id: customer.userId,
    label: customer.fullName,
    description: contactLine(customer),
    avatarUrl: customer.avatarUrl,
  }))

  return (
    <div className="min-w-0 space-y-[0.6rem]">
      <SearchableEntitySelector
        label={label}
        placeholder="Search by name, phone or email…"
        value={value?.userId ?? null}
        onValueChange={(id) => {
          if (id == null) {
            onChange(null)
            return
          }
          const chosen = (search.data ?? []).find((customer) => customer.userId === id) ?? null
          onChange(chosen)
        }}
        selectedLabel={value ? `${value.fullName}${value.phoneNumber ? ` · ${value.phoneNumber}` : ''}` : null}
        options={options}
        term={term}
        onTermChange={setTerm}
        isLoading={search.isLoading}
        isFetched={search.isFetched}
        isError={search.isError}
        errorMessage="Customers could not be loaded. Check your connection and try again."
        emptyMessage={`No enrolled customer matches “${term.trim()}”. Create one below.`}
        disabled={disabled}
        menuFooter={
          enableCreate && !creating ? (
            <Button type="button" onClick={() => setCreating(true)} disabled={disabled}>
              <Plus className="size-4" aria-hidden="true" />
              New customer
            </Button>
          ) : null
        }
      />

      {enableCreate && creating ? (
        <div className="space-y-[0.6rem] rounded-lg border border-line bg-hover p-[0.8rem]">
          <p className="text-meta font-semibold">Add a new customer</p>
          <Field label="Full name" htmlFor="new-customer-name">
            <Input
              id="new-customer-name"
              value={form.fullName}
              maxLength={100}
              onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
              placeholder="e.g. Wanjiru Kariuki"
            />
          </Field>
          <div className="grid grid-cols-2 gap-[0.6rem] max-sm:grid-cols-1">
            <Field label="Phone" htmlFor="new-customer-phone" optional>
              <Input
                id="new-customer-phone"
                value={form.phoneNumber}
                inputMode="tel"
                onChange={(event) => setForm((prev) => ({ ...prev, phoneNumber: event.target.value }))}
                placeholder="0712 345 678"
              />
            </Field>
            <Field label="Email" htmlFor="new-customer-email" optional>
              <Input
                id="new-customer-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="name@example.com"
              />
            </Field>
          </div>
          <p className="text-meta text-muted">
            Provide a phone number or an email so the customer can be identified. No login is created.
          </p>
          {create.isError ? (
            <p className="text-meta font-semibold text-danger-ink" role="alert">
              {errorMessage(create.error)}
            </p>
          ) : null}
          <div className="flex items-center gap-[0.5rem]">
            <Button
              type="button"
              variant="primary"
              onClick={() => create.mutate()}
              disabled={create.isPending || form.fullName.trim().length === 0}
            >
              {create.isPending ? 'Adding…' : 'Add and select'}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setCreating(false)
                create.reset()
              }}
              disabled={create.isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
