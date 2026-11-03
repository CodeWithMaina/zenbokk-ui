import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { errorMessage } from '../../lib/api/client'
import type { StaffDetail } from '../../lib/api/types'
import { useStaffMutations, useStaffPositions } from '../../lib/staff'
import { staffProfileSchema } from '../../lib/validation/staff'
import { MEDIA_LIMITS, MEDIA_PURPOSE } from '../../lib/media'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { Drawer } from '../ui/drawer'
import { Field, FormGrid, FormGridFull, Input, Select, Textarea } from '../ui/field'
import { SettingsMediaUploader } from '../settings/SettingsMediaUploader'

export type StaffProfileDrawerProps = {
  open: boolean
  onClose: () => void
  detail: StaffDetail
}

/**
 * The member's employment details.
 *
 * A PATCH is sent with only the fields that changed, so two screens editing
 * different parts of the same profile cannot overwrite each other. Email is
 * shown read-only: it is the sign-in identity, and the platform changes it only
 * through the account-verification flow.
 */
export function StaffProfileDrawer({ open, onClose, detail }: StaffProfileDrawerProps) {
  const positions = useStaffPositions(open)
  const { update } = useStaffMutations()

  const [fullName, setFullName] = useState(detail.fullName)
  const [phone, setPhone] = useState(detail.phoneNumber ?? '')
  const [positionId, setPositionId] = useState(detail.positionId ?? '')
  const [bio, setBio] = useState(detail.bio ?? '')
  const [specialities, setSpecialities] = useState(detail.specialities ?? '')
  const [experience, setExperience] = useState(
    detail.yearsOfExperience === null ? '' : String(detail.yearsOfExperience),
  )
  const [goal, setGoal] = useState(detail.dailyGoalOverride ? String(detail.dailyGoalOverride) : '')
  const [appointmentGoal, setAppointmentGoal] = useState(
    detail.appointmentDailyGoalOverride ? String(detail.appointmentDailyGoalOverride) : '',
  )
  const [error, setError] = useState<string | null>(null)

  // A different member (or a fresh open) starts from that member's values.
  useEffect(() => {
    if (!open) return
    setFullName(detail.fullName)
    setPhone(detail.phoneNumber ?? '')
    setPositionId(detail.positionId ?? '')
    setBio(detail.bio ?? '')
    setSpecialities(detail.specialities ?? '')
    setExperience(detail.yearsOfExperience === null ? '' : String(detail.yearsOfExperience))
    setGoal(detail.dailyGoalOverride ? String(detail.dailyGoalOverride) : '')
    setAppointmentGoal(
      detail.appointmentDailyGoalOverride ? String(detail.appointmentDailyGoalOverride) : '',
    )
    setError(null)
  }, [detail, open])

  const submit = () => {
    const parsed = staffProfileSchema.safeParse({
      fullName,
      phoneNumber: phone,
      bio,
      specialities,
      yearsOfExperience: experience === '' ? null : Number(experience),
      positionId,
      dailyGoalOverride: goal === '' ? null : Number(goal),
      appointmentDailyGoalOverride: appointmentGoal === '' ? null : Number(appointmentGoal),
    })

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the highlighted fields.')
      return
    }

    const values = parsed.data

    // Only what changed travels: an untouched field must never be rewritten.
    const payload: Parameters<typeof update.mutate>[0]['payload'] = {}
    if (values.fullName !== detail.fullName) payload.fullName = values.fullName
    if ((values.phoneNumber ?? '') !== (detail.phoneNumber ?? '')) {
      payload.phoneNumber = values.phoneNumber ?? ''
    }
    if ((values.bio ?? '') !== (detail.bio ?? '')) payload.bio = values.bio ?? ''
    if ((values.specialities ?? '') !== (detail.specialities ?? '')) {
      payload.specialities = values.specialities ?? ''
    }

    // Experience is nullable, so "clear" is an explicit instruction: omitting
    // the field must never erase a value the business stated.
    const experienceValue = values.yearsOfExperience ?? null
    if (experienceValue !== detail.yearsOfExperience) {
      if (experienceValue === null) payload.clearYearsOfExperience = true
      else payload.yearsOfExperience = experienceValue
    }
    if ((values.positionId ?? '') !== (detail.positionId ?? '')) {
      if (values.positionId) payload.positionId = values.positionId
      else payload.clearPosition = true
    }

    const goalValue = values.dailyGoalOverride ?? null
    if (goalValue !== detail.dailyGoalOverride) {
      if (goalValue === null) payload.clearDailyGoalOverride = true
      else payload.dailyGoalOverride = goalValue
    }

    const appointmentGoalValue = values.appointmentDailyGoalOverride ?? null
    if (appointmentGoalValue !== detail.appointmentDailyGoalOverride) {
      if (appointmentGoalValue === null) payload.clearAppointmentDailyGoalOverride = true
      else payload.appointmentDailyGoalOverride = appointmentGoalValue
    }

    if (Object.keys(payload).length === 0) {
      toast('Nothing changed.')
      onClose()
      return
    }

    setError(null)
    update.mutate(
      { staffId: detail.userId, payload },
      {
        onSuccess: () => {
          toast.success('Profile saved.')
          onClose()
        },
        onError: (mutationError) => setError(errorMessage(mutationError)),
      },
    )
  }

  const assignPhoto = async (mediaId: string) => {
    await update.mutateAsync({ staffId: detail.userId, payload: { avatarMediaId: mediaId } })
    toast.success('Profile photo updated.')
  }

  const selectablePositions = (positions.data ?? []).filter(
    (position) => position.isActive || position.id === detail.positionId,
  )

  const saving = update.isPending

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={detail.fullName}
      description="Employment details, job title and goals."
      footer={
        <div className="flex w-full justify-end gap-[0.5rem]">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      }
    >
      <div className="space-y-[1rem]">
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <SettingsMediaUploader
          purpose={MEDIA_PURPOSE.userAvatar}
          mediaId={detail.avatarMediaId}
          url={detail.avatarUrl}
          shape="circle"
          maxBytes={MEDIA_LIMITS.userAvatarMaxBytes}
          uploadLabel="Change photo"
          inputLabel="Upload a profile photo"
          fallbackName={detail.fullName}
          disabled={saving}
          hint="A square photo works best. It appears on their profile and in the roster."
          onUploaded={assignPhoto}
        />

        <FormGrid>
          <FormGridFull>
            <Field label="Full name" htmlFor="staff-name">
              <Input
                id="staff-name"
                value={fullName}
                maxLength={100}
                disabled={saving}
                onChange={(event) => setFullName(event.target.value)}
              />
            </Field>
          </FormGridFull>

          <Field label="Phone number" optional htmlFor="staff-phone">
            <Input
              id="staff-phone"
              type="tel"
              value={phone}
              maxLength={20}
              placeholder="+254 7XX XXX XXX"
              disabled={saving}
              onChange={(event) => setPhone(event.target.value)}
            />
          </Field>

          <Field
            label="Job title"
            htmlFor="staff-position"
            hint="A title describes what they do — it grants no access."
          >
            <Select
              id="staff-position"
              value={positionId}
              disabled={saving || positions.isPending}
              onChange={(event) => setPositionId(event.target.value)}
            >
              <option value="">No title</option>
              {selectablePositions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.name}
                  {position.isActive ? '' : ' (retired)'}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Daily stamp goal"
            optional
            htmlFor="staff-goal"
            hint="Leave blank to use the business default."
          >
            <Input
              id="staff-goal"
              type="number"
              inputMode="numeric"
              min={1}
              max={1000}
              value={goal}
              disabled={saving}
              onChange={(event) => setGoal(event.target.value)}
            />
          </Field>

          <Field
            label="Daily booking goal"
            optional
            htmlFor="staff-appointment-goal"
            hint="Used when the business tracks bookings instead of stamps."
          >
            <Input
              id="staff-appointment-goal"
              type="number"
              inputMode="numeric"
              min={1}
              max={1000}
              value={appointmentGoal}
              disabled={saving}
              onChange={(event) => setAppointmentGoal(event.target.value)}
            />
          </Field>

          <FormGridFull>
            <Field label="Biography" optional htmlFor="staff-bio" hint={`${bio.length}/300 characters`}>
              <Textarea
                id="staff-bio"
                rows={3}
                maxLength={300}
                value={bio}
                disabled={saving}
                onChange={(event) => setBio(event.target.value)}
              />
            </Field>
          </FormGridFull>

          <FormGridFull>
            <Field
              label="Specialities"
              optional
              htmlFor="staff-specialities"
              hint="What they’re known for, separated by commas — shown on the public team page."
            >
              <Input
                id="staff-specialities"
                type="text"
                maxLength={300}
                placeholder="Balayage, Curly cuts, Bridal hair"
                value={specialities}
                disabled={saving}
                onChange={(event) => setSpecialities(event.target.value)}
              />
            </Field>
          </FormGridFull>

          <Field
            label="Years of experience"
            optional
            htmlFor="staff-experience"
            hint="Leave blank if you’d rather not say."
          >
            <Input
              id="staff-experience"
              type="number"
              inputMode="numeric"
              min={0}
              max={80}
              value={experience}
              disabled={saving}
              onChange={(event) => setExperience(event.target.value)}
            />
          </Field>
        </FormGrid>

        <Alert tone="info" title="Sign-in email">
          {detail.email} is the address they sign in with, so it is changed through their own account
          rather than from here.
        </Alert>
      </div>
    </Drawer>
  )
}

