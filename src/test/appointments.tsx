import type {
  Appointment,
  AppointmentDashboard,
  AppointmentDashboardItem,
  AppointmentPaymentSummary,
  AvailabilitySlot,
  CustomerDashboardItem,
  ServiceDashboardItem,
  StaffDashboardItem,
} from '../lib/api/types'
import type { AppointmentActivityEntry } from '../lib/appointments'
import type { DashboardContextValue } from '../lib/dashboard/dashboard-context'
import { MODULE } from '../lib/entitlements'
import { TEST_BUSINESS_ID } from './fixtures'

/**
 * Appointments fixtures.
 *
 * Every payload is the shape the backend really returns (field names mirror the
 * `[JsonPropertyName]` values), so the component tests exercise the actual API
 * client — URL building, the tenant header, envelope unwrapping and error
 * mapping — rather than a stubbed module.
 */

export const TEST_APPOINTMENT_ID = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
export const TEST_CUSTOMER_ID = 'cccccccc-1111-4111-8111-cccccccccccc'
export const TEST_STAFF_ID = '55555555-1111-4111-8111-555555555555'
export const TEST_SERVICE_ID = '77777777-1111-4111-8111-777777777777'

/** 2026-05-12T09:00:00Z — a Tuesday, comfortably in the future for the fixtures. */
export const TEST_START = '2026-05-12T09:00:00.000Z'
export const TEST_END = '2026-05-12T10:00:00.000Z'

export function makeServiceBucket(
  overrides: Partial<ServiceDashboardItem> = {},
): ServiceDashboardItem {
  return {
    id: TEST_SERVICE_ID,
    name: 'Signature treatment',
    description: null,
    durationMinutes: 60,
    price: 3500,
    isActive: true,
    showcase: true,
    ...overrides,
  }
}

export function makeStaffBucket(overrides: Partial<StaffDashboardItem> = {}): StaffDashboardItem {
  return {
    userId: TEST_STAFF_ID,
    fullName: 'Amara Okafor',
    email: 'amara@example.test',
    avatarUrl: null,
    phoneNumber: '+254700000001',
    ...overrides,
  }
}

export function makeCustomerBucket(
  overrides: Partial<CustomerDashboardItem> = {},
): CustomerDashboardItem {
  return {
    userId: TEST_CUSTOMER_ID,
    fullName: 'Wanjiru Kariuki',
    email: 'wanjiru@example.test',
    phoneNumber: '+254712345678',
    avatarUrl: null,
    enrolledAt: '2026-01-04T08:00:00.000Z',
    status: 'active',
    totalStamps: 3,
    lastStampAt: null,
    ...overrides,
  }
}

export function makeDashboardItem(
  overrides: Partial<AppointmentDashboardItem> = {},
): AppointmentDashboardItem {
  return {
    id: TEST_APPOINTMENT_ID,
    businessId: TEST_BUSINESS_ID,
    scheduledAt: TEST_START,
    endAt: TEST_END,
    status: 'booked',
    serviceId: TEST_SERVICE_ID,
    serviceName: 'Signature treatment',
    customerId: TEST_CUSTOMER_ID,
    customerName: 'Wanjiru Kariuki',
    customerEmail: 'wanjiru@example.test',
    customerPhone: '+254712345678',
    customerAvatarUrl: null,
    staffUserId: TEST_STAFF_ID,
    staffName: 'Amara Okafor',
    staffEmail: 'amara@example.test',
    staffAvatarUrl: null,
    createdAt: '2026-05-01T07:00:00.000Z',
    updatedAt: '2026-05-01T07:00:00.000Z',
    ...overrides,
  }
}


export function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: TEST_APPOINTMENT_ID,
    businessId: TEST_BUSINESS_ID,
    customerId: TEST_CUSTOMER_ID,
    customerName: 'Wanjiru Kariuki',
    customerEmail: 'wanjiru@example.test',
    customerPhone: '+254712345678',
    customerAvatarUrl: null,
    staffUserId: TEST_STAFF_ID,
    staffName: 'Amara Okafor',
    staffEmail: 'amara@example.test',
    staffAvatarUrl: null,
    scheduledAt: TEST_START,
    endAt: TEST_END,
    status: 'booked',
    services: [
      {
        serviceCatalogItemId: TEST_SERVICE_ID,
        name: 'Signature treatment',
        durationMinutes: 60,
        price: 3500,
        sortOrder: 0,
      },
    ],
    createdAt: '2026-05-01T07:00:00.000Z',
    updatedAt: '2026-05-01T07:00:00.000Z',
    pendingReschedule: null,
    reminderOptOut: false,
    note: null,
    ...overrides,
  }
}

export function makeActivity(
  overrides: Partial<AppointmentActivityEntry> = {},
): AppointmentActivityEntry {
  return {
    id: 'aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa',
    status: 'booked',
    changedAt: '2026-05-01T07:00:00.000Z',
    changedByUserId: TEST_STAFF_ID,
    changedByName: 'Amara Okafor',
    note: 'Booked online.',
    ...overrides,
  }
}

export function makeAvailability(
  date: string,
  overrides: Partial<AvailabilitySlot> = {},
): AvailabilitySlot {
  return {
    startAtUtc: `${date}T09:00:00.000Z`,
    endAtUtc: `${date}T10:00:00.000Z`,
    staffUserId: TEST_STAFF_ID,
    staffName: 'Amara Okafor',
    serviceIds: [TEST_SERVICE_ID],
    status: 'available',
    isAvailable: true,
    localDate: date,
    localTime: '09:00',
    dayPart: 'morning',
    alternativeStaff: [],
    ...overrides,
  }
}

export function makePaymentSummary(
  overrides: Partial<AppointmentPaymentSummary> = {},
): AppointmentPaymentSummary {
  return {
    appointmentId: TEST_APPOINTMENT_ID,
    serviceTotal: 3500,
    bookingFee: 1750,
    bookingFeePercentage: 50,
    amountPaid: 0,
    balance: 3500,
    paymentStatus: 'unpaid',
    verificationStatus: 'none',
    payments: [],
    ...overrides,
  }
}


/** A dashboard context with the appointments and payments modules on. */
export function makeDashboardContext(
  overrides: Partial<DashboardContextValue> = {},
): DashboardContextValue {
  const entitlements: string[] = [MODULE.appointments, MODULE.payments]
  const permissions = [
    'appointments.view',
    'appointments.create',
    'appointments.manage',
    'appointments.confirm',
    'appointments.complete',
    'appointments.cancel',
    'appointments.no_show',
    'payments.view',
    'payments.create',
    'payments.confirm_cash',
  ]

  return {
    surface: 'dashboard',
    role: 'Business',
    user: null,
    business: {
      id: TEST_BUSINESS_ID,
      name: 'Aurelia Luxe',
      category: 'salon',
      location: 'Westlands, Nairobi',
      description: null,
      logoUrl: null,
      phoneNumber: null,
      email: null,
      slug: 'aurelia-luxe',
      hasLoyaltyProgram: false,
      hasReferralProgram: false,
    },
    entitlements,
    permissions,
    plan: { key: 'growth', name: 'Growth', status: 'active', endsAt: null },
    nav: [],
    hasModule: (key: string) => entitlements.includes(key),
    hasPermission: (code: string) => permissions.includes(code),
    canSee: () => true,
    ...overrides,
  }
}

export function makeAppointmentDashboard(
  overrides: Partial<AppointmentDashboard> = {},
): AppointmentDashboard {
  const appointments = overrides.appointments ?? [makeDashboardItem()]
  return {
    meta: { page: 1, pageSize: 25, totalCount: appointments.length, totalPages: 1 },
    appointments,
    customers: [makeCustomerBucket()],
    staff: [makeStaffBucket()],
    services: [makeServiceBucket()],
    ...overrides,
  }
}
