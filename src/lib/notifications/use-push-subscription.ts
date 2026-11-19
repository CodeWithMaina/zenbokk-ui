import { useCallback, useEffect, useRef, useState } from 'react'
import {
  disconnectThisDevice,
  existingSubscription,
  getPushConfig,
  listPushDevices,
  pushCapability,
  subscribeThisDevice,
} from './push'
import type { PushConfig } from './push'

export type PushStatus =
  | 'checking'
  | 'subscribed'
  | 'unsubscribed'
  | 'denied'
  | 'blocked'
  | 'unsupported'
  | 'not-configured'

export type PushSubscriptionState = {
  status: PushStatus
  /** The browser's own permission — never confused with a subscription. */
  permission: NotificationPermission | 'unsupported'
  config: PushConfig | null
  endpoint: string | null
  /** How many browsers this account has registered (the server's own list). */
  deviceCount: number
  busy: boolean
  error: string | null
}

/**
 * One device's push state, and the two actions that change it.
 *
 * Mounting only *reads*: capability, the deployment's public key and the existing
 * subscription. Nothing prompts for permission and nothing subscribes until
 * `enable()` is called from a click, which is what keeps a page load from nagging
 * someone who is not interested.
 *
 * "Permission granted" is deliberately not the same as "subscribed": a browser can
 * allow notifications and still hold no subscription, and this reports the two
 * separately.
 */
export function usePushSubscription() {
  const [state, setState] = useState<PushSubscriptionState>({
    status: 'checking',
    permission: 'default',
    config: null,
    endpoint: null,
    deviceCount: 0,
    busy: false,
    error: null,
  })
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const patch = useCallback((next: Partial<PushSubscriptionState>) => {
    if (!mounted.current) return
    setState((current) => ({ ...current, ...next }))
  }, [])

  const refresh = useCallback(async () => {
    const capability = pushCapability()
    if (!capability.supported) {
      patch({
        status: 'unsupported',
        permission: 'unsupported',
        endpoint: null,
        config: null,
      })
      return
    }

    const permission = typeof Notification === 'undefined' ? 'unsupported' : Notification.permission

    let config: PushConfig | null = null
    try {
      config = await getPushConfig()
    } catch {
      // A failed config read is reported as "not available" rather than blocking the
      // panel: the permission state below is still true and worth showing.
      config = null
    }

    const subscription = await existingSubscription().catch(() => null)
    const endpoint = subscription?.endpoint ?? null

    // The server's own device list is the honest count for "how many browsers", since
    // this browser can only see its own subscription.
    const devices = await listPushDevices().catch(() => [])

    let status: PushStatus
    if (endpoint) status = 'subscribed'
    else if (permission === 'denied') status = 'denied'
    else if (permission === 'unsupported') status = 'unsupported'
    else if (!config?.publicKey) status = 'not-configured'
    else status = 'unsubscribed'

    patch({ status, permission, config, endpoint, deviceCount: devices.length })
  }, [patch])

  useEffect(() => {
    void refresh()
  }, [refresh])

  /** Ask for permission (from a click), then create + register the subscription. */
  const enable = useCallback(async () => {
    patch({ busy: true, error: null })
    try {
      if (typeof Notification === 'undefined') {
        patch({ busy: false, status: 'unsupported', permission: 'unsupported' })
        return
      }

      const permission =
        Notification.permission === 'default'
          ? await Notification.requestPermission()
          : Notification.permission

      if (permission !== 'granted') {
        patch({
          busy: false,
          permission,
          status: permission === 'denied' ? 'denied' : 'unsubscribed',
          error:
            permission === 'denied'
              ? 'Notifications are blocked for this site. Allow them in the address-bar site settings, then try again.'
              : null,
        })
        return
      }

      const result = await subscribeThisDevice()
      const devices = await listPushDevices().catch(() => [])
      patch({
        busy: false,
        permission,
        status: 'subscribed',
        endpoint: result.endpoint,
        deviceCount: devices.length,
        error: null,
      })
    } catch (error) {
      patch({
        busy: false,
        error:
          error instanceof Error
            ? error.message
            : 'This device could not be subscribed. Please try again.',
      })
      await refresh()
    }
  }, [patch, refresh])

  /** Stop delivery on this device. */
  const disable = useCallback(async () => {
    patch({ busy: true, error: null })
    try {
      await disconnectThisDevice()
      const devices = await listPushDevices().catch(() => [])
      patch({ busy: false, status: 'unsubscribed', endpoint: null, deviceCount: devices.length })
    } catch (error) {
      patch({
        busy: false,
        error:
          error instanceof Error
            ? error.message
            : 'This device could not be disconnected. Please try again.',
      })
    }
  }, [patch])

  return { ...state, enable, disable, refresh }
}
