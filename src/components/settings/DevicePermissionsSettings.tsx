import { useEffect, useState } from 'react'
import { Bell, BellOff, Camera, LoaderCircle } from 'lucide-react'
import { Alert } from '../ui/alert'
import { Badge, type Tone } from '../ui/badge'
import { Button } from '../ui/button'
import { SectionCard } from '../ui/card'
import { startCamera, stopStream } from '../../lib/media'
import { usePushSubscription } from '../../lib/notifications'
import type { PushStatus } from '../../lib/notifications'

type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported' | 'unavailable'

const CAMERA_STATE_LABEL: Record<PermissionState, { label: string; tone: Tone }> = {
  granted: { label: 'Granted', tone: 'success' },
  denied: { label: 'Blocked', tone: 'danger' },
  prompt: { label: 'Not requested', tone: 'neutral' },
  unsupported: { label: 'Not supported', tone: 'neutral' },
  unavailable: { label: 'Unavailable', tone: 'warning' },
}

/** What the notification row says, from the device's real subscription state. */
const PUSH_STATE_LABEL: Record<PushStatus, { label: string; tone: Tone }> = {
  checking: { label: 'Checking…', tone: 'neutral' },
  subscribed: { label: 'On this device', tone: 'success' },
  unsubscribed: { label: 'Not on this device', tone: 'neutral' },
  denied: { label: 'Blocked', tone: 'danger' },
  blocked: { label: 'Blocked', tone: 'danger' },
  unsupported: { label: 'Not supported', tone: 'neutral' },
  'not-configured': { label: 'Not available', tone: 'warning' },
}

function cameraSupported(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
}

async function readCameraPermission(): Promise<PermissionState> {
  if (!cameraSupported()) return 'unsupported'
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) return 'prompt'
  try {
    const status = await navigator.permissions.query({ name: 'camera' as PermissionName })
    if (status.state === 'granted') return 'granted'
    if (status.state === 'denied') return 'denied'
    return 'prompt'
  } catch {
    // Firefox, for example, does not expose the camera name. Unknown means "not asked".
    return 'prompt'
  }
}

/**
 * Device/browser permissions that Zenbokk genuinely uses.
 *
 * Nothing is requested on mount: the panel reports what the browser already knows.
 * Notifications are not merely "allowed" — enabling them creates a real push
 * subscription, registers it against this signed-in user and this browser, and can
 * be disconnected again. Which *events* arrive is decided by the notification
 * preference matrix, not by this switch, so the two are never conflated.
 */
export function DevicePermissionsSettings() {
  const push = usePushSubscription()
  const [camera, setCamera] = useState<PermissionState>('prompt')
  const [cameraBusy, setCameraBusy] = useState(false)
  const [cameraNote, setCameraNote] = useState<string | null>(null)
  const [explaining, setExplaining] = useState(false)

  useEffect(() => {
    let alive = true
    void (async () => {
      const state = await readCameraPermission()
      if (alive) setCamera(state)
    })()
    return () => {
      alive = false
    }
  }, [])

  /**
   * A real permission check: it opens the camera, then releases it immediately.
   * Kept here so the panel's own button does exactly what it says instead of asking
   * the browser for a permission nothing uses.
   */
  const requestCamera = async () => {
    if (camera === 'unsupported' || cameraBusy) return
    setCameraBusy(true)
    setCameraNote(null)
    try {
      const stream = await startCamera()
      stopStream(stream)
      setCamera('granted')
      setCameraNote(
        'Camera is available. Use Take photo on a profile, logo or staff photo to take one.',
      )
    } catch (error) {
      const denied = error instanceof Error && /blocked|denied/i.test(error.message)
      setCamera(denied ? 'denied' : 'unavailable')
      setCameraNote(
        error instanceof Error
          ? error.message
          : 'The camera could not be started. Uploading a photo from files still works.',
      )
    } finally {
      setCameraBusy(false)
    }
  }

  const enableNotifications = async () => {
    setExplaining(false)
    await push.enable()
  }

  const notificationBadge = PUSH_STATE_LABEL[push.status]

  return (
    <div className="flex flex-col gap-[1rem]">
      <SectionCard
        title="Device permissions"
        description="These belong to this browser on this device. Nothing is requested until you ask for it."
      >
        <ul className="m-0 list-none divide-y divide-line p-0">
          <li className="flex flex-col gap-3 py-[1rem] first:pt-0 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid size-[2.2rem] shrink-0 place-items-center rounded-round bg-sunken text-muted">
                <Bell className="size-[1.05rem]" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-label font-semibold">
                  Notifications
                  <Badge tone={notificationBadge.tone}>{notificationBadge.label}</Badge>
                </p>
                <p className="mt-[0.2rem] text-meta text-muted">
                  Alerts for new bookings, payments to verify and appointment reminders,
                  delivered by this browser even when Punched is in another tab.
                </p>
                {push.status === 'subscribed' ? (
                  <p className="mt-[0.2rem] text-caption text-subtle">
                    This browser is registered
                    {push.deviceCount > 0
                      ? ` · ${push.deviceCount} device${push.deviceCount === 1 ? '' : 's'} on your account`
                      : ''}
                    . Your other devices keep their own registration.
                  </p>
                ) : null}
                {push.status === 'denied' ? (
                  <p className="mt-[0.2rem] text-caption text-subtle">
                    Blocked in the browser. Allow notifications in the address-bar site
                    settings, then re-check.
                  </p>
                ) : null}
                {push.status === 'not-configured' ? (
                  <p className="mt-[0.2rem] text-caption text-subtle">
                    This deployment has no web-push keys configured, so browser
                    notifications cannot be delivered yet.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-[0.5rem] sm:justify-end">
              {push.status === 'subscribed' ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void push.disable()}
                  disabled={push.busy}
                >
                  {push.busy ? (
                    <LoaderCircle className="size-[0.95rem] animate-spin" aria-hidden="true" />
                  ) : (
                    <BellOff className="size-[0.95rem]" aria-hidden="true" />
                  )}
                  Disconnect this device
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setExplaining(true)}
                  disabled={
                    push.busy ||
                    push.status === 'checking' ||
                    push.status === 'unsupported' ||
                    push.status === 'not-configured'
                  }
                >
                  {push.busy ? (
                    <LoaderCircle className="size-[0.95rem] animate-spin" aria-hidden="true" />
                  ) : null}
                  {push.busy
                    ? 'Enabling…'
                    : push.status === 'unsupported'
                      ? 'Not supported'
                      : push.status === 'not-configured'
                        ? 'Not available'
                        : 'Enable'}
                </Button>
              )}
              {push.status === 'denied' ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void push.refresh()}
                  disabled={push.busy}
                >
                  Re-check
                </Button>
              ) : null}
            </div>
          </li>

          <li className="flex flex-col gap-3 py-[1rem] sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid size-[2.2rem] shrink-0 place-items-center rounded-round bg-sunken text-muted">
                <Camera className="size-[1.05rem]" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-label font-semibold">
                  Camera
                  <Badge tone={CAMERA_STATE_LABEL[camera].tone}>
                    {CAMERA_STATE_LABEL[camera].label}
                  </Badge>
                </p>
                <p className="mt-[0.2rem] text-meta text-muted">
                  Taking a photo for a profile, logo, service or gallery image. Uploading
                  from files always remains available.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="default"
              className="shrink-0"
              onClick={() => void requestCamera()}
              disabled={cameraBusy || camera === 'granted' || camera === 'unsupported'}
            >
              {camera === 'granted'
                ? 'Enabled'
                : camera === 'unsupported'
                  ? 'Not supported'
                  : cameraBusy
                    ? 'Checking...'
                    : camera === 'denied'
                      ? 'Re-check'
                      : 'Allow camera'}
            </Button>
          </li>
        </ul>
      </SectionCard>

      {explaining ? (
        <SectionCard title="Turn on browser notifications?">
          <p className="text-meta text-muted">
            This browser will show system notifications when something happens in
            Punched — a new booking, a payment waiting to be verified, or a reminder you
            have scheduled. They are delivered through the browser&rsquo;s own push
            service, so they arrive even when Punched is closed.
          </p>
          <ul className="mt-[0.7rem] list-disc space-y-[0.2rem] pl-[1.1rem] text-meta text-muted">
            <li>Only the events enabled in your notification preferences are sent.</li>
            <li>The browser will now ask for notification permission.</li>
            <li>You can disconnect this device at any time from this panel.</li>
          </ul>
          <div className="mt-[0.9rem] flex flex-wrap gap-[0.5rem]">
            <Button size="sm" onClick={() => void enableNotifications()}>
              Turn on notifications
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setExplaining(false)}>
              Not now
            </Button>
          </div>
        </SectionCard>
      ) : null}

      {push.error ? (
        <Alert
          tone="danger"
          title="Notifications could not be enabled"
          onDismiss={() => void push.refresh()}
        >
          {push.error}
        </Alert>
      ) : null}

      {cameraNote ? (
        <Alert tone="info" title="Camera note" onDismiss={() => setCameraNote(null)}>
          {cameraNote}
        </Alert>
      ) : null}

      <SectionCard
        title="Not used by Zenbokk"
        description="Nothing here is requested, now or in the background."
      >
        <p className="text-meta text-muted">
          Microphone and precise location are not used. If a future feature needs them, it
          will ask from the screen that uses it — never on sign-in or page load.
        </p>
      </SectionCard>
    </div>
  )
}


