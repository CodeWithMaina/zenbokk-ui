import { useState } from 'react'
import { toast } from 'sonner'
import { Alert } from '../../ui/alert'
import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import { ConfirmDialog } from '../../ui/confirm-dialog'
import { DescriptionList, DescriptionRow } from '../../ui/description-list'
import { Drawer } from '../../ui/drawer'
import { Skeleton } from '../../ui/skeleton'
import { Switch } from '../../ui/switch'
import {
  NOTIFICATION_CHANNELS,
  channelLabel,
  formatCount,
  formatPercent,
  formatTimestamp,
  humanize,
} from './shared'
import {
  useAdminNotificationBusiness,
  useResetBusinessNotificationTemplates,
  useSetBusinessNotificationChannel,
} from '../../../lib/admin/use-admin-notifications'
import { errorMessage } from '../../../lib/api/client'

/**
 * Notification posture for one business, with the administrative overrides the
 * platform may apply. Overrides are explicit and audited server-side, and the
 * business's own settings remain distinguishable from them.
 */
export function BusinessNotificationDrawer({
  businessId,
  onClose,
}: {
  businessId: string | null
  onClose: () => void
}) {
  const query = useAdminNotificationBusiness(businessId)
  const setChannel = useSetBusinessNotificationChannel()
  const resetTemplates = useResetBusinessNotificationTemplates()
  const [pendingChannel, setPendingChannel] = useState<{ channel: string; enabled: boolean } | null>(
    null,
  )
  const [resetOpen, setResetOpen] = useState(false)

  const detail = query.data

  const confirmChannel = async () => {
    if (!detail || !pendingChannel) return
    try {
      await setChannel.mutateAsync({
        businessId: detail.businessId,
        channel: pendingChannel.channel,
        enabled: pendingChannel.enabled,
        reason: pendingChannel.enabled
          ? 'Channel re-enabled by platform administrator'
          : 'Channel disabled by platform administrator',
      })
      toast.success(
        `${channelLabel(pendingChannel.channel)} ${
          pendingChannel.enabled ? 'enabled' : 'disabled'
        } for ${detail.businessName}.`,
      )
    } catch (error) {
      toast.error(errorMessage(error, 'The channel override could not be saved.'))
    } finally {
      setPendingChannel(null)
    }
  }

  const confirmReset = async () => {
    if (!detail) return
    try {
      await resetTemplates.mutateAsync(detail.businessId)
      toast.success('Business templates reset to the platform defaults.')
    } catch (error) {
      toast.error(errorMessage(error, 'The templates could not be reset.'))
    } finally {
      setResetOpen(false)
    }
  }

  return (
    <>
      <Drawer
        open={businessId !== null}
        onClose={onClose}
        title={detail?.businessName ?? 'Business notifications'}
        description={
          detail
            ? `${formatPercent(detail.deliverySuccessRatePercent)} delivery success rate`
            : undefined
        }
      >
        {query.isError ? (
          <Alert tone="danger">
            {errorMessage(query.error, 'The business notification settings did not load.')}
          </Alert>
        ) : query.isPending || !detail ? (
          <Skeleton className="h-64 rounded-card" />
        ) : (
          <div className="flex flex-col gap-[1rem]">
            {detail.deliveryDisabled ? (
              <Alert tone="warning" title="Delivery is disabled for at least one channel">
                A channel has been suppressed across every notification category for this business.
              </Alert>
            ) : null}

            <DescriptionList>
              <DescriptionRow label="Total notifications" value={formatCount(detail.totalNotifications)} />
              <DescriptionRow label="Delivered" value={formatCount(detail.sent)} />
              <DescriptionRow label="Failed" value={formatCount(detail.failed)} />
              <DescriptionRow label="Pending" value={formatCount(detail.pending)} />
              <DescriptionRow
                label="Last notification"
                value={formatTimestamp(detail.lastNotificationAtUtc)}
              />
            </DescriptionList>

            <div>
              <h3 className="mb-[0.5rem] text-meta font-semibold">Channels</h3>
              <DescriptionList>
                {NOTIFICATION_CHANNELS.map((channel) => {
                  const override = detail.channelOverrides.find((entry) => entry.channel === channel)
                  const enabled = !override || override.enabled
                  return (
                    <DescriptionRow
                      key={channel}
                      label={channelLabel(channel)}
                      description={
                        override
                          ? `Administrator override · ${formatTimestamp(override.updatedAtUtc)}`
                          : 'Business setting'
                      }
                      value={
                        <span className="flex items-center gap-3">
                          <Badge tone={enabled ? 'success' : 'danger'}>
                            {enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                          <Switch
                            label={`Toggle ${channelLabel(channel)} for this business`}
                            checked={enabled}
                            disabled={setChannel.isPending}
                            onCheckedChange={(next) => setPendingChannel({ channel, enabled: next })}
                          />
                        </span>
                      }
                    />
                  )
                })}
              </DescriptionList>
            </div>

            <div>
              <div className="mb-[0.5rem] flex items-center justify-between gap-3">
                <h3 className="text-meta font-semibold">Templates ({detail.templates.length})</h3>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={resetTemplates.isPending || detail.templates.length === 0}
                  onClick={() => setResetOpen(true)}
                >
                  Reset to defaults
                </Button>
              </div>
              {detail.templates.length === 0 ? (
                <p className="text-meta text-muted">
                  This business uses the platform templates everywhere.
                </p>
              ) : (
                <DescriptionList>
                  {detail.templates.map((template) => (
                    <DescriptionRow
                      key={template.id}
                      label={humanize(template.type)}
                      description={`${channelLabel(template.channel)} · v${template.version} · ${template.updatedBy}`}
                      value={formatTimestamp(template.updatedAtUtc)}
                    />
                  ))}
                </DescriptionList>
              )}
            </div>

            <div>
              <h3 className="mb-[0.5rem] text-meta font-semibold">
                Automation rules ({detail.automationRules.length})
              </h3>
              {detail.automationRules.length === 0 ? (
                <p className="text-meta text-muted">No automation rules are configured.</p>
              ) : (
                <DescriptionList>
                  {detail.automationRules.map((rule) => (
                    <DescriptionRow
                      key={rule.id}
                      label={rule.name}
                      description={humanize(rule.trigger)}
                      value={
                        <Badge tone={rule.enabled ? 'success' : 'neutral'}>
                          {rule.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      }
                    />
                  ))}
                </DescriptionList>
              )}
            </div>

            <div>
              <h3 className="mb-[0.5rem] text-meta font-semibold">Recent failures</h3>
              {detail.recentFailures.length === 0 ? (
                <p className="text-meta text-muted">No recent failures for this business.</p>
              ) : (
                <DescriptionList>
                  {detail.recentFailures.map((item) => (
                    <DescriptionRow
                      key={item.id}
                      label={humanize(item.notificationType)}
                      description={`${channelLabel(item.channel)} → ${item.recipientMasked}`}
                      value={item.errorSummary ?? '—'}
                    />
                  ))}
                </DescriptionList>
              )}
            </div>

            <div>
              <h3 className="mb-[0.5rem] text-meta font-semibold">Recent notifications</h3>
              <DescriptionList>
                {detail.recentNotifications.slice(0, 8).map((item) => (
                  <DescriptionRow
                    key={item.id}
                    label={humanize(item.notificationType)}
                    description={`${channelLabel(item.channel)} · ${formatTimestamp(item.createdAtUtc)}`}
                    value={item.status}
                  />
                ))}
              </DescriptionList>
            </div>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={pendingChannel !== null}
        title={pendingChannel?.enabled ? 'Enable this channel?' : 'Disable this channel?'}
        description={
          pendingChannel
            ? pendingChannel.enabled
              ? `${channelLabel(pendingChannel.channel)} will return to the platform default for this business.`
              : `${channelLabel(pendingChannel.channel)} will be suppressed for every notification category until you re-enable it.`
            : ''
        }
        confirmLabel={pendingChannel?.enabled ? 'Enable channel' : 'Disable channel'}
        onConfirm={() => void confirmChannel()}
        onCancel={() => setPendingChannel(null)}
      />

      <ConfirmDialog
        open={resetOpen}
        title="Reset business templates?"
        description="Every business template override will be deleted and the platform defaults restored. This is recorded in the audit log."
        confirmLabel="Reset templates"
        onConfirm={() => void confirmReset()}
        onCancel={() => setResetOpen(false)}
      />
    </>
  )
}
