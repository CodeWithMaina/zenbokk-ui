import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { errorMessage } from '../../lib/api/client'
import { queryKeys } from '../../lib/api/query-client'
import { useAuth } from '../../lib/auth'
import { authApi } from '../../lib/auth/api'
import { useDashboardContext } from '../../lib/dashboard/dashboard-context'
import { mediaApi, MEDIA_LIMITS, MEDIA_PURPOSE, useResolvedImage } from '../../lib/media'
import { roleLabel, useSettingsModules } from '../../lib/settings'
import { Alert } from '../ui/alert'
import { Avatar } from '../ui/avatar'
import { StatusPill } from '../ui/badge'
import { SectionCard } from '../ui/card'
import { EntityHeader } from '../ui/page-header'
import { Field, FormGrid, FormGridFull, Input } from '../ui/field'
import { SaveBar } from '../ui/save-bar'
import { PermissionSummary } from './PermissionSummary'
import { SettingsMediaUploader } from './SettingsMediaUploader'

const NAME_MAX = 100

/** `Elena Njeri` → `{ first: 'Elena', last: 'Njeri' }`; the tail keeps its spacing. */
function splitName(fullName: string | null | undefined): { first: string; last: string } {
  const trimmed = (fullName ?? '').trim()
  if (!trimmed) return { first: '', last: '' }
  const spaceAt = trimmed.indexOf(' ')
  if (spaceAt === -1) return { first: trimmed, last: '' }
  return { first: trimmed.slice(0, spaceAt), last: trimmed.slice(spaceAt + 1) }
}


export function ProfileSettings({
  onDirtyChange,
}: {
  /** Reports whether this section has unsaved edits (used by the route guard). */
  onDirtyChange?: (dirty: boolean) => void
} = {}) {
  const { user, refreshProfile } = useAuth()
  const { role, permissions, entitlements } = useDashboardContext()
  const modulesQuery = useSettingsModules()
  const queryClient = useQueryClient()

  const snapshot = useMemo(() => splitName(user?.fullName), [user?.fullName])
  const snapshotPhone = user?.phone ?? ''

  const [firstName, setFirstName] = useState(snapshot.first)
  const [lastName, setLastName] = useState(snapshot.last)
  const [phone, setPhone] = useState(snapshotPhone)
  const [formError, setFormError] = useState<string | null>(null)

  const trimmedFirst = firstName.trim()
  const trimmedLast = lastName.trim()
  const trimmedPhone = phone.trim()

  const dirty =
    trimmedFirst !== snapshot.first ||
    trimmedLast !== snapshot.last ||
    trimmedPhone !== snapshotPhone

  // Let the route know whether leaving this section would lose work.
  useEffect(() => {
    onDirtyChange?.(dirty)
    return () => onDirtyChange?.(false)
  }, [dirty, onDirtyChange])

  const save = useMutation({
    mutationFn: () =>
      authApi.updateProfile({
        fullName: [trimmedFirst, trimmedLast].filter(Boolean).join(' '),
        phoneNumber: trimmedPhone || null,
      }),
    onSuccess: async () => {
      await refreshProfile()
      setFormError(null)
      toast.success('Profile updated.')
    },
    onError: (error) => setFormError(errorMessage(error)),
  })

  const handleSave = () => {
    if (!trimmedFirst) {
      setFormError('Enter your first name.')
      return
    }
    if (`${trimmedFirst} ${trimmedLast}`.trim().length > NAME_MAX) {
      setFormError(`Your name must be ${NAME_MAX} characters or fewer.`)
      return
    }
    setFormError(null)
    save.mutate()
  }

  const handleDiscard = () => {
    setFirstName(snapshot.first)
    setLastName(snapshot.last)
    setPhone(snapshotPhone)
    setFormError(null)
  }

  const assignAvatar = async (mediaId: string) => {
    await mediaApi.assignAvatar(mediaId)
    await refreshProfile()
    void queryClient.invalidateQueries({ queryKey: queryKeys.media(mediaId) })
    toast.success('Profile photo updated.')
  }

  const clearAvatar = async () => {
    await mediaApi.clearAvatar()
    await refreshProfile()
    toast.success('Profile photo removed.')
  }


  const displayName = [snapshot.first, snapshot.last].filter(Boolean).join(' ') || 'Your profile'

  const avatar = useResolvedImage({
    mediaId: user?.avatarMediaId,
    url: user?.avatarUrl,
  })

  return (
    <div className="flex flex-col gap-[1rem]">
      <EntityHeader
        avatar={<Avatar name={displayName} src={avatar.src ?? undefined} size="xl" />}
        title={displayName}
        meta={
          <>
            <StatusPill tone="success">{roleLabel(role)}</StatusPill>
            <span className="min-w-0 break-all">{user?.email}</span>
          </>
        }
        actions={
          <SettingsMediaUploader
            purpose={MEDIA_PURPOSE.userAvatar}
            mediaId={user?.avatarMediaId}
            url={user?.avatarUrl}
            shape="circle"
            showPreview={false}
            maxBytes={MEDIA_LIMITS.userAvatarMaxBytes}
            uploadLabel="Change photo"
            inputLabel="Upload a profile photo"
            fallbackName={displayName}
            onUploaded={assignAvatar}
            onRemoved={clearAvatar}
          />
        }
      />

      <div className="grid gap-[1rem] md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <SectionCard title="Personal details" description="How you appear to your team.">
          <FormGrid>
            <Field label="First name" htmlFor="settings-first-name">
              <Input
                id="settings-first-name"
                value={firstName}
                maxLength={NAME_MAX}
                autoComplete="given-name"
                disabled={save.isPending}
                onChange={(event) => setFirstName(event.target.value)}
              />
            </Field>
            <Field label="Last name" htmlFor="settings-last-name">
              <Input
                id="settings-last-name"
                value={lastName}
                maxLength={NAME_MAX}
                autoComplete="family-name"
                disabled={save.isPending}
                onChange={(event) => setLastName(event.target.value)}
              />
            </Field>
            <FormGridFull>
              <Field
                label="Email"
                htmlFor="settings-email"
                hint="This is the email you sign in with. Contact support to change it."
              >
                <Input id="settings-email" type="email" value={user?.email ?? ''} readOnly />
              </Field>
            </FormGridFull>
            <FormGridFull>
              <Field label="Phone number" optional htmlFor="settings-phone">
                <Input
                  id="settings-phone"
                  type="tel"
                  value={phone}
                  placeholder="+254 7XX XXX XXX"
                  autoComplete="tel"
                  disabled={save.isPending}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </Field>
            </FormGridFull>
          </FormGrid>

          {formError ? (
            <Alert tone="danger" className="mt-[0.9rem]">
              {formError}
            </Alert>
          ) : null}
        </SectionCard>

        <PermissionSummary
          permissions={permissions}
          modules={modulesQuery.data?.modules ?? []}
          accessibleModules={entitlements}
          role={role}
          loading={modulesQuery.isPending}
        />
      </div>

      <SaveBar
        dirty={dirty}
        saving={save.isPending}
        message="You have unsaved profile changes."
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </div>
  )
}
