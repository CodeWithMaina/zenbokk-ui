import { SearchField } from '../ui/search-field'
import type { FinancialPaymentMethod } from '../../lib/finances/api'
import { PAYMENT_METHOD_OPTIONS, RECORDABLE_SOURCES } from '../../lib/finances/labels'

type ClientOption = { id: string; name: string }

/** The money fields: amount, source, method and the reference that makes an M-Pesa claim checkable. */
export function IncomeFields({
  amount,
  onAmountChange,
  source,
  onSourceChange,
  paymentMethod,
  onPaymentMethodChange,
  reference,
  onReferenceChange,
  needsReference,
}: {
  amount: string
  onAmountChange: (value: string) => void
  source: string
  onSourceChange: (value: string) => void
  paymentMethod: FinancialPaymentMethod
  onPaymentMethodChange: (value: FinancialPaymentMethod) => void
  reference: string
  onReferenceChange: (value: string) => void
  needsReference: boolean
}) {
  return (
    <div className="mt-4 grid gap-[0.8rem]">
      <label className="label" htmlFor="add-income-amount">
        Amount (KES)
      </label>
      <input
        id="add-income-amount"
        className="input"
        inputMode="decimal"
        autoFocus
        value={amount}
        placeholder="1000"
        onChange={(event) => onAmountChange(event.target.value.replace(/[^0-9.]/g, ''))}
      />

      <label className="label" htmlFor="add-income-source">
        Income source
      </label>
      <select
        id="add-income-source"
        className="select"
        value={source}
        onChange={(event) => onSourceChange(event.target.value)}
      >
        {RECORDABLE_SOURCES.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label} — {option.hint}
          </option>
        ))}
      </select>

      <label className="label" htmlFor="add-income-method">
        Payment method
      </label>
      <select
        id="add-income-method"
        className="select"
        value={paymentMethod}
        onChange={(event) => onPaymentMethodChange(event.target.value as FinancialPaymentMethod)}
      >
        {PAYMENT_METHOD_OPTIONS.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>

      <label className="label" htmlFor="add-income-reference">
        Transaction reference {needsReference ? '(required for M-Pesa)' : '(optional)'}
      </label>
      <input
        id="add-income-reference"
        className="input"
        value={reference}
        placeholder={needsReference ? 'e.g. QJK42NUM01' : 'Bank reference or receipt number'}
        onChange={(event) => onReferenceChange(event.target.value)}
      />
    </div>
  )
}

/**
 * Optional customer lookup. Money without a name is still money, so the picker never blocks a record,
 * and a search that finds nothing says so rather than pretending the customer exists.
 */
export function CustomerPicker({
  query,
  selectedId,
  results,
  searching,
  onQueryChange,
  onSelect,
}: {
  query: string
  selectedId: string | null
  results: ClientOption[]
  searching: boolean
  onQueryChange: (value: string) => void
  onSelect: (client: ClientOption) => void
}) {
  const showNoMatches = !selectedId && query.trim().length >= 2 && !searching && results.length === 0

  return (
    <div className="mt-[0.8rem]">
      <label className="label" htmlFor="add-income-customer">
        Customer (optional)
      </label>
      <SearchField
        id="add-income-customer"
        label="Search customers"
        value={query}
        placeholder="Search by name or phone"
        onChange={(event) => onQueryChange(event.target.value)}
      />

      {selectedId ? (
        <p className="mt-[0.4rem] text-meta text-muted">
          Recording against <b className="font-medium text-fg">{query}</b>{' '}
          <button type="button" className="link" onClick={() => onQueryChange('')}>
            clear
          </button>
        </p>
      ) : null}

      {!selectedId && results.length > 0 ? (
        <ul className="mt-[0.4rem] max-h-[10rem] overflow-y-auto rounded-md border border-line">
          {results.map((client) => (
            <li key={client.id}>
              <button
                type="button"
                className="w-full px-[0.7rem] py-[0.5rem] text-left text-meta transition-colors hover:bg-hover"
                onClick={() => onSelect(client)}
              >
                {client.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {showNoMatches ? (
        <p className="mt-[0.4rem] text-meta text-muted">
          No matching customer. Leave it blank to record the money without a name.
        </p>
      ) : null}
    </div>
  )
}
