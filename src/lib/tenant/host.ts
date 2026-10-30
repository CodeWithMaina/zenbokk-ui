/**
 * Host → surface resolution.
 *
 * Zenbokk is one deployment serving several address families:
 *
 *   zenbokk.com                → the public marketing website
 *   www.zenbokk.com            → canonicalised to zenbokk.com (proxy/server)
 *   admin.zenbokk.com          → the platform administration entry point
 *   {business-slug}.zenbokk.com → that business's storefront + app
 *
 * Every host name is configuration, never a literal in a component:
 * `VITE_ROOT_DOMAIN`, `VITE_MARKETING_HOST` and `VITE_ADMIN_HOST` (see
 * `.env.example`). Local development works with `localhost`, `admin.localhost`
 * and `{slug}.localhost` — the same code path, no build-time branching.
 *
 * Only the *shape* of the incoming address is decided here. Whether the slug
 * maps to a real, active business is decided by the backend
 * (`GET /v1/businesses/by-slug/{slug}/bootstrap`), so an unknown subdomain
 * never renders another tenant's data.
 */

const env = import.meta.env

const DEFAULT_ROOT_DOMAIN = 'zenbokk.com'

/** Labels that belong to the platform, never to a tenant. */
export const RESERVED_SUBDOMAINS = new Set([
  'www',
  'admin',
  'app',
  'api',
  'mail',
  'status',
  'docs',
  'assets',
  'cdn',
])

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

function readEnv(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function stripHost(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
    .replace(/\.$/, '')
}

function isIpAddress(host: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host.startsWith('[')
}

/**
 * The registrable domain that hosts business subdomains.
 *
 * Configured explicitly in every deployed environment. When it is absent we
 * infer the only safe answer per address family: `localhost` for local dev and
 * the product domain for anything else, so a preview deployment still renders
 * the marketing site instead of resolving a bogus tenant.
 */
export function getRootDomain(): string {
  const configured = readEnv(env.VITE_ROOT_DOMAIN) || readEnv(env.VITE_TENANT_BASE_DOMAIN)
  if (configured) return configured

  if (typeof window === 'undefined') return DEFAULT_ROOT_DOMAIN

  const host = stripHost(window.location.hostname)
  if (host === 'localhost' || host.endsWith('.localhost')) return 'localhost'
  if (isIpAddress(host)) return ''
  return DEFAULT_ROOT_DOMAIN
}

/** The canonical marketing host (`zenbokk.com`, or `localhost` in dev). */
export function getMarketingHost(): string {
  const configured = readEnv(env.VITE_MARKETING_HOST)
  if (configured) return stripHost(configured)
  return getRootDomain()
}

/** The dedicated platform-administration host (`admin.zenbokk.com`). */
export function getAdminHost(): string {
  const configured = readEnv(env.VITE_ADMIN_HOST)
  if (configured) return stripHost(configured)
  const root = getRootDomain()
  return root ? `admin.${root}` : ''
}

/** True when the browser runs on plain localhost (IP or `localhost`). */
export function isLocalHost(): boolean {
  if (typeof window === 'undefined') return false
  const host = stripHost(window.location.hostname)
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
}

export type HostSurface =
  | { kind: 'marketing'; host: string }
  | { kind: 'admin'; host: string }
  | { kind: 'tenant'; host: string; slug: string }
  | { kind: 'unknown'; host: string; reason: 'nested' | 'reserved' | 'invalid' }

/**
 * Classify a hostname into the experience that owns it.
 *
 * Unknown hosts *outside* the configured root (a preview domain, a custom
 * domain) fall back to marketing: they cannot be a tenant because a tenant is
 * only meaningful directly beneath the platform root.
 */
export function resolveSurface(hostname?: string): HostSurface {
  const host =
    stripHost(hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '')) || ''

  const root = getRootDomain()
  const marketingHost = getMarketingHost()
  const adminHost = getAdminHost()

  if (!host) return { kind: 'marketing', host: marketingHost }

  if (adminHost && host === adminHost) return { kind: 'admin', host }
  if (marketingHost && host === marketingHost) return { kind: 'marketing', host }
  if (root && host === `www.${root}`) return { kind: 'marketing', host }
  if (isLocalHost()) return { kind: 'marketing', host }

  if (!root) return { kind: 'marketing', host }

  const suffix = `.${root}`
  if (!host.endsWith(suffix)) return { kind: 'marketing', host }

  const label = host.slice(0, -suffix.length)

  if (!label) return { kind: 'marketing', host }
  if (label.includes('.')) return { kind: 'unknown', host, reason: 'nested' }
  if (RESERVED_SUBDOMAINS.has(label)) return { kind: 'unknown', host, reason: 'reserved' }
  if (!SLUG_PATTERN.test(label)) return { kind: 'unknown', host, reason: 'invalid' }

  return { kind: 'tenant', host, slug: label }
}

/** The tenant slug the current address belongs to, if any. */
export function slugFromHost(hostname?: string): string | null {
  const surface = resolveSurface(hostname)
  return surface.kind === 'tenant' ? surface.slug : null
}

function withPort(host: string): string {
  if (typeof window === 'undefined') return host
  if (host === window.location.hostname) return window.location.host
  return window.location.port ? `${host}:${window.location.port}` : host
}

function buildUrl(host: string, path: string): string {
  const protocol = typeof window === 'undefined' ? 'https:' : window.location.protocol
  const safePath = path.startsWith('/') ? path : `/${path}`
  return `${protocol}//${withPort(host)}${safePath}`
}

/** Absolute URL of a business's storefront (`https://slug.zenbokk.com/...`). */
export function tenantUrl(slug: string, path = '/'): string {
  const root = getRootDomain()
  if (!root) return buildUrl(withPort(getMarketingHost()), `/${slug}${path === '/' ? '' : path}`)
  return buildUrl(`${slug}.${root}`, path)
}

/** Absolute URL of the public marketing site. */
export function marketingUrl(path = '/'): string {
  const host = getMarketingHost()
  return host ? buildUrl(host, path) : path
}

/** Absolute URL of the platform administration surface. */
export function adminUrl(path = '/admin'): string {
  const host = getAdminHost()
  return host ? buildUrl(host, path) : marketingUrl(path)
}

/**
 * Storefront address for the *current* experience.
 *
 * On a business host the storefront lives at the path root (`/book`); when the
 * same pages are reached through the path-based fallback (`/nuru-studio/book`,
 * used on the marketing domain and in local development without subdomains)
 * the slug has to stay in the path.
 */
export function storefrontHref(slug: string, path = '/'): string {
  const surface = resolveSurface()
  const suffix = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`
  return surface.kind === 'tenant' ? suffix || '/' : `/${slug}${suffix}`
}

/** True when the storefront is being rendered from a business hostname. */
export function isTenantHost(): boolean {
  return resolveSurface().kind === 'tenant'
}

/** Canonical storefront address shown to owners (subdomain, not path). */
export function storefrontPublicUrl(slug: string): string {
  const root = getRootDomain()
  return root ? tenantUrl(slug) : buildUrl(withPort(getMarketingHost()), `/${slug}`)
}
