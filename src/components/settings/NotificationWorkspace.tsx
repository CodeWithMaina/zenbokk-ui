import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Activity, BellRing, Send, Smartphone, Layers, Workflow } from 'lucide-react'
import { Alert } from '../ui/alert'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, SectionCard } from '../ui/card'
import { DescriptionList, DescriptionRow } from '../ui/description-list'
import { EmptyState } from '../ui/empty-state'
import { Field, FormGrid, Input, Select, Textarea } from '../ui/field'
import { Note } from '../ui/note'
import { Skeleton } from '../ui/skeleton'
import { StatStrip } from '../ui/stat-tile'
import { Switch } from '../ui/switch'
import { Tabs } from '../ui/tabs'
import type { TabItem } from '../ui/tabs'
import { NotificationPreferencesTab } from './NotificationPreferencesTab'
import { NotificationTemplatesTab } from './NotificationTemplatesTab'
import {
  useBusinessAutomationRules,
  useBusinessNotificationChannels,
  useBusinessNotificationOverview,
  useToggleBusinessAutomationRule,
  useUpdateBusinessNotificationChannels,
} from '../../lib/notifications/use-business-notifications'
import { errorMessage } from '../../lib/api/client'
import { formatDate, formatNumber, formatTime, pluralize } from '../../lib/format'

type Tab = 'overview' | 'channels' | 'preferences' | 'templates' | 'automation'

const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  sms: 'SMS',
  push: 'Push notifications',
  in_app: 'In-app',
}

const CHANNEL_ICONS: Record<string, typeof Send> = {
  email: Send,
  sms: Smartphone,
  push: BellRing,
  in_app: Layers,
}

const TABS: readonly TabItem<Tab>[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'channels', label: 'Channels' },
  { value: 'preferences', label: 'Preferences' },
  { value: 'templates', label: 'Templates' },
  { value: 'automation', label: 'Automation' },
]

function formatStamp(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return `${formatDate(date)} · ${formatTime(iso)}`
}

/**
 * The business notification workspace.
 *
 * Organised as tabs because the five areas answer different questions: what the
 * system is doing (Overview), where it can reach customers (Channels), what it
 * is allowed to send (Preferences), what it says (Templates) and when it sends
 * (Automation). Every tab reads and writes real endpoints.
 */
export function NotificationWorkspace({ businessId }: { businessId: string }) {
  const [tab, setTab] = useState<Tab>('overview')

  return (
    <div className="flex flex-col gap-[1rem]">
      <Tabs label="Notification settings sections" items={TABS} value={tab} onValueChange={setTab} />

      <div role="tabpanel">
        {tab === 'overview' ? <OverviewTab businessId={businessId} /> : null}
        {tab === 'channels' ? <ChannelsTab businessId={businessId} /> : null}
        {tab === 'preferences' ? <NotificationPreferencesTab businessId={businessId} /> : null}
        {tab === 'templates' ? <NotificationTemplatesTab businessId={businessId} /> : null}
        {tab === 'automation' ? <AutomationTab /> : null}
      </div>
    </div>
  )
}

/** Delivery statistics for this business, over a selectable period. */
function OverviewTab({ businessId }: { businessId: string }) {
  const [range, setRange] = useState<'today' | '7d' | '30d' | '90d'>('30d')
  const query = useBusinessNotificationOverview(businessId, range)
  const overview = query.data

  if (query.isError) {
    return (
      <Alert tone="danger" title="We could not load your notification overview">
        {errorMessage(query.error, 'Try again in a moment.')}
      </Alert>
    )
  }

  const statusTone =
    overview?.systemStatus === 'healthy'
      ? 'success'
      : overview?.systemStatus === 'degraded'
        ? 'warning'
        : overview?.systemStatus === 'attention'
          ? 'danger'
          : 'neutral'

  return (
    <div className="flex flex-col gap-[1rem]">
      <Card className="p-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-heading font-bold tracking-snug">Notification system</h2>
            <p className="mt-[0.15rem] text-meta text-muted">
              {overview?.statusDetail ?? 'Checking the current status…'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {overview ? <Badge tone={statusTone}>{overview.systemStatus}</Badge> : null}
            <Select
              aria-label="Reporting period"
              value={range}
              onChange={(event) => setRange(event.target.value as typeof range)}
            >
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </Select>
          </div>
        </div>
      </Card>

      {query.isPending ? (
        <Skeleton className="h-32 rounded-card" />
      ) : (
        <>
          <SectionCard title="Delivery">
            <StatStrip
              items={[
                { value: formatNumber(overview?.totalNotifications ?? 0), label: 'Sent' },
                { value: formatNumber(overview?.delivered ?? 0), label: 'Delivered' },
                { value: formatNumber(overview?.failed ?? 0), label: 'Failed' },
                { value: formatNumber(overview?.pending ?? 0), label: 'Pending' },
                { value: formatNumber(overview?.processing ?? 0), label: 'Processing' },
                {
                  value:
                    overview?.deliverySuccessRatePercent === null ||
                    overview?.deliverySuccessRatePercent === undefined
                      ? '—'
                      : `${overview.deliverySuccessRatePercent}%`,
                  label: 'Success rate',
                },
              ]}
            />
          </SectionCard>

          <div className="grid grid-cols-2 gap-[1rem] max-lg:grid-cols-1">
            <SectionCard title="Enabled channels">
              {overview && overview.enabledChannels.length > 0 ? (
                <div className="flex flex-wrap gap-[0.35rem]">
                  {overview.enabledChannels.map((channel) => (
                    <Badge key={channel} tone="success">
                      {CHANNEL_LABELS[channel] ?? channel}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-meta text-muted">No channels are enabled yet.</p>
              )}
            </SectionCard>

            <SectionCard title="By channel">
              {(overview?.byChannel.length ?? 0) === 0 ? (
                <p className="text-meta text-muted">No notifications in this period.</p>
              ) : (
                <DescriptionList>
                  {(overview?.byChannel ?? []).map((entry) => (
                    <DescriptionRow
                      key={entry.key}
                      label={CHANNEL_LABELS[entry.key] ?? entry.key}
                      description={`${formatNumber(entry.sent)} delivered · ${formatNumber(entry.failed)} failed`}
                      value={formatNumber(entry.total)}
                    />
                  ))}
                </DescriptionList>
              )}
            </SectionCard>
          </div>

          <SectionCard title="Recent activity" description="Newest notifications sent on your behalf">
            {(overview?.recentActivity.length ?? 0) === 0 ? (
              <EmptyState
                icon={<Activity className="size-5" />}
                title="Nothing has been sent yet"
                description="Activity appears here as your notifications are delivered."
              />
            ) : (
              <DescriptionList>
                {(overview?.recentActivity ?? []).map((entry) => (
                  <DescriptionRow
                    key={entry.id}
                    label={entry.notificationType}
                    description={`${CHANNEL_LABELS[entry.channel] ?? entry.channel} · ${formatStamp(entry.createdAtUtc)}`}
                    value={entry.status}
                  />
                ))}
              </DescriptionList>
            )}
            {overview ? (
              <p className="mt-[0.8rem] text-caption text-muted">
                {pluralize(overview.totalNotifications, 'notification')} in this period. Test sends are
                counted separately and never appear here.
              </p>
            ) : null}
          </SectionCard>
        </>
      )}
    </div>
  )
}

function humanizeSetting(key: string): string {
  const labels: Record<string, string> = {
    senderDisplayName: 'Sender display name',
    replyTo: 'Reply-to',
    contactEmail: 'Contact email',
    footerNote: 'Footer',
    primaryColor: 'Brand colour',
    senderIdentity: 'Sender identity',
    contactPhone: 'Contact phone',
  }
  return labels[key] ?? key
}

/**
 * Per-channel configuration: what the business may change, and what the
 * platform owns. Enabling or disabling a channel writes the same kill-switch
 * rows the delivery pipeline already honours.
 */
function ChannelsTab({ businessId }: { businessId: string }) {
  const query = useBusinessNotificationChannels(businessId)
  const update = useUpdateBusinessNotificationChannels(businessId)

  const channels = query.data ?? []
  const [form, setForm] = useState<{
    displayName: string
    replyTo: string
    contactEmail: string
    footerNote: string
    primaryColor: string
  } | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  // Seed the draft from the server once, then keep local edits.
  const draft = useMemo(() => {
    if (form) return form
    const email = channels.find((entry) => entry.channel === 'email')
    return {
      displayName: email?.settings.senderDisplayName ?? '',
      replyTo: email?.settings.replyTo ?? '',
      contactEmail: email?.settings.contactEmail ?? '',
      footerNote: email?.settings.footerNote ?? '',
      primaryColor: email?.settings.primaryColor ?? '#2563EB',
    }
  }, [form, channels])

  if (query.isError) {
    return (
      <Alert tone="danger" title="We could not load your channel configuration">
        {errorMessage(query.error, 'Try again in a moment.')}
      </Alert>
    )
  }

  if (query.isPending) return <Skeleton className="h-48 rounded-card" />

  const toggleChannel = async (channel: string, enabled: boolean) => {
    const nextEnabled = channels
      .filter((entry) => (entry.channel === channel ? enabled : entry.enabled))
      .filter((entry) => entry.available)
      .map((entry) => entry.channel)

    try {
      await update.mutateAsync({ enabledChannels: nextEnabled })
      toast.success(`${CHANNEL_LABELS[channel] ?? channel} ${enabled ? 'enabled' : 'disabled'}.`)
    } catch (error) {
      toast.error(errorMessage(error, 'The channel could not be updated.'))
    }
  }

  const saveProfile = async () => {
    setFormError(null)
    try {
      await update.mutateAsync({
        displayName: draft.displayName || null,
        replyTo: draft.replyTo || null,
        contactEmail: draft.contactEmail || null,
        footerNote: draft.footerNote || null,
        primaryColor: draft.primaryColor || null,
      })
      toast.success('Notification branding and sender details saved.')
    } catch (error) {
      setFormError(errorMessage(error))
    }
  }

  return (
    <div className="flex flex-col gap-[1rem]">
      {channels.map((channel) => {
        const Icon = CHANNEL_ICONS[channel.channel] ?? BellRing
        return (
          <SectionCard
            key={channel.channel}
            title={
              <span className="flex items-center gap-2">
                <Icon className="size-4" aria-hidden="true" />
                {CHANNEL_LABELS[channel.channel] ?? channel.channel}
              </span>
            }
            description={channel.verificationDetail}
            action={
              <Switch
                label={`Enable ${CHANNEL_LABELS[channel.channel] ?? channel.channel}`}
                checked={channel.enabled}
                disabled={!channel.available || update.isPending}
                onCheckedChange={(next) => void toggleChannel(channel.channel, next)}
              />
            }
          >
            {!channel.available ? (
              <Alert tone="neutral" title="Not available on this deployment">
                This channel has no sender configured yet, so it cannot be enabled.
              </Alert>
            ) : null}

            <DescriptionList>
              <DescriptionRow
                label="Status"
                value={
                  <Badge tone={channel.enabled ? 'success' : 'neutral'}>
                    {channel.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                }
              />
              {Object.entries(channel.settings)
                .filter(([, value]) => Boolean(value))
                .map(([key, value]) => (
                  <DescriptionRow key={key} label={humanizeSetting(key)} value={value ?? '—'} />
                ))}
            </DescriptionList>

            {channel.platformNotes.length > 0 ? (
              <div className="mt-[0.8rem] flex flex-col gap-[0.35rem]">
                {channel.platformNotes.map((note, index) => (
                  <Note key={index}>{note}</Note>
                ))}
              </div>
            ) : null}
          </SectionCard>
        )
      })}

      <SectionCard
        title="Branding and sender identity"
        description="Used in every email you send; platform security messages always keep platform branding."
      >
        <FormGrid>
          <Field label="Sender display name" htmlFor="notification-display-name">
            <Input
              id="notification-display-name"
              value={draft.displayName}
              onChange={(event) => setForm({ ...draft, displayName: event.target.value })}
            />
          </Field>
          <Field label="Reply-to email" htmlFor="notification-reply-to" hint="Replies are routed here.">
            <Input
              id="notification-reply-to"
              type="email"
              value={draft.replyTo}
              onChange={(event) => setForm({ ...draft, replyTo: event.target.value })}
            />
          </Field>
          <Field label="Business contact email" htmlFor="notification-contact-email">
            <Input
              id="notification-contact-email"
              type="email"
              value={draft.contactEmail}
              onChange={(event) => setForm({ ...draft, contactEmail: event.target.value })}
            />
          </Field>
          <Field
            label="Brand colour"
            htmlFor="notification-brand-colour"
            hint="Hex value, e.g. #2563EB."
          >
            <Input
              id="notification-brand-colour"
              value={draft.primaryColor}
              onChange={(event) => setForm({ ...draft, primaryColor: event.target.value })}
            />
          </Field>
          <div className="col-span-full">
            <Field label="Email footer" htmlFor="notification-footer">
              <Textarea
                id="notification-footer"
                rows={3}
                value={draft.footerNote}
                onChange={(event) => setForm({ ...draft, footerNote: event.target.value })}
              />
            </Field>
          </div>
        </FormGrid>

        {formError ? (
          <Alert tone="danger" className="mt-[0.9rem]" title="Your changes were not saved">
            {formError}
          </Alert>
        ) : null}

        <div className="mt-[0.9rem] flex justify-end">
          <Button variant="primary" disabled={update.isPending} onClick={() => void saveProfile()}>
            {update.isPending ? 'Saving…' : 'Save branding'}
          </Button>
        </div>
      </SectionCard>
    </div>
  )
}

/**
 * Notification automation.
 *
 * Reuses the existing automation module rather than introducing a second engine:
 * rules, their triggers and their enable state all live in `automation_rules`
 * and are evaluated by the platform's automation evaluator.
 */
function AutomationTab() {
  const query = useBusinessAutomationRules()
  const toggle = useToggleBusinessAutomationRule()
  const rules = query.data ?? []

  if (query.isError) {
    return (
      <Alert tone="danger" title="We could not load your automation rules">
        {errorMessage(query.error, 'Try again in a moment.')}
      </Alert>
    )
  }

  if (query.isPending) return <Skeleton className="h-40 rounded-card" />

  if (rules.length === 0) {
    return (
      <EmptyState
        icon={<Workflow className="size-5" />}
        title="No notification automations yet"
        description="Automations such as booking reminders and follow-ups appear here once configured for your business."
      />
    )
  }

  return (
    <SectionCard
      title="Notification automations"
      description="Reminders, confirmations and follow-ups that run automatically. Timing and conditions are managed by the automation engine."
    >
      <DescriptionList>
        {rules.map((rule) => {
          const recipients = parseRecipients(rule.recipientsJson)
          return (
            <DescriptionRow
              key={rule.id}
              label={rule.name}
              description={`${humanizeSetting(rule.trigger)} · ${describeCaps(rule)}${recipients ? ` · ${recipients}` : ''}`}
              value={
                <Switch
                  label={`Enable ${rule.name}`}
                  checked={rule.enabled}
                  disabled={toggle.isPending}
                  onCheckedChange={(next) =>
                    void toggle
                      .mutateAsync({ id: rule.id, enable: next })
                      .then(() => toast.success(`${rule.name} ${next ? 'enabled' : 'disabled'}.`))
                      .catch((error: unknown) =>
                        toast.error(errorMessage(error, 'The rule could not be updated.')),
                      )
                  }
                />
              }
            />
          )
        })}
      </DescriptionList>
    </SectionCard>
  )
}

function describeCaps(rule: { dailyActionCap: number | null; frequencyCapMinutes: number | null }): string {
  const parts: string[] = []
  if (rule.dailyActionCap) parts.push(`max ${rule.dailyActionCap}/day`)
  if (rule.frequencyCapMinutes) parts.push(`min ${rule.frequencyCapMinutes}min apart`)
  return parts.length > 0 ? parts.join(' · ') : 'no caps'
}

function parseRecipients(json: string): string {
  try {
    const parsed = JSON.parse(json) as { category?: string }[]
    if (!Array.isArray(parsed)) return ''
    return parsed.map((entry) => humanizeSetting(entry.category ?? '')).filter(Boolean).join(', ')
  } catch {
    return ''
  }
}

