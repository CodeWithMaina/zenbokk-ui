/**
 * Notifications module: the caller's resolved notification preference matrix.
 *
 * Delivery itself is server-side; this module only reads and writes the sparse
 * (category × channel) overrides that the delivery pipeline honours.
 */
export { notificationsApi } from './api'
export {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from './use-notifications'
export {
  disconnectThisDevice,
  existingSubscription,
  getPushConfig,
  pushCapability,
  registerPushServiceWorker,
  subscribeThisDevice,
} from './push'
export type { PushCapability, PushConfig, SubscribeResult } from './push'
export { usePushSubscription } from './use-push-subscription'
export type { PushStatus, PushSubscriptionState } from './use-push-subscription'
