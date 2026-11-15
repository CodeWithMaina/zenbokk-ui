import { BadgeCheck, Ban, Flag } from 'lucide-react'
import { useState } from 'react'
import type { PaymentVerificationItem } from '../../lib/payments/api'
import { CLAIM_REJECTION_REASONS } from '../../lib/finances/claim-status'
import { money } from '../../lib/format'
import { Checkbox } from '../ui/checkbox'
import { ConfirmDialog } from '../ui/confirm-dialog'
import { Field, Input, Select, Textarea } from '../ui/field'

/**
 * The decisions a business owner can take on a claim.
 *
 * Each one makes the owner state the thing the server cannot see. Verifying asks them to
 * confirm — one box at a time — that the transaction exists in their own M-PESA account,
 * that the amount and code match, and that the money landed with them. Rejecting demands a
 * reason the customer will be shown. Flagging demands a note explaining what needs looking
 * into. Money never moves from a click alone.
 */

export type VerifyClaimPayload = {
  note: string | null
  receivedAmount: number | null
  transactionReference: string | null
  transactionExists: boolean
  amountMatches: boolean
  codeMatches: boolean
  belongsToBusiness: boolean
}

export function VerifyClaimDialog({
  claim,
  pending,
  onCancel,
  onConfirm,
}: {
  claim: PaymentVerificationItem | null
  pending: boolean
  onCancel: () => void
  onConfirm: (payload: VerifyClaimPayload) => void
}) {
  // Prefilled from what the server read out of the message, so the owner is confirming a
  // figure rather than typing one — but both fields stay editable, because the owner's own
  // M-PESA view is the authority, not our parse.
  const [received, setReceived] = useState(
    claim?.submittedAmount != null ? String(claim.submittedAmount) : '',
  )
  const [reference, setReference] = useState(claim?.transactionCode ?? '')
  const [note, setNote] = useState('')
  const [confirmed, setConfirmed] = useState({
    transactionExists: false,
    amountMatches: false,
    codeMatches: false,
    belongsToBusiness: false,
  })

  const allConfirmed =
    confirmed.transactionExists &&
    confirmed.amountMatches &&
    confirmed.codeMatches &&
    confirmed.belongsToBusiness

  const parsedReceived = received.trim() ? Number(received) : null
  const receivedInvalid =
    parsedReceived != null && (!Number.isFinite(parsedReceived) || parsedReceived <= 0)

  return (
    <ConfirmDialog
      open={Boolean(claim)}
      icon={<BadgeCheck className="size-5" aria-hidden="true" />}
      title="Confirm this payment arrived?"
      description={
        claim
          ? `This records ${money(claim.submittedAmount ?? claim.expectedAmount, claim.currency)} as money received and puts it in the Cashbook. It cannot be undone from here.`
          : undefined
      }
      confirmLabel={pending ? 'Recording…' : 'Confirm payment received'}
      confirmDisabled={!allConfirmed || receivedInvalid || pending}
      onCancel={onCancel}
      onConfirm={() =>
        onConfirm({
          note: note.trim() ? note.trim() : null,
          receivedAmount: parsedReceived,
          transactionReference: reference.trim() ? reference.trim() : null,
          ...confirmed,
        })
      }
    >
      <p className="m-0 text-meta text-muted">
        Check your own M-PESA account before you continue. Confirm each point:
      </p>

      <div className="mt-[0.7rem] flex flex-col gap-[0.6rem]">
        <CheckRow
          label="I can see this transaction in our M-PESA account."
          checked={confirmed.transactionExists}
          onChange={(value) => setConfirmed((prev) => ({ ...prev, transactionExists: value }))}
        />
        <CheckRow
          label={`The amount received matches this claim (${money(claim?.expectedAmount ?? 0, claim?.currency ?? 'KES')} expected).`}
          checked={confirmed.amountMatches}
          onChange={(value) => setConfirmed((prev) => ({ ...prev, amountMatches: value }))}
        />
        <CheckRow
          label="The transaction code matches the actual transaction."
          checked={confirmed.codeMatches}
          onChange={(value) => setConfirmed((prev) => ({ ...prev, codeMatches: value }))}
        />
        <CheckRow
          label="This payment was received by this business."
          checked={confirmed.belongsToBusiness}
          onChange={(value) => setConfirmed((prev) => ({ ...prev, belongsToBusiness: value }))}
        />
      </div>

      <div className="mt-[0.9rem] grid grid-cols-2 gap-[0.8rem] max-sm:grid-cols-1">
        <Field
          label="Amount actually received"
          htmlFor="claim-received"
          hint="Change this only if your M-PESA account shows a different figure."
          error={receivedInvalid ? 'Enter an amount greater than zero.' : undefined}
        >
          <Input
            id="claim-received"
            inputMode="decimal"
            value={received}
            onChange={(event) => setReceived(event.target.value)}
            placeholder={claim ? String(claim.expectedAmount) : ''}
          />
        </Field>
        <Field label="Transaction reference" htmlFor="claim-reference">
          <Input
            id="claim-reference"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="M-PESA receipt code"
            className="font-mono"
          />
        </Field>
      </div>

      <Field label="Note" htmlFor="claim-verify-note" className="mt-[0.9rem]">
        <Input
          id="claim-verify-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Anything worth remembering about this payment."
        />
      </Field>
    </ConfirmDialog>
  )
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex items-start gap-[0.6rem] text-meta">
      <Checkbox checked={checked} onCheckedChange={onChange} label={label} className="mt-[0.1rem]" />
      <span>{label}</span>
    </label>
  )
}

/**
 * Rejection is a reason, not a button. The reason is mandatory server-side and is shown to
 * the customer, so the dialog offers the common causes and lets the owner add detail. A "no"
 * without a why leaves the customer with money paid and no way forward.
 */
export function RejectClaimDialog({
  claim,
  pending,
  onCancel,
  onConfirm,
}: {
  claim: PaymentVerificationItem | null
  pending: boolean
  onCancel: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState<string>(CLAIM_REJECTION_REASONS[0])
  const [detail, setDetail] = useState('')

  const resolved =
    reason === 'Other' ? detail.trim() : detail.trim() ? `${reason}: ${detail.trim()}` : reason

  return (
    <ConfirmDialog
      open={Boolean(claim)}
      tone="danger"
      icon={<Ban className="size-5" aria-hidden="true" />}
      title="Reject this claim?"
      description={
        claim
          ? `The customer will be told why. ${claim.customerName ?? 'They'} can pay again and submit a new confirmation.`
          : undefined
      }
      confirmLabel={pending ? 'Rejecting…' : 'Reject claim'}
      confirmDisabled={reason === 'Other' && !detail.trim()}
      onCancel={onCancel}
      onConfirm={() => onConfirm(resolved)}
    >
      <Field label="Reason" htmlFor="claim-reject-reason">
        <Select
          id="claim-reject-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        >
          {CLAIM_REJECTION_REASONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Add detail" htmlFor="claim-reject-detail" className="mt-[0.8rem]">
        <Textarea
          id="claim-reject-detail"
          rows={3}
          value={detail}
          placeholder="Anything else the customer should know."
          onChange={(event) => setDetail(event.target.value)}
        />
      </Field>
    </ConfirmDialog>
  )
}

/**
 * Flagging keeps a claim open and moves it aside for a second look. The note is internal —
 * it is never shown to the customer — so the dialog says so plainly.
 */
export function FlagClaimDialog({
  claim,
  pending,
  onCancel,
  onConfirm,
}: {
  claim: PaymentVerificationItem | null
  pending: boolean
  onCancel: () => void
  onConfirm: (note: string) => void
}) {
  const [note, setNote] = useState('')

  return (
    <ConfirmDialog
      open={Boolean(claim)}
      icon={<Flag className="size-5" aria-hidden="true" />}
      title="Flag this claim for review?"
      description={
        claim
          ? 'The claim stays unverified and stays in your queue. Nothing is recorded as received until you confirm the money.'
          : undefined
      }
      confirmLabel={pending ? 'Flagging…' : 'Flag for review'}
      confirmDisabled={!note.trim() || pending}
      onCancel={onCancel}
      onConfirm={() => onConfirm(note.trim())}
    >
      <Field
        label="What needs looking into?"
        htmlFor="claim-flag-note"
        hint="Kept internal — the customer never sees this note."
      >
        <Textarea
          id="claim-flag-note"
          rows={3}
          value={note}
          placeholder="e.g. the payer name does not match the customer who booked."
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
    </ConfirmDialog>
  )
}
