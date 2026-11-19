/*
 * Punched service worker — web push only.
 *
 * Its single job is to receive the VAPID payload the API already sends
 * (Infrastructure/Notifications/PushChannel.cs) and show it as a system
 * notification, then open the right page when that notification is clicked.
 * It deliberately implements no fetch handler and no caching: this is not an
 * offline app, and an accidental cache would serve stale dashboard HTML.
 */

self.addEventListener('install', (event) => {
  // Take over as soon as the page reloads, so a first subscription does not need
  // two visits to become deliverable.
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch (error) {
    payload = { title: 'Punched', body: event.data ? event.data.text() : '' }
  }

  const title = payload.title || 'Punched'
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/favicon.svg',
    badge: payload.badge || '/favicon.svg',
    // The API groups a reminder ladder under one tag so a newer reminder replaces
    // the older banner instead of stacking.
    tag: payload.tag || 'punched',
    renotify: Boolean(payload.tag),
    data: payload.data || {},
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const target =
    (event.notification.data && event.notification.data.url) || '/dashboard/notifications'

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const absolute = new URL(target, self.location.origin).href

      // Prefer an already-open Punched tab: focusing beats opening a duplicate.
      for (const client of windows) {
        if (client.url === absolute && 'focus' in client) return client.focus()
      }
      for (const client of windows) {
        if ('navigate' in client && 'focus' in client) {
          await client.navigate(absolute)
          return client.focus()
        }
      }
      return self.clients.openWindow(absolute)
    })(),
  )
})
