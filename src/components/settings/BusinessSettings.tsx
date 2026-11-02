import { Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { errorMessage } from '../../lib/api/client'
import { queryKeys } from '../../lib/api/query-client'
import type { BusinessModuleDetail, BusinessResponse, CallerPlanInfo } from '../../lib/api/types'
import { useDashboardContext } from '../../lib/dashboard/dashboard-context'
import { MEDIA_LIMITS, MEDIA_PURPOSE, mediaApi } from '../../lib/media'
import { useNotificationPreferences } from '../../lib/notifications'
import {
  REMINDER_OFFSET_OPTIONS,
  channelLabel,
  useSettingsBusiness,
  useSettingsModules,
  useUpdateBusiness,
  useUpdateDailyGoal,
  useUpdateReminderPolicy,
  useUpdateSlug,
} from '../../lib/settings'
import { getRootDomain } from '../../lib/tenant'
import { Alert } from '../ui/alert'
import { StatusPill } from '../ui/badge'
import { Button } from '../ui/button'
import { SectionCard } from '../ui/card'
import { ConfirmDialog } from '../ui/confirm-dialog'
import {
  Field,
  FieldHint,
  FormGrid,
  FormGridFull,
  Input,
  InputWithPrefix,
  Select,
  Textarea,
} from '../ui/field'
import { SaveBar } from '../ui/save-bar'
import { Skeleton } from '../ui/skeleton'
import { Switch } from '../ui/switch'
import { SettingsMediaUploader } from './SettingsMediaUploader'
import { SubscriptionSummary } from './SubscriptionSummary'

const GOAL_MIN = 1
const GOAL_MAX = 1000
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

type BusinessDraft = {
  name: string
  category: string
  location: string
  phoneNumber: string
  email: string
  description: string
  goalType: string
  stampGoal: string
  appointmentGoal: string
  reminderEnabled: boolean
  reminderOffset: string
  reminderChannel: string
}

/** A number input's value, or null when it is empty/invalid. */
function goalValue(value: string): number | null {
  const parsed = Number(value.trim())
  if (!Number.isInteger(parsed) || parsed < GOAL_MIN || parsed > GOAL_MAX) return null
  return parsed
}

function draftFrom(business: BusinessResponse): BusinessDraft {
  const policy = business.reminderPolicy
  return {
    name: business.name,
    category: business.category ?? '',
    location: business.location ?? '',
    phoneNumber: business.phoneNumber ?? '',
    email: business.email ?? '',
    description: business.description ?? '',
    goalType: business.dailyGoalType === 'appointments' ? 'appointments' : 'stamps',
    stampGoal: business.defaultDailyGoal != null ? String(business.defaultDailyGoal) : '',
    appointmentGoal:
      business.defaultAppointmentDailyGoal != null
        ? String(business.defaultAppointmentDailyGoal)
        : '',
    reminderEnabled: policy?.enabled ?? true,
    reminderOffset: policy?.offsetMinutes?.[0] != null ? String(policy.offsetMinutes[0]) : '',
    reminderChannel: policy?.channels?.[0] ?? '',
  }
}

type BusinessSettingsFormProps = {
  business: BusinessResponse
  modules: BusinessModuleDetail[]
  plan: CallerPlanInfo | null
  modulesLoading: boolean
  onOpenSupport: () => void
  /** Reports whether this section has unsaved edits (used by the route guard). */
  onDirtyChange?: (dirty: boolean) => void
}

function BusinessSettingsSkeleton() {
  return (
    <div
      className="grid gap-[1rem] md:grid-cols-2"
      aria-busy="true"
      aria-label="Loading business settings"
    >
      {[0, 1].map((column) => (
        <SectionCard key={column}>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-3 h-10 w-full" />
          <Skeleton className="mt-3 h-10 w-full" />
          <Skeleton className="mt-3 h-20 w-full" />
        </SectionCard>
      ))}
    </div>
  )
}

/**
 * Business settings, resolved from the owner's own business — never from a
 * client-supplied id. The read is the full `BusinessResponse` (profile +
 * reminder policy + daily-goal config), and each Save only dispatches the
 * endpoints whose values actually changed.
 */
export function BusinessSettings({
  onOpenSupport,
  onDirtyChange,
}: {
  onOpenSupport: () => void
  onDirtyChange?: (dirty: boolean) => void
}) {
  const businessQuery = useSettingsBusiness()
  const modulesQuery = useSettingsModules()
  const contextPlan = useDashboardContext().plan

  if (businessQuery.isPending) return <BusinessSettingsSkeleton />

  if (businessQuery.isError || !businessQuery.data) {
    return (
      <Alert tone="danger" title="We could not load your business settings">
        {errorMessage(businessQuery.error, 'Try again in a moment.')}
      </Alert>
    )
  }

  return (
    <BusinessSettingsForm
      business={businessQuery.data}
      modules={modulesQuery.data?.modules ?? []}
      plan={modulesQuery.data?.plan ?? contextPlan}
      modulesLoading={modulesQuery.isPending}
      onOpenSupport={onOpenSupport}
      onDirtyChange={onDirtyChange}
    />
  )
}

function BusinessSettingsForm({
  business,
  modules,
  plan,
  modulesLoading,
  onOpenSupport,
  onDirtyChange,
}: BusinessSettingsFormProps) {
  const queryClient = useQueryClient()
  const updateBusiness = useUpdateBusiness()
  const updateSlug = useUpdateSlug()
  const updateDailyGoal = useUpdateDailyGoal()
  const updateReminderPolicy = useUpdateReminderPolicy()
  const preferences = useNotificationPreferences(business.id)

  const snapshot = useMemo(() => draftFrom(business), [business])
  const [draft, setDraft] = useState<BusinessDraft>(snapshot)
  const [formError, setFormError] = useState<string | null>(null)
  const [slug, setSlug] = useState(business.slug ?? '')
  const [slugError, setSlugError] = useState<string | null>(null)
  const [confirmSlug, setConfirmSlug] = useState(false)

  // Channels this deployment can actually deliver on, taken from the resolved
  // notification matrix. A channel with no sender is never offered as a choice.
  const availableChannels = useMemo(() => {
    const seen = new Set<string>()
    const channels: string[] = []
    for (const preference of preferences.data ?? []) {
      if (preference.available && !seen.has(preference.channel)) {
        seen.add(preference.channel)
        channels.push(preference.channel)
      }
    }
    return channels
  }, [preferences.data])

  // Channels this deployment cannot deliver on — surfaced so the owner is told
  // *why* the option is missing rather than being silently offered less.
  const unavailableChannels: string[] = []
  for (const preference of preferences.data ?? []) {
    if (!preference.available && !unavailableChannels.includes(preference.channel)) {
      unavailableChannels.push(preference.channel)
    }
  }

  const setField = <K extends keyof BusinessDraft,>(key: K, value: BusinessDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const profileChanged =
    draft.name.trim() !== snapshot.name ||
    draft.category.trim() !== snapshot.category ||
    draft.location.trim() !== snapshot.location ||
    draft.phoneNumber.trim() !== snapshot.phoneNumber ||
    draft.email.trim() !== snapshot.email ||
    draft.description.trim() !== snapshot.description

  const goalChanged =
    draft.goalType !== snapshot.goalType ||
    draft.stampGoal !== snapshot.stampGoal ||
    draft.appointmentGoal !== snapshot.appointmentGoal

  const reminderChanged =
    draft.reminderEnabled !== snapshot.reminderEnabled ||
    draft.reminderOffset !== snapshot.reminderOffset ||
    draft.reminderChannel !== snapshot.reminderChannel

  const dirty = profileChanged || goalChanged || reminderChanged
  const saving =
    updateBusiness.isPending || updateDailyGoal.isPending || updateReminderPolicy.isPending

  // Let the route know whether leaving this section would lose work.
  useEffect(() => {
    onDirtyChange?.(dirty)
    return () => onDirtyChange?.(false)
  }, [dirty, onDirtyChange])

  const activeGoal = draft.goalType === 'appointments' ? draft.appointmentGoal : draft.stampGoal
  const setActiveGoal = (value: string) =>
    setField(draft.goalType === 'appointments' ? 'appointmentGoal' : 'stampGoal', value)

  const rootDomain = getRootDomain()
  const reminderTimingMissing = !draft.reminderOffset
  const reminderChannelMissing = !draft.reminderChannel
  const channelInList =
    draft.reminderChannel === '' || availableChannels.includes(draft.reminderChannel)

  const refreshBusiness = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.settingsBusiness() })
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() })
  }

  const handleSave = async () => {
    setFormError(null)

    if (!draft.name.trim()) {
      setFormError('Enter your business name.')
      return
    }
    if (draft.stampGoal.trim() !== '' && goalValue(draft.stampGoal) === null) {
      setFormError(`The stamp target must be between ${GOAL_MIN} and ${GOAL_MAX}.`)
      return
    }
    if (draft.appointmentGoal.trim() !== '' && goalValue(draft.appointmentGoal) === null) {
      setFormError(`The appointment target must be between ${GOAL_MIN} and ${GOAL_MAX}.`)
      return
    }

    try {
      if (profileChanged) {
        await updateBusiness.mutateAsync({
          name: draft.name.trim(),
          category: draft.category.trim(),
          location: draft.location.trim(),
          phoneNumber: draft.phoneNumber.trim(),
          email: draft.email.trim(),
          description: draft.description.trim(),
        })
      }

      if (goalChanged) {
        // Both targets are always sent: the endpoint clears an omitted stamp
        // goal, so sending only the metric the owner edited would wipe the other.
        await updateDailyGoal.mutateAsync({
          dailyGoalType: draft.goalType,
          dailyGoal: goalValue(draft.stampGoal),
          appointmentDailyGoal: goalValue(draft.appointmentGoal),
        })
      }

      if (reminderChanged) {
        await updateReminderPolicy.mutateAsync({
          enabled: draft.reminderEnabled,
          offsetMinutes: draft.reminderOffset ? [Number(draft.reminderOffset)] : [],
          channels: draft.reminderChannel ? [draft.reminderChannel] : [],
        })
      }

      toast.success('Business settings saved.')
    } catch (error) {
      setFormError(errorMessage(error))
    }
  }

  const handleDiscard = () => {
    setDraft(snapshot)
    setFormError(null)
  }

  const requestSlugChange = () => {
    const next = slug.trim().toLowerCase()
    if (!SLUG_PATTERN.test(next)) {
      setSlugError('Use lowercase letters, numbers and single hyphens.')
      return
    }
    setSlugError(null)
    setConfirmSlug(true)
  }

  const changeSlug = async () => {
    try {
      await updateSlug.mutateAsync(slug.trim().toLowerCase())
      setConfirmSlug(false)
      toast.success('Storefront address updated.')
    } catch (error) {
      setSlugError(errorMessage(error))
      setConfirmSlug(false)
    }
  }

  const assignLogo = async (mediaId: string) => {
    await mediaApi.assignLogo(mediaId)
    await refreshBusiness()
    toast.success('Logo updated.')
  }

  const clearLogo = async () => {
    await mediaApi.clearLogo()
    await refreshBusiness()
    toast.success('Logo removed.')
  }

  const assignCover = async (mediaId: string) => {
    await mediaApi.assignCover(mediaId)
    await refreshBusiness()
    toast.success('Cover image updated.')
  }

  const clearCover = async () => {
    await mediaApi.clearCover()
    await refreshBusiness()
    toast.success('Cover image removed.')
  }

  return (
    <div className="flex flex-col gap-[1rem]">
      <div className="grid gap-[1rem] md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-[1rem]">
          <SectionCard
            title="Business details"
            description="Shown on your storefront and customer cards."
          >
            <FormGrid>
              <Field label="Business name" htmlFor="biz-name">
                <Input
                  id="biz-name"
                  value={draft.name}
                  maxLength={100}
                  disabled={saving}
                  onChange={(event) => setField('name', event.target.value)}
                />
              </Field>
              <Field label="Category" htmlFor="biz-category">
                <Input
                  id="biz-category"
                  value={draft.category}
                  maxLength={50}
                  disabled={saving}
                  onChange={(event) => setField('category', event.target.value)}
                />
              </Field>
              <FormGridFull>
                <Field label="Location" htmlFor="biz-location">
                  <Input
                    id="biz-location"
                    value={draft.location}
                    maxLength={100}
                    disabled={saving}
                    onChange={(event) => setField('location', event.target.value)}
                  />
                </Field>
              </FormGridFull>
              <Field label="Phone number" htmlFor="biz-phone">
                <Input
                  id="biz-phone"
                  type="tel"
                  value={draft.phoneNumber}
                  maxLength={20}
                  disabled={saving}
                  onChange={(event) => setField('phoneNumber', event.target.value)}
                />
              </Field>
              <Field label="Email" htmlFor="biz-email">
                <Input
                  id="biz-email"
                  type="email"
                  value={draft.email}
                  maxLength={255}
                  disabled={saving}
                  onChange={(event) => setField('email', event.target.value)}
                />
              </Field>
              <FormGridFull>
                <Field
                  label="Storefront link"
                  htmlFor="biz-slug"
                  hint="Changing this breaks links you have already shared."
                  error={slugError ?? undefined}
                >
                  <div className="flex flex-wrap items-center gap-[0.6rem]">
                    <div className="min-w-[12rem] flex-1">
                      <InputWithPrefix
                        prefix={`${rootDomain}/`}
                        id="biz-slug"
                        value={slug}
                        disabled={saving || updateSlug.isPending}
                        onChange={(event) => setSlug(event.target.value)}
                      />
                    </div>
                    <Button
                      onClick={requestSlugChange}
                      disabled={
                        updateSlug.isPending ||
                        slug.trim().toLowerCase() === (business.slug ?? '')
                      }
                    >
                      {updateSlug.isPending ? 'Updating…' : 'Change address'}
                    </Button>
                  </div>
                </Field>
              </FormGridFull>
              <FormGridFull>
                <Field label="Description" htmlFor="biz-description">
                  <Textarea
                    id="biz-description"
                    value={draft.description}
                    maxLength={500}
                    disabled={saving}
                    onChange={(event) => setField('description', event.target.value)}
                  />
                </Field>
              </FormGridFull>
            </FormGrid>

            {business.slug ? (
              <div className="mt-[0.9rem] flex flex-wrap items-center gap-2">
                <StatusPill tone="neutral">/{business.slug}</StatusPill>
                <Link
                  to="/$slug"
                  params={{ slug: business.slug }}
                  className="link inline-flex items-center gap-1"
                >
                  Open storefront
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard
            title="Logo and cover"
            description="Your logo appears on loyalty cards and your storefront."
          >
            <SettingsMediaUploader
              purpose={MEDIA_PURPOSE.businessLogo}
              mediaId={business.logoMediaId}
              url={business.logoUrl}
              shape="square"
              uploadLabel="Upload logo"
              inputLabel="Upload a business logo"
              fallbackName={business.name}
              maxBytes={MEDIA_LIMITS.businessLogoMaxBytes}
              hint="PNG, JPG or WebP, up to 5 MB. At least 400 × 400 px reads best."
              onUploaded={assignLogo}
              onRemoved={clearLogo}
            />
            <div className="mt-[1.2rem] border-t border-line pt-[1.2rem]">
              <SettingsMediaUploader
                purpose={MEDIA_PURPOSE.businessCover}
                mediaId={business.coverMediaId}
                shape="cover"
                uploadLabel="Upload cover"
                inputLabel="Upload a cover image"
                maxBytes={MEDIA_LIMITS.businessCoverMaxBytes}
                hint="A wide image shown at the top of your storefront, up to 10 MB."
                onUploaded={assignCover}
                onRemoved={clearCover}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Daily goal"
            description="A target your team sees on the dashboard each day."
          >
            <FormGrid>
              <Field label="Count by" htmlFor="biz-goal-type">
                <Select
                  id="biz-goal-type"
                  value={draft.goalType}
                  disabled={saving}
                  onChange={(event) => setField('goalType', event.target.value)}
                >
                  <option value="stamps">Stamps</option>
                  <option value="appointments">Appointments</option>
                </Select>
              </Field>
              <Field
                label="Daily target"
                htmlFor="biz-goal-value"
                hint={`Between ${GOAL_MIN} and ${GOAL_MAX}. Leave empty to clear it.`}
              >
                <Input
                  id="biz-goal-value"
                  type="number"
                  min={GOAL_MIN}
                  max={GOAL_MAX}
                  inputMode="numeric"
                  value={activeGoal}
                  placeholder="Not set"
                  disabled={saving}
                  onChange={(event) => setActiveGoal(event.target.value)}
                />
              </Field>
            </FormGrid>
          </SectionCard>
        </div>

        <div className="flex flex-col gap-[1rem]">
          <SubscriptionSummary
            plan={plan}
            modules={modules}
            loading={modulesLoading}
            onUpgrade={onOpenSupport}
          />

          <SectionCard
            title="Appointment reminders"
            description="Remind customers before their booking."
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold">Send reminders</p>
                <p className="mt-[0.1rem] text-meta text-muted">For all upcoming appointments</p>
              </div>
              <Switch
                checked={draft.reminderEnabled}
                onCheckedChange={(next) => setField('reminderEnabled', next)}
                label="Send appointment reminders"
                disabled={saving}
              />
            </div>

            <FormGrid className="mt-[1rem]">
              <FormGridFull>
                <Field
                  label="Send"
                  htmlFor="biz-reminder-offset"
                  hint={
                    reminderTimingMissing
                      ? 'No timing is set, so reminders will not go out yet.'
                      : undefined
                  }
                >
                  <Select
                    id="biz-reminder-offset"
                    value={draft.reminderOffset}
                    disabled={saving || !draft.reminderEnabled}
                    onChange={(event) => setField('reminderOffset', event.target.value)}
                  >
                    <option value="">Choose a time</option>
                    {REMINDER_OFFSET_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </FormGridFull>
              <FormGridFull>
                <Field
                  label="Channel"
                  htmlFor="biz-reminder-channel"
                  hint={
                    reminderChannelMissing
                      ? 'No channel is set, so reminders will not go out yet.'
                      : undefined
                  }
                >
                  <Select
                    id="biz-reminder-channel"
                    value={draft.reminderChannel}
                    disabled={saving || !draft.reminderEnabled || availableChannels.length === 0}
                    onChange={(event) => setField('reminderChannel', event.target.value)}
                  >
                    <option value="">Choose a channel</option>
                    {availableChannels.map((channel) => (
                      <option key={channel} value={channel}>
                        {channelLabel(channel)}
                      </option>
                    ))}
                    {!channelInList ? (
                      <option value={draft.reminderChannel}>
                        {channelLabel(draft.reminderChannel)} (currently unavailable)
                      </option>
                    ) : null}
                  </Select>
                </Field>
              </FormGridFull>
            </FormGrid>

            {preferences.isPending ? (
              <FieldHint>Checking which channels are available…</FieldHint>
            ) : availableChannels.length === 0 ? (
              <FieldHint>
                No delivery channel is available in this environment, so reminders cannot be sent
                yet.
              </FieldHint>
            ) : (
              <>
                {availableChannels.length === 1 ? (
                  <FieldHint>
                    {channelLabel(availableChannels[0])} is the only channel available today.
                  </FieldHint>
                ) : null}
                {unavailableChannels.length > 0 ? (
                  <FieldHint>
                    {unavailableChannels.map(channelLabel).join(', ')}{' '}
                    {unavailableChannels.length === 1 ? 'is' : 'are'} not available yet.
                  </FieldHint>
                ) : null}
              </>
            )}
          </SectionCard>
        </div>
      </div>

      {formError ? (
        <Alert tone="danger" title="Your changes were not saved">
          {formError}
        </Alert>
      ) : null}

      <SaveBar
        dirty={dirty}
        saving={saving}
        message="You have unsaved business changes."
        onSave={() => void handleSave()}
        onDiscard={handleDiscard}
      />

      <ConfirmDialog
        open={confirmSlug}
        title="Change your storefront address?"
        description={`Your storefront will move from /${business.slug ?? ''} to /${slug
          .trim()
          .toLowerCase()}. Old links, QR codes and saved bookmarks will stop resolving to your page.`}
        confirmLabel={updateSlug.isPending ? 'Updating…' : 'Change address'}
        onConfirm={() => void changeSlug()}
        onCancel={() => setConfirmSlug(false)}
      />
    </div>
  )
}





