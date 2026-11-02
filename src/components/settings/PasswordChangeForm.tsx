import { useState } from 'react'
import { toast } from 'sonner'
import { errorMessage } from '../../lib/api/client'
import { authApi } from '../../lib/auth/api'
import { PASSWORD_HINT, passwordSchema } from '../../lib/validation/password'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { Field, FormGrid, FormGridFull, Input } from '../ui/field'

/**
 * Change-password form.
 *
 * Validates against the server's own policy (`lib/validation/password` mirrors
 * `ChangePasswordRequestValidator`) before sending, then calls the real
 * `/v1/auth/change-password` endpoint with the current password. Plaintext
 * passwords are never stored or logged.
 */
export function PasswordChangeForm({ onDone }: { onDone?: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setError(null)

    if (!currentPassword) {
      setError('Enter your current password first.')
      return
    }

    const parsed = passwordSchema.safeParse(newPassword)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? PASSWORD_HINT)
      return
    }

    if (newPassword !== confirmPassword) {
      setError('The new passwords don’t match.')
      return
    }

    setSaving(true)
    try {
      await authApi.changePassword({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Password updated.')
      onDone?.()
    } catch (submitError) {
      setError(errorMessage(submitError, 'The password could not be changed.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className="grid gap-[1rem]"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <FormGrid>
        <FormGridFull>
          <Field label="Current password" htmlFor="pw-current">
            <Input
              id="pw-current"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              disabled={saving}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </Field>
        </FormGridFull>
        <Field label="New password" htmlFor="pw-new" hint={PASSWORD_HINT}>
          <Input
            id="pw-new"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            disabled={saving}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </Field>
        <Field label="Confirm new password" htmlFor="pw-confirm">
          <Input
            id="pw-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            disabled={saving}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </Field>
      </FormGrid>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? 'Updating…' : 'Update password'}
        </Button>
      </div>
    </form>
  )
}
