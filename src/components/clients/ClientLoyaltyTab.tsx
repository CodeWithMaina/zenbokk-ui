import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { ActivityTimeline } from '../ui/activity-timeline'
import type { ActivityEntry } from '../ui/activity-timeline'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { SectionCard } from '../ui/card'
import { DescriptionList, DescriptionRow } from '../ui/description-list'
import { PaginationBar } from '../ui/pagination-bar'
import { Skeleton } from '../ui/skeleton'
import { StampAdjuster } from '../ui/stamp-adjuster'
import { LoyaltyCardPreview } from './LoyaltyCardPreview'
import { errorMessage } from '../../lib/api/client'
import type { CustomerDetailsLoyaltySummary } from '../../lib/api/types'
import { ledgerSourceLabel, rewardLabel } from '../../lib/clients/mappers'
import { useAdjustStamps, useClientLoyaltyLedger } from '../../lib/clients/use-clients'
import { useDashboardContext } from '../../lib/dashboard/dashboard-context'
import { MODULE } from '../../lib/entitlements'
import { formatDate, formatNumber, formatTime, money } from '../../lib/format'

export type ClientLoyaltyTabProps = {
  customerId: string
  customerName: string
  loyalty: CustomerDetailsLoyaltySummary | null
}

function signedAmount(item: { signedAmount: number; direction: string; amount: number }): number {
  if (item.signedAmount) return item.signedAmount
  return item.direction.toLowerCase() === 'debit' ? -item.amount : item.amount
}

/**
 * Loyalty tab: the card, the programme's own reward wording, the manual stamp
 * adjuster and the append-only ledger that records every adjustment.
 *
 * Two backend contracts can write a stamp balance, and the business's
 * entitlements decide which one applies:
 *  - `loyalty` module → `POST /v1/loyalty/stamps/manual` (ledger entry with a
 *    reason, visible in the audit log below);
 *  - `stamps` module  → `POST /v1/stamps/adjust` (reason code + optional note).
 * Neither path is simulated locally: the count shown after saving is the
 * server's answer, and the ledger below is refetched from the API.
 */
export function ClientLoyaltyTab({
  customerId,
  customerName,
  loyalty,
}: ClientLoyaltyTabProps) {
  const { hasModule, hasPermission } = useDashboardContext()
  const ledgerAllowed = hasModule(MODULE.loyalty) && hasPermission('loyalty.stamp')
  const adjustmentAllowed = hasModule(MODULE.stamps) && hasPermission('stamps.adjust')
  const mode = ledgerAllowed ? 'ledger' : adjustmentAllowed ? 'adjustment' : null

  const saved = loyalty?.totalStamps ?? 0
  const goal = Math.max(1, loyalty?.stampsRequired ?? 8)

  const [draft, setDraft] = useState(saved)
  const [reason, setReason] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const adjustment = useAdjustStamps()
  const ledger = useClientLoyaltyLedger(
    customerId,
    { page, pageSize },
    ledgerAllowed && loyalty !== null,
  )

  const canAdjust = mode !== null && loyalty !== null

  const save = () => {
    if (!loyalty || !mode) return
    const delta = draft - saved
    if (delta === 0) return

    adjustment.mutate(
      mode === 'ledger'
        ? { cardId: loyalty.cardId, amount: delta, reason: reason.trim() }
        : {
            cardId: loyalty.cardId,
            delta,
            reason: 'ManualCorrection',
            note: reason.trim() || null,
          },
      {
        onSuccess: (result) => {
          const total =
            'totalStamps' in result ? result.totalStamps : result.totalStampsAfter
          const unlocked = 'unlockedReward' in result ? result.unlockedReward : null
          const ready = unlocked !== null || ('rewardReady' in result && result.rewardReady)

          setDraft(total)
          setReason('')

          if (unlocked) {
            toast.success(`Reward unlocked: ${unlocked.rewardName}`, {
              description: `Card is now at ${total} of ${goal}.`,
            })
          } else {
            toast.success(`Stamps saved · ${total} of ${goal}`, {
              description: ready
                ? 'A reward is ready to redeem on the next visit.'
                : 'Recorded in this client’s loyalty history.',
            })
          }
        },
        onError: (error) => {
          toast.error('The stamp change was not saved', {
            description: errorMessage(error),
          })
        },
      },
    )
  }

  const ledgerEntries: ActivityEntry[] = (ledger.data?.items ?? []).map((item) => {
    const signed = signedAmount(item)
    const actor = item.createdByName
      ? `by ${item.createdByName}`
      : item.isAutomatic
        ? 'automatic'
        : 'not attributed'

    return {
      id: item.id,
      title: `${signed > 0 ? '+' : ''}${signed} stamp${Math.abs(signed) === 1 ? '' : 's'} · ${ledgerSourceLabel(item.source)}`,
      description: item.reason ? `${item.reason} · ${actor}` : actor,
      time: `${formatDate(item.createdAt)} · ${formatTime(item.createdAt)}`,
      tone: signed > 0 ? 'success' : 'warning',
    }
  })

  return (
    <div className="grid items-start gap-[1.1rem] min-[900px]:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-[1rem]">
        <LoyaltyCardPreview
          loyalty={loyalty}
          memberName={customerName}
          stamps={draft}
          previewNote={
            draft !== saved ? (
              <b className="font-semibold text-fg">Unsaved preview</b>
            ) : undefined
          }
        />

        {loyalty ? (
          <SectionCard title="Programme">
            <DescriptionList>
              <DescriptionRow label="Programme" value={loyalty.programName} />
              <DescriptionRow label="Reward" value={rewardLabel(loyalty)} />
              <DescriptionRow
                label="Stamps required"
                value={`${formatNumber(loyalty.stampsRequired)} per reward`}
              />
              <DescriptionRow
                label="Current stamps"
                value={`${formatNumber(saved)} of ${formatNumber(goal)}`}
              />
              <DescriptionRow
                label="Reward validity"
                value={
                  loyalty.rewardExpirationHours > 0
                    ? `${loyalty.rewardExpirationHours} hours once earned`
                    : 'No expiry configured'
                }
              />
              <DescriptionRow
                label="Card design"
                value={`${loyalty.cardDesignName ?? 'Default card'}${loyalty.cardDesignIsDefault ? ' (default)' : ''}`}
              />
              {loyalty.rewardValue > 0 ? (
                <DescriptionRow label="Reward value" value={money(loyalty.rewardValue)} />
              ) : null}
            </DescriptionList>
          </SectionCard>
        ) : null}
      </div>

      <div className="flex flex-col gap-[1rem]">
        {canAdjust ? (
          <StampAdjuster
            savedStamps={saved}
            value={draft}
            onValueChange={setDraft}
            goal={goal}
            reason={reason}
            onReasonChange={setReason}
            reasonRequired={mode === 'ledger'}
            reasonLabel={mode === 'ledger' ? 'Reason' : 'Note'}
            reasonPlaceholder={
              mode === 'ledger'
                ? 'e.g. Missed stamp from 12 Oct'
                : 'Optional note for this correction'
            }
            onSave={save}
            onReset={() => {
              setDraft(saved)
              setReason('')
            }}
            saving={adjustment.isPending}
            description={
              mode === 'ledger'
                ? 'Add or remove stamps by hand. Every change is written to the loyalty ledger with your reason.'
                : 'Add or remove stamps by hand. The correction is recorded as a manual correction.'
            }
          />
        ) : (
          <Alert
            tone="info"
            title={
              loyalty
                ? 'Stamp adjustments are not available to you'
                : 'No loyalty card to adjust'
            }
          >
            {loyalty
              ? 'Manual stamp changes need the loyalty module (with the loyalty.stamp permission) or the stamps module with stamps.adjust. Ask the owner to review the plan or your role.'
              : 'This client has not joined a loyalty programme, so there is no card to adjust.'}
          </Alert>
        )}

        {ledgerAllowed ? (
          <SectionCard
            title="Loyalty history"
            description="Every stamp movement on this card, newest first."
            action={
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void ledger.refetch()}
                disabled={ledger.isFetching}
              >
                <RefreshCw className="size-3.5" aria-hidden="true" />
                Refresh
              </Button>
            }
          >
            {ledger.isPending ? (
              <div
                className="flex flex-col gap-[0.9rem]"
                aria-busy="true"
                aria-label="Loading loyalty history"
              >
                {Array.from({ length: 3 }, (_, index) => (
                  <Skeleton key={index} className="h-8" />
                ))}
              </div>
            ) : ledger.isError ? (
              <Alert tone="danger" title="Loyalty history could not be loaded">
                {errorMessage(ledger.error)}
              </Alert>
            ) : (
              <ActivityTimeline
                entries={ledgerEntries}
                emptyLabel="No stamps recorded on this card yet."
              />
            )}

            {ledger.data && ledger.data.totalPages > 1 ? (
              <div className="mt-[1rem]">
                <PaginationBar
                  page={ledger.data.page}
                  pageCount={ledger.data.totalPages}
                  onPageChange={setPage}
                  pageSize={pageSize}
                  pageSizeOptions={[10, 25, 50]}
                  onPageSizeChange={(size) => {
                    setPageSize(size)
                    setPage(1)
                  }}
                />
              </div>
            ) : null}
          </SectionCard>
        ) : null}
      </div>
    </div>
  )
}

