import { useState } from 'react'
import { ShieldCheck, ShieldAlert } from 'lucide-react'
import { ConfirmDialog } from '../ui/confirm-dialog'
import { Field, Input, Select } from '../ui/field'
import { money } from '../../lib/format'

export type ClaimSummary = {
  id: string
  customerName?: string | null
  amount?: number
  reference?: string
  parsedTransactionCode?: string | null
  submittedMessage?: string | null
}

export type FinanceClaimDialogsProps = {
  verifyOpen: boolean
  verifyPending: boolean
  onVerifyClose: () => void
  onVerify: (paymentId: string, note: string | null, receivedAmount?: number | null) => void
  rejectOpen: boolean
  rejectPending: boolean
  onRejectClose: () => void
  onReject: (paymentId: string, reason: string) => void
  rejectionReason: string
  onRejectionReasonChange: (value: string) => void
  /** The claim being decided, so the confirmation names it and knows its id. */
  claim?: ClaimSummary | null
}

const REJECT_REASONS = ['Duplicate payment', 'Wrong amount', 'Not received', 'Other']

function ClaimPanel({ claim }: { claim?: ClaimSummary | null }) {
  if (!claim) return null
  return (
    <div className="rounded-md border border-line bg-hover p-[0.7rem]">
      <div className="truncate font-semibold">{claim.customerName || 'Claim'}</div>
      <div className="text-meta text-muted">
        {claim.reference}
        {typeof claim.amount === 'number' ? ` · ${money(claim.amount)}` : ''}
      </div>
      {claim.parsedTransactionCode ? (
        <div className="mono mt-[0.2rem] text-meta">Code: {claim.parsedTransactionCode}</div>
      ) : null}
    </div>
  )
}

export function FinanceClaimDialogs({
  verifyOpen,
  verifyPending,
  onVerifyClose,
  onVerify,
  rejectOpen,
  rejectPending,
  onRejectClose,
  onReject,
  rejectionReason,
  onRejectionReasonChange,
  claim,
}: FinanceClaimDialogsProps) {
  const [verifyNote, setVerifyNote] = useState('')
  const [verifyAmount, setVerifyAmount] = useState('')
  const [rejectionDetails, setRejectionDetails] = useState('')

  const composedReason = rejectionReason === 'Other' ? rejectionDetails.trim() : rejectionReason.trim()
  const verifying = verifyPending
  const rejecting = rejectPending

  return (
    <>
      <ConfirmDialog
        open={verifyOpen}
        title="Verify claim"
        description="Confirm the money arrived before recording it as income."
        icon={<ShieldCheck className="size-6" aria-hidden="true" />}
        confirmLabel="Verify claim"
        cancelLabel="Cancel"
        confirmDisabled={verifying || !claim?.id}
        onConfirm={() => {
          if (!claim?.id) return
          onVerify(
            claim.id,
            verifyNote.trim() || null,
            verifyAmount ? Number(verifyAmount.replace(/,/g, '')) : undefined,
          )
          setVerifyNote('')
          setVerifyAmount('')
        }}
        onCancel={onVerifyClose}
      >
        <ClaimPanel claim={claim} />
        <p className="text-meta text-muted">Verifying records this as income in your cashbook.</p>
        <Field label="What you received (optional)" htmlFor="verify-amount">
          <Input
            id="verify-amount"
            inputMode="decimal"
            value={verifyAmount}
            onChange={(e) => setVerifyAmount(e.target.value)}
            placeholder="Leave blank to use the claimed amount"
            className="w-full"
          />
        </Field>
        <Field label="Note (optional)" htmlFor="verify-note">
          <Input
            id="verify-note"
            value={verifyNote}
            onChange={(e) => setVerifyNote(e.target.value)}
            placeholder="Anything worth recording"
            className="w-full"
          />
        </Field>
      </ConfirmDialog>

      <ConfirmDialog
        open={rejectOpen}
        title="Reject claim"
        description="The customer's payment stays unpaid. A reason is required."
        icon={<ShieldAlert className="size-6" aria-hidden="true" />}
        tone="danger"
        confirmLabel="Reject claim"
        cancelLabel="Cancel"
        confirmDisabled={!composedReason || rejecting || !claim?.id}
        onConfirm={() => {
          if (!claim?.id || !composedReason) return
          onReject(claim.id, composedReason)
          setRejectionDetails('')
        }}
        onCancel={onRejectClose}
      >
        <ClaimPanel claim={claim} />
        <Field label="Reason" htmlFor="reject-reason">
          <Select
            id="reject-reason"
            value={rejectionReason}
            onChange={(e) => {
              onRejectionReasonChange(e.target.value)
              if (e.target.value !== 'Other') setRejectionDetails('')
            }}
            className="w-full"
          >
            <option value="">Choose a reason…</option>
            {REJECT_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </Select>
        </Field>
        {rejectionReason === 'Other' ? (
          <Field label="Details" htmlFor="reject-details">
            <Input
              id="reject-details"
              value={rejectionDetails}
              onChange={(e) => setRejectionDetails(e.target.value)}
              placeholder="Tell the customer why the claim was rejected"
              className="w-full"
            />
          </Field>
        ) : null}
      </ConfirmDialog>
    </>
  )
}

