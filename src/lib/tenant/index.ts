export {
  getAdminHost,
  getMarketingHost,
  getRootDomain,
  isLocalHost,
  isTenantHost,
  marketingUrl,
  adminUrl,
  resolveSurface,
  slugFromHost,
  storefrontHref,
  storefrontPublicUrl,
  tenantUrl,
} from './host'
export type { HostSurface } from './host'
export {
  getActiveTenantSlug,
  setActiveTenantSlug,
  subscribeTenant,
} from './tenant-store'
