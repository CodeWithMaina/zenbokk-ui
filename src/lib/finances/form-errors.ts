/**
 * Reading the server's field-level validation messages.
 *
 * The API returns an `ApiResponse` error with a `fields` map when a request fails validation. The
 * shape on this side is `unknown` (an error envelope is not something to trust blindly), so this
 * helper narrows it once: only string values are kept, and keys are mapped to the names the forms
 * use. A message that cannot be attributed to a field is dropped — the caller still shows the
 * general error, so nothing is ever swallowed.
 */
const FIELD_ALIASES: Record<string, string> = {
  amount: 'amount',
  description: 'description',
  category: 'category',
  paymentmethod: 'paymentMethod',
  payment_method: 'paymentMethod',
  transactionreference: 'transactionReference',
  transaction_reference: 'transactionReference',
  transactiondate: 'transactionDate',
  transaction_date: 'transactionDate',
  customerName: 'customerName',
  customername: 'customerName',
  payee: 'payee',
  reason: 'reason',
}

export function fieldErrorsFrom(error: unknown): Record<string, string> {
  const details = (error as { details?: unknown } | null)?.details
  if (!details || typeof details !== 'object') return {}

  const result: Record<string, string> = {}
  for (const [rawKey, rawValue] of Object.entries(details as Record<string, unknown>)) {
    if (typeof rawValue !== 'string' || !rawValue.trim()) continue
    const key = FIELD_ALIASES[rawKey] ?? FIELD_ALIASES[rawKey.toLowerCase()]
    if (key) result[key] = rawValue
  }
  return result
}
