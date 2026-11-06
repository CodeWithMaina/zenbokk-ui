import { toast } from 'sonner'
import { Button } from '../../ui/button'
import { Drawer } from '../../ui/drawer'
import { DescriptionList, DescriptionRow } from '../../ui/description-list'
import { Note } from '../../ui/note'
import { Skeleton } from '../../ui/skeleton'
import { Alert } from '../../ui/alert'
import { ClassificationBadge, channelLabel, formatTimestamp, humanize } from './shared'
import {
  useAdminNotificationLog,
  useCancelNotification,
  useRetryNotification,
} from '../../../lib/admin/use-admin-notifications'
import { errorMessage } from '../../../lib/api/client'

/**
 * Full detail for one notification record.
 *
 * Shows the ledger's own fields (attempt history, provider reference, retry
 * count) and the sanitized payload — never a raw secret. Retry is offered only
 * for retry-exhausted rows and cancel only for unclaimed rows, matching the
 * server's own eligibility rules.
 */
export function NotificationLogDetailDrawer({
  notificationId,
  onClose,
}: {
  notificationId: string | null
  onClose: () => void
}) {
  const query = useAdminNotificationLog(notificationId)
  const retry = useRetryNotification()
  const cancel = useCancelNotification()

  const detail = query.data

  const handleRetry = async () => {
    if (!detail) return
    try {
      const result = await retry.mutateAsync(detail.id)
      if (result.accepted) toast.success(result.message)
      else toast.error(result.message)
    } catch (error) {
      toast.error(errorMessage(error, 'The retry could not be queued.'))
    }
  }

  const handleCancel = async () => {
    if (!detail) return
    try {
      const result = await cancel.mutateAsync({
        id: detail.id,
        reason: 'Cancelled from the admin console',
      })
      if (result.accepted) toast.success(result.message)
      else toast.error(result.message)
    } catch (error) {
      toast.error(errorMessage(error, 'The notification could not be cancelled.'))
    }
  }

  return (
    <Drawer
      open={notificationId !== null}
      onClose={onClose}
      title="Notification detail"
      description={detail ? humanize(detail.notificationType) : undefined}
      footer={
        detail ? (
          <div className="flex justify-end gap-[0.6rem]">
            {detail.cancellable ? (
              <Button
                variant="danger"
                size="sm"
                disabled={cancel.isPending}
                onClick={() => void handleCancel()}
              >
                {cancel.isPending ? 'Cancelling…' : 'Cancel delivery'}
              </Button>
            ) : null}
            {detail.retryEligible ? (
              <Button
                variant="primary"
                size="sm"
                disabled={retry.isPending}
                onClick={() => void handleRetry()}
              >
                {retry.isPending ? 'Requeuing…' : 'Retry delivery'}
              </Button>
            ) : null}
          </div>
        ) : null
      }
    >
      {query.isError ? (
        <Alert tone="danger">{errorMessage(query.error, 'The notification did not load.')}</Alert>
      ) : query.isPending || !detail ? (
        <Skeleton className="h-64 rounded-card" />
      ) : (
        <div className="flex flex-col gap-[1rem]">
          <DescriptionList>
            <DescriptionRow label="Notification id" value={<span className="tabular">{detail.id}</span>} />
            <DescriptionRow label="Business" value={detail.businessName ?? 'Platform'} />
            <DescriptionRow label="Recipient" value={<span className="tabular">{detail.recipientMasked}</span>} />
            <DescriptionRow label="Channel" value={channelLabel(detail.channel)} />
            <DescriptionRow label="Type" value={humanize(detail.notificationType)} />
            <DescriptionRow
              label="Template"
              description={detail.templateKey ?? undefined}
              value={
                detail.templateVersion === null
                  ? humanize(detail.templateSource || 'unknown')
                  : `${humanize(detail.templateSource)} · v${detail.templateVersion}`
              }
            />
            <DescriptionRow
              label="Status"
              value={<ClassificationBadge classification={detail.classification} />}
            />
            <DescriptionRow label="Created" value={formatTimestamp(detail.createdAtUtc)} />
            <DescriptionRow label="Last updated" value={formatTimestamp(detail.updatedAtUtc)} />
            <DescriptionRow label="Next attempt" value={formatTimestamp(detail.nextAttemptAtUtc)} />
            <DescriptionRow label="Delivered" value={formatTimestamp(detail.deliveredAtUtc)} />
            <DescriptionRow label="Dead-lettered" value={formatTimestamp(detail.deadLetteredAtUtc)} />
            <DescriptionRow label="Provider reference" value={detail.templateKey ?? '—'} />
            <DescriptionRow label="Idempotency key" value={detail.idempotencyKey ?? '—'} />
            <DescriptionRow label="Retry count" value={detail.attempts} />
            <DescriptionRow label="Automation rule" value={detail.ruleId ?? '—'} />
            <DescriptionRow label="Source job" value={detail.sourceJobId ?? '—'} />
          </DescriptionList>

          {detail.sanitizedError ? (
            <Alert tone="danger" title="Error">
              {detail.sanitizedError}
            </Alert>
          ) : null}

          {detail.deliveryAttempts.length > 0 ? (
            <div>
              <h3 className="mb-[0.4rem] text-meta font-semibold">Attempt history</h3>
              <DescriptionList>
                {detail.deliveryAttempts.map((attempt, index) => (
                  <DescriptionRow
                    key={index}
                    label={`Attempt ${index + 1}`}
                    description={`Started ${formatTimestamp(attempt.startedAtUtc)}`}
                    value={humanize(attempt.outcome)}
                  />
                ))}
              </DescriptionList>
            </div>
          ) : null}

          <div>
            <h3 className="mb-[0.4rem] text-meta font-semibold">Payload (sanitized)</h3>
            <pre className="overflow-x-auto rounded-md bg-sunken p-[0.7rem] text-caption">
              {detail.sanitizedPayloadJson}
            </pre>
            <Note className="mt-[0.5rem]">
              Secrets such as verification codes are removed before a payload reaches this view.
            </Note>
          </div>
        </div>
      )}
    </Drawer>
  )
}
