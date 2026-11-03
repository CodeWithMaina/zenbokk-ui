import { useState } from 'react'
import { MailPlus } from 'lucide-react'
import { toast } from 'sonner'
import { errorMessage } from '../../lib/api/client'
import { useStaffMutations } from '../../lib/staff'
import { staffInviteSchema } from '../../lib/validation/staff'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { Drawer } from '../ui/drawer'
import { Field, Input } from '../ui/field'

export type StaffInviteDrawerProps = {
  open: boolean
  onClose: () => void
}

/**
 * Onboarding, the way this platform does it: an invitation.
 *
 * There is no public staff sign-up, so a teammate is created by inviting their
 * email — they accept with their own password and the membership is created at
 * that moment. Anything an owner wants to set (a title, services, hours) is set
 * on the profile afterwards, because those are the member's own choices to
 * confirm.
 */
export function StaffInviteDrawer({ open, onClose }: StaffInviteDrawerProps) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { invite } = useStaffMutations()

  const close = () => {
    setEmail('')
    setError(null)
    onClose()
  }

  const submit = () => {
    const parsed = staffInviteSchema.safeParse({ email })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid email address.')
      return
    }

    setError(null)
    invite.mutate(parsed.data.email, {
      onSuccess: () => {
        toast.success(`Invitation sent to ${parsed.data.email}.`)
        close()
      },
      onError: (mutationError) => setError(errorMessage(mutationError)),
    })
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Invite a teammate"
      description="They get an email link, choose their own password and join your team."
      footer={
        <div className="flex w-full justify-end gap-[0.5rem]">
          <Button variant="ghost" onClick={close} disabled={invite.isPending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={invite.isPending}>
            <MailPlus className="size-4" aria-hidden="true" />
            {invite.isPending ? 'Sending…' : 'Send invitation'}
          </Button>
        </div>
      }
    >
      <div className="space-y-[0.9rem]">
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <Field
          label="Work email"
          htmlFor="staff-invite-email"
          hint="Use the address they can open — an invitation can only be accepted by that exact email."
        >
          <Input
            id="staff-invite-email"
            type="email"
            value={email}
            autoComplete="off"
            placeholder="teammate@example.com"
            invalid={Boolean(error)}
            onChange={(event) => setEmail(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit()
            }}
          />
        </Field>

        <p className="text-meta text-muted">
          Once they accept you can set their job title, assign the services they deliver and save
          their working hours — those appear on their profile straight away.
        </p>
      </div>
    </Drawer>
  )
}
