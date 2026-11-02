import { useMemo, useState } from 'react'
import { useAuth } from '../../lib/auth'
import { roleLabel } from '../../lib/settings'
import { StatusPill } from '../ui/badge'
import { Button } from '../ui/button'
import { SectionCard } from '../ui/card'
import { Note } from '../ui/note'
import { PasswordChangeForm } from './PasswordChangeForm'

/**
 * A human label for the current device, derived from the user agent.
 *
 * Deliberately modest: the platform has no session-listing endpoint, so this
 * describes the *browser in front of the user* — which is real, observable
 * information — rather than inventing a device name or a sign-in history.
 */
function describeDevice(): string {
  if (typeof navigator === 'undefined') return 'This device'

  const ua = navigator.userAgent
  const browser =
    /Edg\//.test(ua) ? 'Edge'
    : /OPR\//.test(ua) ? 'Opera'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Safari\//.test(ua) ? 'Safari'
    : null
  const os =
    /Windows/.test(ua) ? 'Windows'
    : /Android/.test(ua) ? 'Android'
    : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
    : /Mac OS X/.test(ua) ? 'macOS'
    : /Linux/.test(ua) ? 'Linux'
    : null

  if (browser && os) return `${browser} on ${os}`
  return browser ?? os ?? 'This device'
}

/**
 * Account security: password change and the current session.
 *
 * Only real, observable facts are shown. There is no session-management or
 * two-factor flow in the authentication architecture, so neither is offered —
 * the note says so rather than presenting controls that would do nothing.
 */
export function SecuritySettings() {
  const { user, session } = useAuth()
  const [open, setOpen] = useState(false)
  const device = useMemo(() => describeDevice(), [])

  return (
    <div className="flex flex-col gap-[1rem]">
      <SectionCard title="Sign-in" description="How you access your account.">
        <div className="flex items-center justify-between gap-4 border-b border-line py-[0.8rem]">
          <p className="text-meta text-muted">Signed in as</p>
          <p className="min-w-0 text-right font-semibold break-all">{user?.email}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 py-[0.8rem]">
          <div className="min-w-0">
            <p className="font-semibold">Password</p>
            <p className="mt-[0.1rem] text-meta text-muted">
              You’ll need your current password to continue.
            </p>
          </div>
          <Button
            aria-expanded={open}
            aria-controls="settings-password-form"
            onClick={() => setOpen((current) => !current)}
          >
            {open ? 'Cancel' : 'Change password'}
          </Button>
        </div>

        {open ? (
          <div
            id="settings-password-form"
            className="mt-[1rem] border-t border-line pt-[1rem]"
          >
            <PasswordChangeForm onDone={() => setOpen(false)} />
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title="Current session" description="Where you’re signed in.">
        <div className="flex items-center justify-between gap-4 py-[0.2rem]">
          <div className="min-w-0">
            <p className="font-semibold">{device}</p>
            <p className="mt-[0.1rem] text-meta text-muted">
              {session
                ? `Signed in now as ${roleLabel(session.user.role)} · this session renews automatically`
                : 'Signed in now'}
            </p>
          </div>
          <StatusPill tone="success">Active</StatusPill>
        </div>
      </SectionCard>

      <Note>
        Session management and two-factor authentication aren’t available for this account, so only
        the session you’re using is shown.
      </Note>
    </div>
  )
}
