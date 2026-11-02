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
