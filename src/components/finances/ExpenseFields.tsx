import type { ExpenseCategory, FinancialPaymentMethod } from '../../lib/finances/api'
import { PAYMENT_METHOD_OPTIONS } from '../../lib/finances/labels'

export type ExpenseFieldsProps = {
  /** A reconciled expense is read-only: the figures have been checked against a statement. */
  locked: boolean
  amount: string
  onAmountChange: (value: string) => void
  category: string
  onCategoryChange: (value: string) => void
  categories: readonly ExpenseCategory[]
  paymentMethod: FinancialPaymentMethod
  onPaymentMethodChange: (value: FinancialPaymentMethod) => void
  description: string
  onDescriptionChange: (value: string) => void
  reference: string
  onReferenceChange: (value: string) => void
  transactionDate: string
  onTransactionDateChange: (value: string) => void
}

/** The expense form's fields, in the order an owner thinks about them: what, what kind, how, why, when. */
export function ExpenseFields({
  locked,
  amount,
  onAmountChange,
  category,
  onCategoryChange,
  categories,
  paymentMethod,
  onPaymentMethodChange,
  description,
  onDescriptionChange,
  reference,
  onReferenceChange,
  transactionDate,
  onTransactionDateChange,
}: ExpenseFieldsProps) {
  return (
    <div className="mt-4 grid gap-[0.8rem]">
      <label className="label" htmlFor="expense-amount">
        Amount (KES)
      </label>
      <input
        id="expense-amount"
        className="input"
        inputMode="decimal"
        autoFocus
        disabled={locked}
        value={amount}
        placeholder="1500"
        onChange={(event) => onAmountChange(event.target.value.replace(/[^0-9.]/g, ''))}
      />

      <label className="label" htmlFor="expense-category">
        Category
      </label>
      <select
        id="expense-category"
        className="select"
        disabled={locked}
        value={category}
        onChange={(event) => onCategoryChange(event.target.value)}
      >
        {categories.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>

      <label className="label" htmlFor="expense-method">
        Paid by
      </label>
      <select
        id="expense-method"
        className="select"
        disabled={locked}
        value={paymentMethod}
        onChange={(event) => onPaymentMethodChange(event.target.value as FinancialPaymentMethod)}
      >
        {PAYMENT_METHOD_OPTIONS.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>

      <label className="label" htmlFor="expense-description">
        What was it for?
      </label>
      <input
        id="expense-description"
        className="input"
        disabled={locked}
        value={description}
        placeholder="e.g. November shop rent"
        onChange={(event) => onDescriptionChange(event.target.value)}
      />

      <label className="label" htmlFor="expense-reference">
        Reference (optional)
      </label>
      <input
        id="expense-reference"
        className="input"
        disabled={locked}
        value={reference}
        placeholder="Bank reference or receipt number"
        onChange={(event) => onReferenceChange(event.target.value)}
      />

      <label className="label" htmlFor="expense-date">
        Date
      </label>
      <input
        id="expense-date"
        type="date"
        className="input"
        disabled={locked}
        value={transactionDate}
        onChange={(event) => onTransactionDateChange(event.target.value)}
      />
    </div>
  )
}
