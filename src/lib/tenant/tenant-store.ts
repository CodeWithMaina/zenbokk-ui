/**
 * Active tenant, as the browser knows it.
 *
 * The server resolves the tenant from `X-Punched-Tenant` (page host) or the
 * API host; this store only tells the API client which page the request came
 * from. It never grants anything — authorization is decided server-side from
 * the caller's identity + memberships.
 *
 * The hostname is the first authority: a page served on
 * `nuru-studio.zenbokk.com` is already in that tenant before any component
 * mounts, so sign-in, registration and refresh requests carry the right
 * hint even on a cold load. The storefront subtree then replaces it with the
 * canonical slug reported by the backend (a renamed business).
 */

import { slugFromHost as slugFromHostname } from './host'

type Listener = () => void

const listeners = new Set<Listener>()

function normalise(value: string | null | undefined): string | null {
  if (!value) return null
  const slug = value.trim().toLowerCase()
  return slug.length > 0 ? slug : null
}

let active: string | null =
  typeof window !== 'undefined' ? normalise(slugFromHostname(window.location.hostname)) : null

/** `java-house.zenbokk.com` → `java-house`; apex hosts resolve to null. */
export function slugFromHost(hostname: string): string | null {
  return slugFromHostname(hostname)
}

export function getActiveTenantSlug(): string | null {
  return active
}

export function setActiveTenantSlug(slug: string | null | undefined): void {
  const next = normalise(slug)
  if (next === active) return
  active = next
  for (const listener of listeners) listener()
}

export function subscribeTenant(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
