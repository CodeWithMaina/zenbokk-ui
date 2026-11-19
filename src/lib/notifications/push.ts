import { apiGet, apiRequest } from '../api/client'

/**
 * Browser push subscription client.
 *
 * The plumbing already exists server-side: `POST/DELETE /v1/users/push/token` store
 * a device's endpoint + keys against the CALLER's user id, `PushChannel` delivers
 * with the deployment's VAPID pair, and the notification pipeline decides *whether*
 * a category is deliverable from the user's and business's preferences. This module
 * adds the missing browser half: service-worker registration, a real
 * `PushManager` subscription, and the honest reporting of each failure.
 *
 * The VAPID private key never appears here (or anywhere in the bundle): the public
 * key is read from `GET /v1/users/push/config`, which returns only the public half.
 */

export type PushConfig = {
  /** True only when the deployment can actually deliver (both key halves present). */
  enabled: boolean
  publicKey: string | null
}

/** One active device the caller has registered (endpoint reduced to its host). */
export type PushDevice = {
  id: string
  host: string
  userAgent: string | null
  lastSeenAt: string
}

export type PushCapability = {
  supported: boolean
  /** Why it is unavailable, when it is. */
  reason?: 'unsupported' | 'insecure'
}

const SERVICE_WORKER_URL = '/sw.js'

/** Does this browser support everything a web-push subscription needs? */
export function pushCapability(): PushCapability {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { supported: false, reason: 'unsupported' }
  }
  const supported =
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  if (!supported) return { supported: false, reason: 'unsupported' }
  if (window.isSecureContext === false) return { supported: false, reason: 'insecure' }
  return { supported: true }
}

/** The deployment's public key. Never throws for "not configured" — it reports it. */
export async function getPushConfig(): Promise<PushConfig> {
  return apiGet<PushConfig>('/v1/users/push/config')
}

/**
 * The caller's active push devices. Only this user's rows are returned, so the panel
 * can say how many browsers are subscribed without exposing another account's devices.
 */
export async function listPushDevices(): Promise<PushDevice[]> {
  return apiGet<PushDevice[]>('/v1/users/push/devices')
}

/** Register the Punched service worker (idempotent) and wait until it is running. */
export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
    scope: '/',
  })
  // `ready` resolves once the worker is active for this page — subscribing before
  // that produces a subscription nothing can display.
  return navigator.serviceWorker.ready.then(() => registration)
}

/** The subscription this browser already holds, if any. */
export async function existingSubscription(): Promise<PushSubscription | null> {
  if (!pushCapability().supported) return null
  const registration = await navigator.serviceWorker.getRegistration('/')
  if (!registration) return null
  return registration.pushManager.getSubscription()
}

/** `VAPID` public keys arrive base64url; `subscribe` wants raw bytes. */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalised = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(normalised)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index)
  return bytes
}

async function sendSubscription(subscription: PushSubscription): Promise<void> {
  const json = subscription.toJSON()
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth
  if (!json.endpoint || !p256dh || !auth) {
    throw new Error('The browser returned an incomplete push subscription.')
  }

  await apiRequest<{ message: string }>('/v1/users/push/token', {
    method: 'POST',
    body: { endpoint: json.endpoint, keys: { p256dh, auth } },
  })
}

export type SubscribeResult = {
  endpoint: string
  /** True when this browser already had a subscription and it was reused. */
  reused: boolean
}

/**
 * Subscribe this browser and register the endpoint against the signed-in user.
 *
 * Reuses an existing subscription for the same VAPID key, so pressing Enable twice
 * — or after a reload — refreshes one row instead of creating a second. The server
 * is idempotent on (user, endpoint) regardless.
 */
export async function subscribeThisDevice(): Promise<SubscribeResult> {
  const capability = pushCapability()
  if (!capability.supported) {
    throw new Error(
      capability.reason === 'insecure'
        ? 'Browser notifications need a secure (https) connection.'
        : 'This browser does not support push notifications.',
    )
  }

  const config = await getPushConfig()
  if (!config.publicKey) {
    throw new Error('Browser notifications are not configured on this deployment.')
  }

  const registration = await registerPushServiceWorker()
  let subscription = await registration.pushManager.getSubscription()
  const reused = subscription !== null

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.publicKey),
    })
  }

  await sendSubscription(subscription)
  return { endpoint: subscription.endpoint, reused }
}

/**
 * Disconnect this device: tell the API first (so the device stops receiving even if
 * the browser refuses to release the subscription), then unsubscribe locally.
 */
export async function disconnectThisDevice(): Promise<void> {
  const subscription = await existingSubscription()
  if (!subscription) return

  try {
    await apiRequest<{ message: string }>(
      `/v1/users/push/token?endpoint=${encodeURIComponent(subscription.endpoint)}`,
      { method: 'DELETE' },
    )
  } catch {
    // Keep going: a browser that still holds a live subscription is worse than a
    // stale server row, and the row is pruned when delivery gets a 404/410.
  }

  await subscription.unsubscribe()
}
