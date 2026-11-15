import { Badge } from '../ui/badge'
import type { FinancialVerificationStatus, ReconciliationStatus } from '../../lib/finances/api'
import {
  reconciliationLabel,
  reconciliationTone,
  verificationLabel,
  verificationTone,
} from '../../lib/finances/labels'

/**
 * The two money states, shown side by side and never merged.
 *
 * They answer different questions and a row can be any combination of them: the money may be
 * confirmed while nobody has compared it with the M-Pesa statement, and a check against the statement
 * never confirms the money. Rendering them as one badge would erase that distinction, which is the
 * whole point of the module.
 */
export function VerificationBadge({ status }: { status: FinancialVerificationStatus | string }) {
  return <Badge tone={verificationTone(status)}>{verificationLabel(status)}</Badge>
}

export function ReconciliationBadge({ status }: { status: ReconciliationStatus | string }) {
  return <Badge tone={reconciliationTone(status)}>{reconciliationLabel(status)}</Badge>
}

export function StatusPair({
  verification,
  reconciliation,
}: {
  verification: FinancialVerificationStatus | string
  reconciliation: ReconciliationStatus | string
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-[0.35rem]">
      <VerificationBadge status={verification} />
      <ReconciliationBadge status={reconciliation} />
    </span>
  )
}
