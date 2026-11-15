import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '../ui/confirm-dialog'
import { errorMessage } from '../../lib/api/client'
import { useRecordRefund } from '../../lib/finances/api'
import type { FinancialPaymentMethod } from '../../lib/finances/api'
import { money, toDateInputValue } from '../../lib/format'
import { RefundFields } from './RefundFields'

export type RefundDialogProps = {
  /** The income being refunded, or null when closed. */
  target: {
    id: string
    reference: string
    amount: number
    refundableAmount: number
    customerName: string | null
  } | null
  onClose: () => void
}

/**
 * Refund an income row, fully or partly.
 *
 * The two decisions that keep refunds honest:
 *
 *  - **The cap is what is LEFT**, not the original amount. The server enforces it too, but showing it
 *    here means the field is never pre-filled with a figure that will be refused.
 *  - **"Money has gone back" is a separate tick.** A refund that has merely been decided is recorded
 *    as pending and does not reduce the period's net movement, because the money has not left yet.
 */
export function RefundDialog({ target, onClose }: RefundDialogProps) {
  const recordRefund = useRecordRefund()

  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [method, setMethod] = useState<FinancialPaymentMethod>('cash')
  const [reference, setReference] = useState('')
  const [completed, setCompleted] = useState(true)
  const [date, setDate] = useState(toDateInputValue())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (target) {
      setAmount(target.refundableAmount > 0 ? String(target.refundableAmount) : '')
      setReason('')
      setReference('')
      setMethod('cash')
      setCompleted(true)
      setDate(toDateInputValue())
      setError(null)
    }
  }, [target])

  if (!target) return null

  const parsedAmount = Number(amount)
  const valid = Number.isFinite(parsedAmount) && parsedAmount > 0 && reason.trim().length > 0
  const exceeds = parsedAmount > target.refundableAmount

  const submit = async () => {
    setError(null)

    try {
      await recordRefund.mutateAsync({
        transactionId: target.id,
        amount: parsedAmount,
        reason: reason.trim(),
        refundMethod: method,
        refundReference: reference.trim() ? reference.trim() : null,
        refundDate: new Date(date).toISOString(),
        completed,
      })

      toast.success(
        completed
          ? `${money(parsedAmount)} refund recorded against ${target.reference}.`
          : `${money(parsedAmount)} refund recorded as pending — it counts as money out once completed.`,
      )
      onClose()
    } catch (failure) {
      setError(errorMessage(failure, 'The refund could not be recorded.'))
    }
  }

  return (
    <ConfirmDialog
      open
      title="Record a refund"
      description={`Against ${target.reference}${target.customerName ? ` · ${target.customerName}` : ''}. The original payment stays on the books.`}
      confirmLabel={recordRefund.isPending ? 'Recording…' : 'Record refund'}
      confirmDisabled={!valid || exceeds || recordRefund.isPending}
      onCancel={onClose}
      onConfirm={() => void submit()}
    >
      <RefundFields
        amount={amount}
        onAmountChange={setAmount}
        refundableAmount={target.refundableAmount}
        originalAmount={target.amount}
        reason={reason}
        onReasonChange={setReason}
        method={method}
        onMethodChange={setMethod}
        reference={reference}
        onReferenceChange={setReference}
        date={date}
        onDateChange={setDate}
        completed={completed}
        onCompletedChange={setCompleted}
        exceeds={exceeds}
        error={error}
      />
    </ConfirmDialog>
  )
}
