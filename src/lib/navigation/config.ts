import {
  Award,
  BarChart3,
  Bell,
  Building2,
  CalendarCheck2,
  CalendarDays,
  Clock,
  CreditCard,
  Gift,
  Image,
  LayoutDashboard,
  Scissors,
  Settings,
  Share2,
  Star,
  Stamp,
  Store,
  UsersRound,
  UserSquare,
  Wallet,
} from 'lucide-react'
import { MODULE } from '../entitlements'
import type { NavEntry, NavSectionKey, NavSurface } from './types'

/**
 * The single navigation configuration.
 *
 * Every sidebar in the product (business dashboard, staff console, platform
 * administration) is generated from these lists — no shell, page or component
 * declares its own menu items. Each entry states the *backend* facts it needs
 * (module entitlement key, permission code, persona) so the resolver can hide
 * anything the business is not entitled to or the caller may not do.
 *
 * Module keys come from `PunchedApi/Application/Modules/ModuleCatalog.cs` and
 * permission codes from the same file's `PermissionDefinition` rows; both are
 * mirrored in `src/lib/entitlements.ts`.
 */

export const NAV_SECTION_LABELS: Record<NavSectionKey, string> = {
  overview: 'Overview',
  operations: 'Operations',
  growth: 'Growth',
  workspace: 'Workspace',
  platform: 'Platform',
}

/**
 * Business dashboard (`/dashboard`) — the owner console.
 *
 * Entries marked with a module are only rendered when the business's effective
 * entitlements include that module; entries with a permission are only rendered
 * when the caller's role holds it.
 */
export const DASHBOARD_NAV: readonly NavEntry[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    to: '/dashboard',
    surface: 'dashboard',
    section: 'overview',
    exact: true,
  },
  {
    key: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    to: '/dashboard/analytics',
    surface: 'dashboard',
    section: 'overview',
    module: MODULE.analytics,
    permission: 'analytics.view',
  },

  {
    key: 'appointments',
    label: 'Appointments',
    icon: CalendarDays,
    to: '/dashboard/appointments',
    surface: 'dashboard',
    section: 'operations',
    module: MODULE.appointments,
    permission: 'appointments.view',
  },
  {
    key: 'services',
    label: 'Services',
    icon: Scissors,
    to: '/dashboard/services',
    surface: 'dashboard',
    section: 'operations',
    module: MODULE.serviceCatalog,
    permission: 'serviceCatalog.view',
  },
  {
    key: 'staff',
    label: 'Staff',
    icon: UserSquare,
    to: '/dashboard/staff',
    surface: 'dashboard',
    section: 'operations',
    module: MODULE.staff,
    permission: 'staff.view',
  },
  {
    key: 'customers',
    label: 'Customers',
    icon: UsersRound,
    to: '/dashboard/customers',
    surface: 'dashboard',
    section: 'operations',
    module: MODULE.customers,
    permission: 'customers.view',
  },
  {
    key: 'attendance',
    label: 'Attendance',
    icon: Clock,
    to: '/dashboard/attendance',
    surface: 'dashboard',
    section: 'operations',
    module: MODULE.attendance,
    permission: 'attendance.view',
  },

  {
    key: 'loyalty',
    label: 'Loyalty',
    icon: Gift,
    to: '/dashboard/loyalty',
    surface: 'dashboard',
    section: 'growth',
    module: MODULE.loyalty,
    permission: 'loyalty.view',
    // Nested items: each child carries its own module + permission gate, so a
    // business with rewards but no programs still sees exactly what it owns.
    children: [
      {
        key: 'programs',
        label: 'Programs',
        icon: Award,
        to: '/dashboard/programs',
        surface: 'dashboard',
        section: 'growth',
        module: MODULE.programs,
        permission: 'programs.view',
      },
      {
        key: 'rewards',
        label: 'Rewards',
        icon: Gift,
        to: '/dashboard/rewards',
        surface: 'dashboard',
        section: 'growth',
        module: MODULE.rewards,
        permission: 'rewards.view',
      },
      {
        key: 'stamps',
        label: 'Stamping',
        icon: Stamp,
        to: '/dashboard/stamps',
        surface: 'dashboard',
        section: 'growth',
        module: MODULE.stamps,
        permission: 'stamps.view',
      },
      {
        key: 'card-design',
        label: 'Card design',
        icon: CreditCard,
        to: '/dashboard/card-design',
        surface: 'dashboard',
        section: 'growth',
        module: MODULE.customCardDesign,
        permission: 'cardDesigns.view',
      },
    ],
  },
  {
    key: 'referrals',
    label: 'Referrals',
    icon: Share2,
    to: '/dashboard/referrals',
    surface: 'dashboard',
    section: 'growth',
    module: MODULE.referral,
    permission: 'referral.view',
  },
  {
    key: 'reviews',
    label: 'Reviews',
    icon: Star,
    to: '/dashboard/reviews',
    surface: 'dashboard',
    section: 'growth',
    module: MODULE.reviews,
    permission: 'reviews.view',
  },
  {
    key: 'gallery',
    label: 'Gallery',
    icon: Image,
    to: '/dashboard/gallery',
    surface: 'dashboard',
    section: 'growth',
    module: MODULE.gallery,
    permission: 'gallery.view',
  },

  {
    key: 'storefront',
    label: 'Storefront',
    icon: Store,
    to: '/dashboard/storefront',
    surface: 'dashboard',
    section: 'workspace',
    module: MODULE.storefront,
    permission: 'storefront.view',
  },
  {
    key: 'payments',
    label: 'Payments',
    icon: Wallet,
    to: '/dashboard/payments',
    surface: 'dashboard',
    section: 'workspace',
    module: MODULE.payments,
    permission: 'payments.view',
  },
  {
    key: 'notifications',
    label: 'Notifications',
    icon: Bell,
    to: '/dashboard/notifications',
    surface: 'dashboard',
    section: 'workspace',
    module: MODULE.notifications,
    permission: 'notifications.view',
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: Settings,
    to: '/dashboard/settings',
    surface: 'dashboard',
    section: 'workspace',
    // Gate on the permission, not the module: settings is Core for every
    // business, but only an owner role holds `settings.view`.
    permission: 'settings.view',
  },
]

/**
 * Staff console (`/staff`).
 *
 * A staff member reaches the same shell machinery but a narrower surface: the
 * entries here are the ones the staff-scoped endpoints back. Module gates still
 * apply, so a business without the appointments module shows no appointments
 * link.
 */
export const STAFF_NAV: readonly NavEntry[] = [
  {
    key: 'staff-today',
    label: 'Today',
    icon: LayoutDashboard,
    to: '/staff',
    surface: 'staff',
    section: 'overview',
    roles: ['Staff'],
    exact: true,
  },
  {
    key: 'staff-appointments',
    label: 'Appointments',
    icon: CalendarCheck2,
    to: '/staff/appointments',
    surface: 'staff',
    section: 'operations',
    roles: ['Staff'],
    module: MODULE.appointments,
    permission: 'appointments.view',
  },
]

/**
 * Platform administration (`/admin`).
 *
 * An administrator is not a member of any business, so there are no
 * entitlements to resolve — every screen is gated server-side by the
 * `PlatformAdmin` policy, which is the only authority that matters.
 */
export const ADMIN_NAV: readonly NavEntry[] = [
  {
    key: 'admin-overview',
    label: 'Overview',
    icon: LayoutDashboard,
    to: '/admin',
    surface: 'admin',
    section: 'overview',
    roles: ['Admin'],
    exact: true,
  },
  {
    key: 'admin-businesses',
    label: 'Businesses',
    icon: Building2,
    to: '/admin/businesses',
    surface: 'admin',
    section: 'platform',
    roles: ['Admin'],
  },
  {
    key: 'admin-users',
    label: 'People',
    icon: UsersRound,
    to: '/admin/users',
    surface: 'admin',
    section: 'platform',
    roles: ['Admin'],
  },
]

/** Entries per console. */
export const NAV_BY_SURFACE: Record<NavSurface, readonly NavEntry[]> = {
  dashboard: DASHBOARD_NAV,
  staff: STAFF_NAV,
  admin: ADMIN_NAV,
}

/**
 * Flat index of every entry (parents first, then their children) for lookups
 * that do not know which surface an entry belongs to — placeholder pages, for
 * instance, resolve their own title and module gate from here.
 */
export const NAV_INDEX: readonly NavEntry[] = Object.values(NAV_BY_SURFACE).flatMap((entries) =>
  entries.flatMap((entry) => [entry, ...(entry.children ?? [])]),
)
