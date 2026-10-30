/**
 * Wire types for the Punched API (`/v1/*`).
 *
 * Property names mirror the backend `[JsonPropertyName]` values exactly, so no
 * transformation layer is needed. Every response is wrapped in the
 * `ApiResponse<T>` envelope defined in `Application/DTOs/ApiResponse.cs`.
 */

export type ApiErrorPayload = {
  code: string
  message: string
}

/** `{ success, data, error }` — the single shape every endpoint returns. */
export type ApiEnvelope<T> = {
  success: boolean
  data: T | null
  error: ApiErrorPayload | null
}

/** `Domain/Entities/UserRole.cs`, serialised as a string. */
export type UserRole = 'Customer' | 'Business' | 'Staff' | 'Admin'

export type PaginatedResponse<T> = {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export type PaginationMeta = {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export type MessageResponse = {
  message: string
}

// ─────────────────────────────────────────────────────────────
//  Auth
// ─────────────────────────────────────────────────────────────

export type UserProfile = {
  id: string
  email: string
  phone: string | null
  fullName: string
  avatarUrl: string | null
  avatarMediaId: string | null
  dateOfBirth: string | null
  gender: string | null
  role: UserRole
  createdAt: string
}

export type AuthResponse = {
  accessToken: string
  refreshToken: string
  /** Lifetime of the access token, in seconds. */
  expiresIn: number
  user: UserProfile
}

export type TokenResponse = {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export type LoginRequest = {
  email: string
  password: string
  /** Tenant hint — the server re-resolves and verifies membership. */
  businessSlug?: string | null
}

export type RegisterRequest = {
  email: string
  password: string
  fullName: string
  /** Defaults to `Customer` server-side; the storefront never sends anything else. */
  role?: UserRole
  sourceProvider?: string | null
  sourceCampaign?: string | null
  /** Tenant the sign-up happened on; server-verified before membership is written. */
  businessSlug?: string | null
}

export type RegisterResponse = MessageResponse

export type VerifyEmailRequest = {
  email: string
  code: string
  businessSlug?: string | null
}

export type RequestEmailVerification = {
  email: string
}

export type ForgotPasswordRequest = {
  email: string
}

export type ResetPasswordRequest = {
  email: string
  code: string
  newPassword: string
}

export type ChangePasswordRequest = {
  currentPassword: string
  newPassword: string
}

export type RefreshTokenRequest = {
  refreshToken?: string | null
  businessSlug?: string | null
}


// ─────────────────────────────────────────────────────────────
//  Media + business (public)
// ─────────────────────────────────────────────────────────────

export type ImageVariant = {
  url: string
  width: number
  height: number
  format: string
}

/** Every customer capability key; always present, `false` when unavailable. */
export type CustomerCapabilities = Record<string, boolean>

/** Active loyalty programme summary sent with the public business profile. */
export type PublicLoyaltyProgramSummary = {
  name: string
  stampsRequired: number
  rewardDescription: string
  defaultEnrollmentStamps: number
}

export type PublicBusinessProfile = {
  id: string
  slug: string | null
  name: string
  category: string
  location: string
  description: string | null
  logoUrl: string | null
  logoMediaId: string | null
  logoVariants: ImageVariant[]
  coverMediaId: string | null
  galleryMediaIds: string[]
  phoneNumber: string | null
  email: string | null
  hasAppointments: boolean
  hasLoyalty: boolean
  hasReferralProgram: boolean
  capabilities: CustomerCapabilities
  /** Null when loyalty is disabled or no programme is active. */
  loyaltyProgram: PublicLoyaltyProgramSummary | null
}

export type LandingPageCta = {
  enabled: boolean
  /** `book` | `loyalty` | `contact` | … (presentation only). */
  type: string
  label: string
}

export type PublicLandingPageSection = {
  key: string
  order: number
  title: string | null
  description: string | null
}

export type PublicLandingPage = {
  businessId: string
  heroTitle: string
  heroTagline: string
  heroDescription: string | null
  showLogo: boolean
  heroBackgroundMediaId: string | null
  heroBackgroundVariants: ImageVariant[]
  navigation: Record<string, boolean>
  sections: PublicLandingPageSection[]
  primaryCta: LandingPageCta
  secondaryCta: LandingPageCta
}

export type StorefrontBootstrap = {
  businessId: string
  slug: string
  /** True when the requested slug was superseded — redirect to `slug`. */
  moved: boolean
  business: PublicBusinessProfile
  landingPage: PublicLandingPage
}

// ─────────────────────────────────────────────────────────────
//  Services + staff (public)
// ─────────────────────────────────────────────────────────────

export type ServiceCatalogItem = {
  id: string
  businessId: string
  businessName: string | null
  name: string
  description: string | null
  durationMinutes: number
  price: number
  isActive: boolean
  showcase: boolean
  imageMediaId: string | null
  imageStatus: string | null
  imageVariants: ImageVariant[]
  createdAt: string
}

export type EligibleStaff = {
  userId: string
  fullName: string
  avatarUrl: string | null
  phoneNumber: string | null
}

// ─────────────────────────────────────────────────────────────
//  Availability
// ─────────────────────────────────────────────────────────────

export type SlotStatus = 'available' | 'booked' | 'off_duty' | 'past'

export type AvailabilityStaffRef = {
  staffUserId: string
  staffName: string
  avatarUrl: string | null
}

export type AvailabilitySlot = {
  startAtUtc: string
  endAtUtc: string
  staffUserId: string | null
  staffName: string
  serviceIds: string[]
  status: SlotStatus | string
  isAvailable: boolean
  /** Business-local date, `yyyy-MM-dd`. */
  localDate: string
  /** Business-local start time, `HH:mm`. */
  localTime: string
  /** `morning` | `afternoon` | `evening`, business-local. */
  dayPart: string
  /** Other staff free at this exact time — enables an instant swap. */
  alternativeStaff: AvailabilityStaffRef[]
}

export type StaffAvailabilitySuggestion = AvailabilityStaffRef & {
  availableSlotCount: number
  nextAvailableUtc: string | null
  nextAvailableLocalTime: string | null
}

export type DayAvailability = {
  date: string
  weekday: string
  dayOfMonth: number
  isOpen: boolean
  totalSlots: number
  availableSlots: number
  firstAvailableUtc: string | null
  slots: AvailabilitySlot[]
  suggestions: StaffAvailabilitySuggestion[]
}

export type AvailabilityCalendar = {
  businessId: string
  businessName: string
  timeZoneId: string
  serviceIds: string[]
  totalDurationMinutes: number
  slotIntervalMinutes: number
  leadTimeMinutes: number
  staffUserId: string | null
  staffName: string | null
  days: DayAvailability[]
  noticeCode: string | null
  notice: string | null
}

// ─────────────────────────────────────────────────────────────
//  Appointments
// ─────────────────────────────────────────────────────────────

export type AppointmentServiceSnapshot = {
  serviceCatalogItemId: string
  name: string
  durationMinutes: number
  price: number
  sortOrder: number
}

export type Appointment = {
  id: string
  businessId: string
  customerId: string
  staffUserId: string | null
  scheduledAt: string
  endAt: string
  status: string
  services: AppointmentServiceSnapshot[]
  createdAt: string
  updatedAt: string
  pendingReschedule: {
    id: string
    proposedScheduledAt: string
    proposedEndAt: string
    proposedStaffUserId: string | null
    proposedServices: AppointmentServiceSnapshot[]
    requestedAt: string
  } | null
  reminderOptOut: boolean
}

export type CreateAppointmentRequest = {
  businessId: string
  serviceIds: string[]
  staffUserId?: string | null
  scheduledAt: string
  note?: string | null
}

/** POST /v1/appointments/{id}/cancel and the owner/staff cancel routes. */
export type CancelAppointmentRequest = {
  note?: string | null
}

/** Customer and owner reschedule routes. Only `scheduledAt` is required. */
export type RescheduleAppointmentRequest = {
  scheduledAt: string
  serviceIds?: string[] | null
  staffUserId?: string | null
  note?: string | null
}

// ─────────────────────────────────────────────────────────────
//  Owner / staff console
// ─────────────────────────────────────────────────────────────

export type AppointmentDashboardItem = {
  id: string
  businessId: string
  scheduledAt: string
  endAt: string
  status: string
  serviceId: string
  serviceName: string
  customerId: string
  customerName: string
  customerEmail: string | null
  customerPhone: string | null
  staffUserId: string | null
  staffName: string | null
  staffEmail: string | null
  createdAt: string
  updatedAt: string
}

export type CustomerDashboardItem = {
  userId: string
  fullName: string
  email: string
  phoneNumber: string | null
  enrolledAt: string
  status: string
  totalStamps: number
  lastStampAt: string | null
}

export type StaffDashboardItem = {
  userId: string
  fullName: string
  email: string
  avatarUrl: string | null
  phoneNumber: string | null
}

export type ServiceDashboardItem = {
  id: string
  name: string
  description: string | null
  durationMinutes: number
  price: number
  isActive: boolean
  showcase: boolean
}

export type AppointmentDashboard = {
  meta: PaginationMeta
  appointments: AppointmentDashboardItem[]
  customers: CustomerDashboardItem[]
  staff: StaffDashboardItem[]
  services: ServiceDashboardItem[]
}

// ─────────────────────────────────────────────────────────────
//  Staff (owner view)
// ─────────────────────────────────────────────────────────────

export type StaffMember = {
  userId: string
  fullName: string
  email: string
  avatarUrl: string | null
  stampsIssued: number
  dailyGoalOverride: number | null
  dailyGoal: number | null
  dailyGoalType: string
  appointmentDailyGoalOverride: number | null
  appointmentDailyGoal: number | null
  appointmentsToday: number
  stampsToday?: number
  lastActiveAt?: string | null
  status?: string
}

export type StaffListResponse = {
  items: StaffMember[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type StaffOverview = {
  totalStaff: number
  activeStaff7d: number
  inactiveStaff: number
  pendingInvitations: number
  stampsToday: number
  stampsThisWeek: number
  goalsMetToday: number
  staffWithGoals: number
  topPerformers: StaffMember[]
  needsAttention: StaffMember[]
  recentlyActive: StaffMember[]
}

// ─────────────────────────────────────────────────────────────
//  Customers (owner view)
// ─────────────────────────────────────────────────────────────

export type BusinessCustomer = {
  userId: string
  fullName: string
  email: string
  phoneNumber: string | null
  dateOfBirth: string | null
  gender: string | null
  avatarUrl: string | null
  cardId: string | null
  enrollmentStatus: string
  totalStamps: number
  lifetimeStamps: number
  totalRedemptions: number
  enrolledAt: string
}

export type CustomerOverview = {
  totalCustomers: number
  active7d: number
  rewardReady: number
  newThisWeek: number
  atRisk: number
  stampsThisWeek: number
  topCustomers: BusinessCustomer[]
  soonToReward: BusinessCustomer[]
}

// ─────────────────────────────────────────────────────────────
//  Dashboard bootstrap (owner/staff shell)
// ─────────────────────────────────────────────────────────────

export type DashboardBusiness = {
  id: string
  name: string
  category: string | null
  location: string | null
  description: string | null
  logoUrl: string | null
  phoneNumber: string | null
  email: string | null
  slug: string
  hasLoyaltyProgram: boolean
  hasReferralProgram: boolean
}

export type CallerPlanInfo = {
  key: string
  name: string
  status: string
  endsAt: string | null
}

export type DashboardBootstrap = {
  business: DashboardBusiness
  /** Effective module keys (plan + purchases + trials + overrides). */
  entitlements: string[]
  permissions: string[]
  plan: CallerPlanInfo | null
  navigation: {
    tabs: string[]
    enabledModules: string[]
    permissions: string[]
  }
  settings: {
    reminderPolicyEnabled: boolean
    reminderOffsetMinutes: number[] | null
    reminderChannels: string[] | null
  }
}

// ─────────────────────────────────────────────────────────────
//  Service writes (owner)
// ─────────────────────────────────────────────────────────────

export type CreateServiceRequest = {
  name: string
  description?: string | null
  durationMinutes: number
  price: number
  showcase?: boolean
}

export type UpdateServiceRequest = Partial<CreateServiceRequest> & {
  isActive?: boolean
}

export type StaffInvitation = {
  id: string
  businessId: string
  email: string
  /** Server-side enum value; use `statusLabel` for display. */
  status: number
  statusLabel: string
  createdAt: string
  expiresAt: string
  acceptedAt: string | null
  revokedAt: string | null
  resendCount: number
  isExpired: boolean
}

export type UpdateBusinessRequest = {
  name?: string
  category?: string | null
  location?: string | null
  phoneNumber?: string | null
  email?: string | null
  description?: string | null
  logoUrl?: string | null
  mpesaNumber?: string | null
}

// ─────────────────────────────────────────────────────────────
//  Admin
// ─────────────────────────────────────────────────────────────

export type AdminDashboard = {
  totalCustomers: number
  totalBusinesses: number
  totalStaff: number
  totalStamps: number
  totalRedemptions: number
  totalCards: number
  totalReferrals: number
  newCustomersToday: number
  newBusinessesToday: number
  stampsToday: number
  redemptionsToday: number
  newCustomers7d: number
  newBusinesses7d: number
  stamps7d: number
  redemptions7d: number
  churnedBusinesses: number
}

// ─────────────────────────────────────────────────────────────
//  Owner dashboard stats (analytics module)
// ─────────────────────────────────────────────────────────────

export type StaffMini = {
  userId: string
  fullName: string
  avatarUrl: string | null
}

export type BusinessDashboard = {
  businessId: string
  businessName: string
  activeCards: number
  totalStampsIssued: number
  stampsToday: number
  totalRedemptions: number
  rewardReadyCards: number
  staffMini: StaffMini[]
}

// ─────────────────────────────────────────────────────────────
//  Business provisioning (owner onboarding)
// ─────────────────────────────────────────────────────────────

export type CreateBusinessRequest = {
  name: string
  category: string
  location: string
  phoneNumber?: string | null
  email?: string | null
  description?: string | null
  logoUrl?: string | null
  mpesaNumber?: string
}

/** `GET/POST /v1/businesses` — the owner's persisted business record. */
export type BusinessResponse = {
  id: string
  slug: string | null
  name: string
  category: string
  location: string
  phoneNumber: string | null
  email: string | null
  description: string | null
  logoUrl: string | null
  logoMediaId: string | null
  coverMediaId: string | null
  galleryMediaIds: string[]
  ownerId: string | null
  hasReferralProgram: boolean
  createdAt: string
}

// ─────────────────────────────────────────────────────────────
//  Staff console
// ─────────────────────────────────────────────────────────────

export type StaffBusiness = {
  businessId: string
  businessName: string
}

export type StaffAnalytics = {
  businessId: string
  businessName: string
  staffName: string
  stampsToday: number
  stampsThisWeek: number
  stampsThisMonth: number
  totalStamps: number
  totalCustomers: number
  rewardReadyCount: number
  dailyGoal: number | null
  dailyGoalType: string
  appointmentDailyGoal: number | null
  appointmentsToday: number
  recentActivity: {
    activityId: string | null
    activityType: string
    customerName: string
    customerId: string | null
    stampNumber: number
    status: string | null
    rewardValue: number | null
    stampedAt: string
  }[]
}

// ─────────────────────────────────────────────────────────────
//  Staff invitations
// ─────────────────────────────────────────────────────────────

export type StaffInvitationValidation = {
  valid: boolean
  businessId: string
  businessName: string
  businessLogoUrl: string | null
  email: string
  expiresAt: string
  errorCode: string | null
  errorMessage: string | null
}

export type AcceptStaffInvitationRequest = {
  fullName: string
  password: string
  emailConfirmation: string
}

// ─────────────────────────────────────────────────────────────
//  Platform administration
// ─────────────────────────────────────────────────────────────

export type AdminBusinessSummary = {
  id: string
  name: string
  category: string
  location: string
  ownerName: string
  ownerEmail: string
  totalCustomers: number
  totalStamps: number
  totalRedemptions: number
  totalStaff: number
  programCount: number
  slug: string | null
}

export type AdminUserSummary = {
  id: string
  email: string
  fullName: string
  phoneNumber: string | null
  avatarUrl: string | null
  dateOfBirth: string | null
  gender: string | null
  role: UserRole
  isVerified: boolean
  createdAt: string
}

export type AdminGrowthPoint = {
  date: string
  newCustomers: number
  newBusinesses: number
  stamps: number
  redemptions: number
}

